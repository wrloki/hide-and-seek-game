/**
 * WebSocket 小封装
 *
 * 所有房间、位置同步都走这一个连接。
 * 注意：wx.onSocketOpen 会重复绑定，所以这里只绑定一次。
 */
var config = require('../utils/config.js');
console.log("打印config全部内容：",config); //新增这一行，用来调试
var socketOpen = false;
var eventsBound = false;
var messageHandler = null;
var openHandler = null;
var closeHandler = null;

function bindEventsOnce() {
  if (eventsBound) return;
  eventsBound = true;
  wx.onSocketOpen(function () {
    socketOpen = true;
    if (openHandler) openHandler();
  });
  wx.onSocketMessage(function (res) {
    var data = {};
    try {
      data = JSON.parse(res.data);
    } catch (e) {
      console.warn('服务器发来的不是 JSON', res.data);
      return;
    }
    if (messageHandler) messageHandler(data);
  });
  wx.onSocketClose(function () {
    socketOpen = false;
    if (closeHandler) closeHandler();
  });
  wx.onSocketError(function () {
    socketOpen = false;
    wx.showToast({ title: 'WebSocket 出错', icon: 'none' });
  });
}

function onMessage(handler) {
  messageHandler = handler;
}

function connect(onOpen, onMessageCb, onClose) {
  bindEventsOnce();
  openHandler = onOpen;
  closeHandler = onClose;
  if (onMessageCb) messageHandler = onMessageCb;
  if (socketOpen) {
    if (onOpen) onOpen();
    return;
  }
  // 已修正：SERVER_WS，和config.js里面名字保持一致
  wx.connectSocket({
    url: config.SERVER_WS,
    success: function () {
      console.log('正在连接服务器', config.SERVER_WS);
    },
    fail: function (err) {
      console.error('连接失败', err);
      wx.showToast({ title: '连不上服务器', icon: 'none' });
    }
  });
}

function send(obj) {
  if (!socketOpen) {
    wx.showToast({ title: '还没连上服务器', icon: 'none' });
    return;
  }
  wx.sendSocketMessage({
    data: JSON.stringify(obj)
  });
}

function close() {
  socketOpen = false;
  messageHandler = null;
  wx.closeSocket({
    complete: function () {}
  });
}

function isOpen() {
  return socketOpen;
}

module.exports = {
  connect: connect,
  onMessage: onMessage,
  send: send,
  close: close,
  isOpen: isOpen
};
