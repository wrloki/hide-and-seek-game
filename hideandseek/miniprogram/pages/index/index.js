/**
 * 首页逻辑
 * 创建/加入房间前先连服务器，成功后再跳转到大厅页
 */
var socket = require('../../utils/socket.js');

Page({
  data: {
    nickname: '',
    roomCode: ''
  },

  onNickname: function (e) {
    this.setData({ nickname: e.detail.value });
  },

  onRoomCode: function (e) {
    this.setData({ roomCode: e.detail.value });
  },

  /** 第一步：不需要联网，先练定位 */
  goDemo: function () {
    wx.navigateTo({ url: '/pages/demo/demo' });
  },

  createRoom: function () {
    var nickname = this.ensureNickname();
    if (!nickname) return;
    this.connectThen(function () {
      socket.send({ type: 'create_room', nickname: nickname });
    });
  },

  joinRoom: function () {
    var nickname = this.ensureNickname();
    if (!nickname) return;
    var roomId = (this.data.roomCode || '').trim();
    if (roomId.length !== 4) {
      wx.showToast({ title: '请输入4位房间号', icon: 'none' });
      return;
    }
    this.connectThen(function () {
      socket.send({ type: 'join_room', roomId: roomId, nickname: nickname });
    });
  },

  ensureNickname: function () {
    var nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '先写一个昵称', icon: 'none' });
      return '';
    }
    getApp().globalData.nickname = nickname;
    return nickname;
  },

  connectThen: function (afterOpen) {
    var that = this;
    wx.showLoading({ title: '连接服务器...' });
    socket.connect(
      function () {
        wx.hideLoading();
        afterOpen();
      },
      function (msg) {
        that.onServerMessage(msg);
      },
      function () {
        wx.hideLoading();
      }
    );
  },

  onServerMessage: function (msg) {
    var app = getApp();
    if (msg.type === 'error') {
      wx.showToast({ title: msg.message || '出错了', icon: 'none' });
      return;
    }
    if (msg.type === 'room_joined') {
      app.globalData.playerId = msg.playerId;
      app.globalData.roomId = msg.roomId;
      app.globalData.isHost = !!msg.isHost;
      wx.navigateTo({ url: '/pages/lobby/lobby' });
    }
  }
});
