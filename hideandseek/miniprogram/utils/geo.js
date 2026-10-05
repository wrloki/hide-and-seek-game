/**
 * 地理计算小工具
 *
 * 手机 GPS 给的是“纬度 latitude、经度 longitude”。
 * 两个点之间的直线距离，用 Haversine 公式（把地球当圆球来算）。
 * 微信地图必须用 gcj02 坐标系，所以定位时 type 也要填 gcj02。
 *
 * 小区楼房遮挡会造成 GPS 定位漂移，推荐抓捕判定用 10 米而不是 8 米，提升游玩容错。
 */

/**
 * 把角度换成弧度
 */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * 计算两点距离，单位：米
 * @param {number} lat1 点1纬度
 * @param {number} lng1 点1经度
 * @param {number} lat2 点2纬度
 * @param {number} lng2 点2经度
 */
function distanceMeters(lat1, lng1, lat2, lng2) {
  if (
    lat1 == null ||
    lng1 == null ||
    lat2 == null ||
    lng2 == null
  ) {
    return Infinity;
  }

  var earthRadius = 6371000;
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

module.exports = {
  distanceMeters: distanceMeters
};
