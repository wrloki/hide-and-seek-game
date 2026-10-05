/**
 * 配置文件（请改这里，不要到处写死地址）
 *
 * 1) TENCENT_MAP_KEY: 腾讯位置服务控制台申请的小程序 Key
 * 2) SERVER_WS URL: 小区户外请填 cpolar 的公网 wss 地址
 *    朋友用各自手机流量，连不上你家 Wi-Fi，不要填 192.168.x.x。
 *    步骤：电脑先 npm start，再执行 cpolar http 8080，
 *    把 https://xxxxxx.cpolar.cn 改成 wss://xxxxxx.cpolar.cn 贴到下面。
 *    免费 cpolar 每次重启地址会变，必须重新粘贴；电脑和 cpolar 窗口都要一直开着。
 * *本机模拟器调试才用: ws://127.0.0.1:8080
 */
module.exports = {
  // TODO:换成你自己的腾讯地图 Key (类型必须选 "微信小程序")
  TENCENT_MAP_KEY: 'YQKBZ-TNMCH-F6ODE-WJ54K-PGHHS-TGFIC',

  // TODO:小区户外: 换成 cpolar 生成的 wss://xxxxxx.cpolar.cn (不要加 :8080)
  SERVER_WS: "ws://172.20.10.2:8080",

  // 抓捕判定距离（米）。小区楼房遮挡会造成 GPS 定位漂移，
  // 推荐改成 10，而不是 8，提升游玩容错（须与 server/index.js 的 CATCH_DISTANCE 保持一致）。
  CATCH_DISTANCE_METERS: 10,

  // 开局倒计时（秒）：给躲藏者找地方
  COUNTDOWN_SECONDS: 10,

  // 整局时长（秒）：时间到还有老鼠没被抓，老鼠获胜
  GAME_DURATION_SECONDS: 600
};
