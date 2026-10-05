/**
 * 房间大厅：等待队友、房主点开始
 */
var socket = require('../../utils/socket.js');

Page({
  data: {
    roomId: '',
    isHost: false,
    myId: '',
    players: []
  },

  onLoad: function () {
    var app = getApp();
    this.setData({
      roomId: app.globalData.roomId,
      isHost: app.globalData.isHost,
      myId: app.globalData.playerId
    });

    var that = this;
    // 重新绑定消息回调（从首页跳过来后仍用同一个 socket）
    socket.connect(
      function () {},
      function (msg) {
        that.onServerMessage(msg);
      },
      function () {
        wx.showToast({ title: '与服务器断开', icon: 'none' });
      }
    );

    // 如果已经连着，再要一次最新房间状态
    if (socket.isOpen()) {
      socket.send({ type: 'sync_room' });
    }
  },

  startGame: function () {
    if (this.data.players.length < 2) {
      wx.showToast({ title: '至少 2 人才能开始', icon: 'none' });
      return;
    }
    socket.send({ type: 'start_game' });
  },

  onServerMessage: function (msg) {
    if (msg.type === 'error') {
      wx.showToast({ title: msg.message || '出错了', icon: 'none' });
      return;
    }
    if (msg.type === 'room_state') {
      this.setData({ players: msg.players || [] });
    }
    if (msg.type === 'game_started') {
      wx.redirectTo({ url: '/pages/game/game' });
    }
  }
});
