/**
 * 游戏页：地图 + 上传自己的 GPS + 画出房间里所有人
 *
 * 抓捕判定在服务器做，客户端只负责显示结果。
 * 小区楼房遮挡会造成 GPS 定位漂移，推荐判定距离设为 10 米而不是 8 米，提升游玩容错。
 */
var socket = require('../../utils/socket.js');
var location = require('../../utils/location.js');
var config = require('../../utils/config.js');

Page({
  data: {
    roomId: '',
    myId: '',
    myRole: 'mouse',
    latitude: '',
    longitude: '',
    locating: false,
    phase: 'countdown',
    countdown: config.COUNTDOWN_SECONDS,
    remain: config.GAME_DURATION_SECONDS,
    aliveMice: 0,
    markers: [],
    includePoints: [],
    statusText: '点底部按钮开启定位（不会自动定位）',
    showResult: false,
    resultTitle: '',
    resultText: ''
  },

  onLoad: function () {
    var app = getApp();
    this.setData({
      roomId: app.globalData.roomId,
      myId: app.globalData.playerId
    });

    var that = this;
    socket.onMessage(function (msg) {
      that.onServerMessage(msg);
    });
    if (socket.isOpen()) {
      socket.send({ type: 'sync_room' });
    }
  },

  onUnload: function () {
    location.stopWatch();
  },

  onEnableLocation: function () {
    var that = this;
    location.getOnce(
      function (res) {
        that.setData({ locating: true, statusText: '定位成功，持续上传中' });
        that.uploadLocation(res.latitude, res.longitude);
        that.watch();
      },
      function (err) {
        wx.showModal({
          title: '定位失败',
          content: (err && err.errMsg) || '请允许微信使用位置信息',
          showCancel: false
        });
      }
    );
  },

  watch: function () {
    var that = this;
    location.startWatch(function () {
      wx.onLocationChange(function (res) {
        that.uploadLocation(res.latitude, res.longitude);
      });
    });
  },

  uploadLocation: function (lat, lng) {
    this.setData({ latitude: lat, longitude: lng });
    socket.send({
      type: 'location',
      latitude: lat,
      longitude: lng
    });
  },

  onServerMessage: function (msg) {
    if (msg.type === 'error') {
      wx.showToast({ title: msg.message || '出错了', icon: 'none' });
      return;
    }

    if (msg.type === 'room_state' || msg.type === 'game_state') {
      this.applyState(msg);
    }

    if (msg.type === 'caught') {
      var text = msg.nickname + ' 被抓住了！';
      this.setData({ statusText: text });
      wx.showToast({ title: text, icon: 'none' });
    }

    if (msg.type === 'game_over') {
      this.setData({
        showResult: true,
        phase: 'ended',
        resultTitle: msg.winner === 'cat' ? '猫赢了！' : '鼠赢了！',
        resultText: msg.reason || ''
      });
      location.stopWatch();
    }
  },

  applyState: function (msg) {
    var players = msg.players || [];
    var myId = this.data.myId;
    var me = null;
    var i;
    for (i = 0; i < players.length; i++) {
      if (players[i].id === myId) me = players[i];
    }

    var markers = [];
    var points = [];
    var aliveMice = 0;
    for (i = 0; i < players.length; i++) {
      var p = players[i];
      if (p.role === 'mouse' && !p.caught) aliveMice += 1;
      if (p.latitude == null || p.longitude == null) continue;
      points.push({ latitude: p.latitude, longitude: p.longitude });
      markers.push({
        id: i + 1,
        latitude: p.latitude,
        longitude: p.longitude,
        title: p.nickname,
        width: 32,
        height: 32,
        callout: {
          content: this.markerText(p, myId),
          display: 'ALWAYS',
          padding: 6,
          borderRadius: 8,
          fontSize: 12,
          bgColor: p.role === 'cat' ? '#e94560' : '#4cc9f0',
          color: '#ffffff'
        }
      });
    }

    var update = {
      players: players,
      markers: markers,
      includePoints: points,
      aliveMice: aliveMice,
      phase: msg.phase || this.data.phase,
      countdown: msg.countdown != null ? msg.countdown : this.data.countdown,
      remain: msg.remain != null ? msg.remain : this.data.remain
    };
    if (me) update.myRole = me.role || 'mouse';
    this.setData(update);
  },

  markerText: function (p, myId) {
    var who = p.id === myId ? '我' : p.nickname;
    var role = p.role === 'cat' ? '猫' : '鼠';
    if (p.caught) return who + '（已抓住）';
    return who + '·' + role;
  },

  backHome: function () {
    socket.close();
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
