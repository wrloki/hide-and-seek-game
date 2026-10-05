/**
 * 躲猫猫游戏服务器
 *
 * 作用可以想成“对讲机中转站”：
 * 1. 帮大家创建/加入同一个房间
 * 2. 不停收集每个人的 GPS（只放在内存里，不写文件、不入库）
 * 3. 把所有人的位置广播回去
 * 4. 计算距离，判定抓住
 *
 * 小区户外：朋友用各自流量，请再开一个窗口运行 cpolar http 8080，
 * 把生成的 https 地址改成 wss:// 填进小程序 config.js。
 * 电脑关机、休眠，或关掉 Node / cpolar，整场游戏都会停。
 *
 * 启动方法（在 server 文件夹里）：
 *   npm install
 *   npm start
 *
 * 隐私：游戏结束后应清空玩家 GPS；房间没人或进程退出后内存数据即消失，不永久存储。
 */
var http = require('http');
var os = require('os');
var { WebSocketServer } = require('ws');

var PORT = 8080;
// 小区楼房遮挡会造成 GPS 定位漂移，推荐改成 10，而不是 8，提升游玩容错
// （须与小程序 utils/config.js 的 CATCH_DISTANCE_METERS 保持一致）
var CATCH_DISTANCE = 10;
var COUNTDOWN_SECONDS = 10;
var GAME_DURATION_SECONDS = 600;

/** 房间表：房间号 -> 房间对象 */
var rooms = {};
var nextPlayerSeq = 1;

function distanceMeters(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return Infinity;
  }
  var R = 6371000;
  var toRad = function (d) {
    return (d * Math.PI) / 180;
  };
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function lanIPv4List() {
  var nets = os.networkInterfaces();
  var list = [];
  Object.keys(nets).forEach(function (name) {
    (nets[name] || []).forEach(function (net) {
      if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
        list.push(net.address);
      }
    });
  });
  return list;
}

function randomRoomId() {
  var id;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms[id]);
  return id;
}

function send(ws, obj) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
}

function publicPlayer(p) {
  return {
    id: p.id,
    nickname: p.nickname,
    isHost: p.isHost,
    role: p.role,
    latitude: p.latitude,
    longitude: p.longitude,
    caught: p.caught
  };
}

function snapshot(room) {
  return {
    type: room.phase === 'waiting' ? 'room_state' : 'game_state',
    roomId: room.id,
    phase: room.phase,
    countdown: room.countdown,
    remain: room.remain,
    players: room.players.map(publicPlayer)
  };
}

function broadcast(room, extra) {
  var payload = Object.assign(snapshot(room), extra || {});
  room.players.forEach(function (p) {
    send(p.ws, payload);
  });
}

function getRoomByWs(ws) {
  return rooms[ws.roomId] || null;
}

function findPlayer(room, playerId) {
  for (var i = 0; i < room.players.length; i++) {
    if (room.players[i].id === playerId) return room.players[i];
  }
  return null;
}

function clearTimer(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function assignRoles(room) {
  var n = room.players.length;
  var catCount = n >= 5 ? 2 : 1;
  var indexes = room.players.map(function (_, i) {
    return i;
  });
  // 洗牌后前几个当猫
  indexes.sort(function () {
    return Math.random() - 0.5;
  });
  room.players.forEach(function (p) {
    p.role = 'mouse';
    p.caught = false;
  });
  for (var i = 0; i < catCount; i++) {
    room.players[indexes[i]].role = 'cat';
  }
}

function maybeCatch(room) {
  if (room.phase !== 'playing') return;

  var cats = room.players.filter(function (p) {
    return p.role === 'cat';
  });
  var mice = room.players.filter(function (p) {
    return p.role === 'mouse' && !p.caught;
  });

  mice.forEach(function (mouse) {
    cats.forEach(function (cat) {
      var d = distanceMeters(
        cat.latitude,
        cat.longitude,
        mouse.latitude,
        mouse.longitude
      );
      if (d <= CATCH_DISTANCE) {
        mouse.caught = true;
        room.players.forEach(function (p) {
          send(p.ws, {
            type: 'caught',
            playerId: mouse.id,
            nickname: mouse.nickname,
            distance: Math.round(d * 10) / 10
          });
        });
      }
    });
  });

  var alive = room.players.filter(function (p) {
    return p.role === 'mouse' && !p.caught;
  });
  if (alive.length === 0) {
    endGame(room, 'cat', '所有躲藏者都被抓到了（距离小于 8 米）');
  }
}

function endGame(room, winner, reason) {
  if (room.phase === 'ended') return;
  room.phase = 'ended';
  clearTimer(room);
  // 隐私：一局结束后不再使用定位。坐标从未写入硬盘；房间清空或关闭 Node 后内存即丢弃。
  room.players.forEach(function (p) {
    send(p.ws, {
      type: 'game_over',
      winner: winner,
      reason: reason
    });
  });
  broadcast(room);
}

function startGame(room) {
  if (room.phase !== 'waiting') return;
  if (room.players.length < 2) {
    return '至少 2 人才能开始';
  }
  assignRoles(room);
  room.phase = 'countdown';
  room.countdown = COUNTDOWN_SECONDS;
  room.remain = GAME_DURATION_SECONDS;
  clearTimer(room);
  room.players.forEach(function (p) {
    send(p.ws, { type: 'game_started' });
  });
  broadcast(room);

  room.timer = setInterval(function () {
    if (room.phase === 'countdown') {
      room.countdown -= 1;
      if (room.countdown <= 0) {
        room.phase = 'playing';
      }
      broadcast(room);
      return;
    }
    if (room.phase === 'playing') {
      room.remain -= 1;
      maybeCatch(room);
      if (room.phase === 'ended') return;
      if (room.remain <= 0) {
        endGame(room, 'mouse', '时间到，还有躲藏者没有被抓住');
        return;
      }
      broadcast(room);
    }
  }, 1000);
}

function handleMessage(ws, msg) {
  if (!msg || !msg.type) return;

  if (msg.type === 'create_room') {
    var roomId = randomRoomId();
    var player = {
      id: 'p' + nextPlayerSeq++,
      nickname: String(msg.nickname || '玩家').slice(0, 10),
      isHost: true,
      role: '',
      latitude: null,
      longitude: null,
      caught: false,
      ws: ws
    };
    rooms[roomId] = {
      id: roomId,
      phase: 'waiting',
      countdown: COUNTDOWN_SECONDS,
      remain: GAME_DURATION_SECONDS,
      timer: null,
      players: [player]
    };
    ws.roomId = roomId;
    ws.playerId = player.id;
    send(ws, {
      type: 'room_joined',
      roomId: roomId,
      playerId: player.id,
      isHost: true
    });
    broadcast(rooms[roomId]);
    return;
  }

  if (msg.type === 'join_room') {
    var joinId = String(msg.roomId || '');
    var room = rooms[joinId];
    if (!room) {
      send(ws, { type: 'error', message: '房间不存在' });
      return;
    }
    if (room.phase !== 'waiting') {
      send(ws, { type: 'error', message: '这局已经开始了' });
      return;
    }
    var guest = {
      id: 'p' + nextPlayerSeq++,
      nickname: String(msg.nickname || '玩家').slice(0, 10),
      isHost: false,
      role: '',
      latitude: null,
      longitude: null,
      caught: false,
      ws: ws
    };
    room.players.push(guest);
    ws.roomId = joinId;
    ws.playerId = guest.id;
    send(ws, {
      type: 'room_joined',
      roomId: joinId,
      playerId: guest.id,
      isHost: false
    });
    broadcast(room);
    return;
  }

  var current = getRoomByWs(ws);
  if (!current) {
    send(ws, { type: 'error', message: '你还不在房间里' });
    return;
  }
  var me = findPlayer(current, ws.playerId);
  if (!me) return;

  if (msg.type === 'sync_room') {
    send(ws, snapshot(current));
    return;
  }

  if (msg.type === 'start_game') {
    if (!me.isHost) {
      send(ws, { type: 'error', message: '只有房主能开始' });
      return;
    }
    var err = startGame(current);
    if (err) send(ws, { type: 'error', message: err });
    return;
  }

  if (msg.type === 'location') {
    me.latitude = Number(msg.latitude);
    me.longitude = Number(msg.longitude);
    maybeCatch(current);
    broadcast(current);
  }
}

function removePlayer(ws) {
  var room = getRoomByWs(ws);
  if (!room) return;
  room.players = room.players.filter(function (p) {
    return p.id !== ws.playerId;
  });
  if (room.players.length === 0) {
    clearTimer(room);
    delete rooms[room.id];
    return;
  }
  if (!room.players.some(function (p) { return p.isHost; })) {
    room.players[0].isHost = true;
  }
  broadcast(room);
}

var server = http.createServer(function (req, res) {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify(
        {
          ok: true,
          message: '躲猫猫服务器正在运行',
          lanIPs: lanIPv4List(),
          ws: 'ws://<电脑IP>:' + PORT,
          rooms: Object.keys(rooms)
        },
        null,
        2
      )
    );
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

var wss = new WebSocketServer({ server: server });

wss.on('connection', function (ws) {
  ws.on('message', function (raw) {
    var msg;
    try {
      msg = JSON.parse(String(raw));
    } catch (e) {
      send(ws, { type: 'error', message: '消息必须是 JSON' });
      return;
    }
    handleMessage(ws, msg);
  });
  ws.on('close', function () {
    removePlayer(ws);
  });
});

server.listen(PORT, '0.0.0.0', function () {
  var ips = lanIPv4List();
  console.log('');
  console.log('===== GPS躲猫猫服务器已启动 =====');
  console.log('本机模拟器请用: ws://127.0.0.1:' + PORT);
  ips.forEach(function (ip) {
    console.log('手机请用局域网: ws://' + ip + ':' + PORT);
    console.log('浏览器检查:     http://' + ip + ':' + PORT);
  });
  console.log('把上面的 ws 地址粘贴到 miniprogram/utils/config.js 的 SERVER_WS_URL');
  console.log('================================');
});
