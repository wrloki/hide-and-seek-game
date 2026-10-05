/**
 * 小程序入口文件（app.js）
 *
 * 微信会在启动时先执行这里。
 * 注意：这里绝对不要自动调用定位接口，否则违反隐私规范。
 */
App({
  /**
   * 全局数据：所有页面都能通过 getApp().globalData 读取
   */
  globalData: {
    // 玩家自己起的昵称
    nickname: '',
    // 服务器分配的玩家 id
    playerId: '',
    // 当前房间号，例如 "4821"
    roomId: '',
    // 是否是房主（创建房间的人可以点“开始游戏”）
    isHost: false
  },

  onLaunch: function () {
    console.log('GPS躲猫猫小程序启动。定位必须由用户点按钮后才会申请。');
  }
});
