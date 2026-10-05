/**
 * 腾讯地图相关能力
 *
 * 小程序里的 <map> 组件底层就是腾讯地图，用来画地图、标点。
 * 这里再用腾讯位置服务的 HTTP 接口，把经纬度翻译成中文地址，
 * 方便单人定位 demo 里显示“你现在在哪”。
 *
 * 文档：https://lbs.qq.com/service/webService/webServiceGuide/webServiceGcoder
 */
var config = require('./config');

/**
 * 逆地理编码：经纬度 -> 文字地址
 * 失败时不弹窗，只在回调里返回空字符串，避免打断游戏
 */
function reverseGeocode(latitude, longitude, callback) {
  var key = config.TENCENT_MAP_KEY;
  if (!key || key === 'YOUR_TENCENT_MAP_KEY') {
    callback('还没有填写腾讯地图 Key（见 utils/config.js）');
    return;
  }

  wx.request({
    url: 'https://apis.map.qq.com/ws/geocoder/v1/',
    method: 'GET',
    data: {
      location: latitude + ',' + longitude,
      key: key,
      get_poi: 0
    },
    success: function (res) {
      var data = res.data || {};
      if (data.status === 0 && data.result && data.result.address) {
        callback(data.result.address);
      } else {
        callback('地址解析失败：' + (data.message || '未知错误'));
      }
    },
    fail: function () {
      callback('请求腾讯地图失败，请检查域名白名单和网络');
    }
  });
}

module.exports = {
  reverseGeocode: reverseGeocode
};
