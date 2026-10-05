/**
 * 定位工具
 *
 * 微信隐私规范：
 * - 不能在 app.js / 页面 onLoad 里偷偷定位
 * - 必须用户点了按钮，才调用 getLocation / startLocationUpdate
 * - 定位只用于当场游戏，不永久存储；游戏结束即可停止上传
 *
 * 坐标系：type 必须是 gcj02，才能和 <map> 对得上。
 */

/**
 * 点一次按钮：拿当前坐标（单次）
 */
function getOnce(success, fail) {
  wx.getLocation({
    type: 'gcj02',
    isHighAccuracy: true,
    highAccuracyExpireTime: 4000,
    success: success,
    fail: fail || function () {}
  });
}

/**
 * 点一次按钮：开始持续定位（游戏中用）
 * 之后用 wx.onLocationChange 监听移动
 */
function startWatch(success, fail) {
  wx.startLocationUpdate({
    success: success,
    fail: fail || function () {}
  });
}

function stopWatch() {
  try {
    wx.offLocationChange();
  } catch (e) {}
  wx.stopLocationUpdate({
    complete: function () {}
  });
}

module.exports = {
  getOnce: getOnce,
  startWatch: startWatch,
  stopWatch: stopWatch
};
