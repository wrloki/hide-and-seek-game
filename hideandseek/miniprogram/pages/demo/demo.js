/**
 * 单人定位 Demo
 * 这是开发顺序的第 1 步：不联网，只验证 GPS + 腾讯地图显示
 */
var location = require('../../utils/location.js');
var tencentMap = require('../../utils/tencentMap.js');

Page({
  data: {
    watching: false,
    statusText: '还没有定位。请点上面的红色按钮。',
    latitude: '',
    longitude: '',
    accuracy: '',
    address: '开启定位后会向腾讯地图查询中文地址',
    markers: []
  },

  onUnload: function () {
    this.cleanup();
  },

  /**
   * 唯一会触发定位权限弹窗的地方
   */
  onEnableLocation: function () {
    var that = this;
    this.setData({ statusText: '正在申请定位权限...' });

    // 先单次定位，用户能立刻看到结果
    location.getOnce(
      function (res) {
        that.applyLocation(res);
        that.startWatching();
      },
      function (err) {
        that.setData({
          statusText: '定位失败：' + that.explainError(err)
        });
        wx.showModal({
          title: '需要定位权限',
          content: '请在系统设置或微信权限里允许“位置信息”，然后重新点按钮。',
          showCancel: false
        });
      }
    );
  },

  startWatching: function () {
    var that = this;
    location.startWatch(
      function () {
        that.setData({
          watching: true,
          statusText: '持续定位已开启，你可以走动试一试'
        });
        wx.onLocationChange(function (res) {
          that.applyLocation(res);
        });
      },
      function (err) {
        that.setData({
          statusText: '持续定位没开成，但单次坐标已经有了。' + that.explainError(err)
        });
      }
    );
  },

  applyLocation: function (res) {
    var lat = res.latitude;
    var lng = res.longitude;
    this.setData({
      latitude: lat,
      longitude: lng,
      accuracy: Math.round(res.accuracy || 0),
      markers: [
        {
          id: 1,
          latitude: lat,
          longitude: lng,
          title: '我',
          width: 28,
          height: 28
        }
      ]
    });

    var that = this;
    tencentMap.reverseGeocode(lat, lng, function (address) {
      that.setData({ address: address });
    });
  },

  onStopLocation: function () {
    this.cleanup();
    this.setData({
      watching: false,
      statusText: '已停止定位'
    });
  },

  cleanup: function () {
    location.stopWatch();
  },

  explainError: function (err) {
    var msg = (err && (err.errMsg || err.message)) || '未知原因';
    if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0) {
      return '你拒绝了定位权限';
    }
    if (msg.indexOf('privacy') >= 0) {
      return '未同意隐私协议，或 requiredPrivateInfos 没配置好';
    }
    return msg;
  }
});
