# GPS 躲猫猫（微信原生小程序）

Moonstone 青少年黑客松项目。玩家在 **小区户外** 分成 **猫（抓捕者）** 和 **鼠（躲藏者）**，用手机 GPS 同步位置。

**适用场景：和朋友在小区里用各自的移动流量玩。**  
大家的手机 **不需要** 连接同一个 Wi-Fi，也 **不需要** 连你电脑的热点。电脑开着游戏服务器 + cpolar 内网穿透，手机走 4G/5G 也能进同一个房间。

技术栈：微信原生 **WXML + WXSS + JS**（没有 uni-app，没有 Taro）+ 电脑上的 **Node.js WebSocket 服务器** + **cpolar** 把家里的 8080 端口映射成公网 `wss://` 地址。

开发顺序已经按这个做完：

1. 单人定位 Demo（`pages/demo`）
2. 房间创建/加入（首页 + `pages/lobby`）
3. 多玩家位置同步 + 抓捕判定（服务器）
4. 倒计时 / 进行中 / 胜负弹窗（`pages/game`）

代码里默认抓捕距离仍是 **8 米**。小区楼房遮挡容易让 GPS 飘，**推荐改成 10 米** 提高容错（改法见文末）。

---

## 一、你需要提前准备的账号和软件

1. 微信公众平台：<https://mp.weixin.qq.com/> 注册 **小程序**，记下 **AppID**。
2. 腾讯位置服务：<https://lbs.qq.com/> 注册，用来申请地图 Key。
3. 电脑安装：
   - [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
   - [Node.js](https://nodejs.org/)（安装时勾选 Add to PATH）
   - [cpolar](https://www.cpolar.com/)（内网穿透，见第四节）
4. 一台能一直开着的电脑（房主家里或带到小区都可），需要能上网（宽带 / 手机 USB 共享都行）。

---

## 二、用微信开发者工具打开本项目

1. 打开 **微信开发者工具** → 选 **小程序** → **导入项目**。
2. 目录选：`C:\Users\wr201\Desktop\hideandseek`（就是本文件夹）。
3. AppID：真机给朋友扫码玩，必须填你自己的小程序 AppID。把 `project.config.json` 里的 `"touristappid"` 换成真实 AppID。
4. 项目配置里已经写了 `miniprogramRoot` 为 `miniprogram/`，不要选成 `server` 文件夹。
5. 详情 → 本地设置 → 勾选：
   - **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
   - 开发、真机调试阶段可以先这样测；朋友扫「预览/体验版」二维码时，仍建议把 cpolar 域名配进公众平台（见第四节第 6 步）。

编译成功后，首页能看到「单人定位练习 / 创建房间」。

---

## 三、配置腾讯地图 Key（必做，否则地址解析失败）

小程序里的 `<map>` 组件本身就会显示腾讯地图。  
`utils/tencentMap.js` 还会调用腾讯的 **逆地理编码**，把经纬度变成中文地址。

1. 打开 <https://lbs.qq.com/dev/console/application/mine>，创建应用。
2. 添加 Key：
   - Key 名称随便，例如 `hideandseek`。
   - **Key 类型选「微信小程序」**（不要选 Web 或 Android）。
   - 微信小程序 AppID 填你在公众平台拿到的那个。
3. 复制 Key，打开 `miniprogram/utils/config.js`，把 `TENCENT_MAP_KEY` 换成你的 Key。
4. 公众平台 → 开发 → 开发管理 → 开发设置 → **服务器域名**：
   - request 合法域名加上：`https://apis.map.qq.com`
   - socket 合法域名加上你的 cpolar 地址（第四节会拿到），例如 `wss://xxxxx.cpolar.cn`

地图配额不够或 Key 类型选错时，定位坐标仍在，只是中文地址会提示失败。

---

## 四、小区户外联机：cpolar 完整教程（推荐，大家用流量）

朋友的手机用的是 **各自的移动流量**，连不上你家 Wi-Fi。  
所以不要填 `ws://192.168.x.x:8080`（那是局域网地址，流量网访问不到）。  
要用 cpolar 生成的 **公网 `wss://` 地址**。

### 4.1 下载安装 cpolar

1. 打开官网：<https://www.cpolar.com/> ，注册一个账号（免费版即可，业余临时玩够用）。
2. 进入控制台 → 下载 **Windows 版本** 客户端，安装到这台当服务器的电脑上。
3. 安装完成后打开 cpolar，用刚才的账号 **登录**（未登录时没有稳定的隧道信息）。
4. 也可以在安装目录里用命令行。把 cpolar 加到系统 PATH 更方便；若提示找不到命令，请用「以管理员运行」的 PowerShell，先 `cd` 到 cpolar 安装目录。

### 4.2 先启动游戏服务器，再开穿透

**窗口 A（必须一直开着）**，启动 Node 服务：

```powershell
cd C:\Users\wr201\Desktop\hideandseek\server
npm install
npm start
```

看到「GPS躲猫猫服务器已启动」就对了。不要关这个窗口。

**窗口 B（也必须一直开着）**，把本机 8080 映射到公网：

```powershell
cpolar http 8080
```

（含义：把访问公网地址的流量，转发到这台电脑的 `http://127.0.0.1:8080`。微信小程序的 WebSocket 会走同一条隧道。）

### 4.3 复制公网地址，改成 wss，填进小程序

cpolar 窗口里会出现类似表格：

```text
Forwarding    https://xxxxxx.cpolar.cn  ->  http://127.0.0.1:8080
```

也可能是 `https://xxxxxx.cpolar.top` 等后缀，以你屏幕上的为准。

小程序不能用 `https://`，要改成 **`wss://`（加密的 WebSocket）**：

| cpolar 显示的 | 填进小程序的 |
| --- | --- |
| `https://xxxxxx.cpolar.cn` | `wss://xxxxxx.cpolar.cn` |
| `http://xxxxxx.cpolar.cn`（若出现） | 不要用 http/ws，请用 https 那一行再改成 wss |

打开 `miniprogram/utils/config.js`，把 `SERVER_WS_URL` **整行替换**，例如：

```js
SERVER_WS_URL: 'wss://xxxxxx.cpolar.cn',
```

注意：

- 不要漏写 `wss://`
- 后面一般 **不用加 `:8080`**（8080 是你电脑本地端口，公网由 cpolar 转发）
- 不要用 `ws://` 填给 iPhone 微信，正式/预览环境经常被拦
- 改完后在微信开发者工具里 **重新编译**，然后生成预览/真机调试给朋友扫

可先用浏览器打开 cpolar 给的 `https://xxxxxx.cpolar.cn`，若看到 `"ok": true` 和 `"躲猫猫服务器正在运行"`，说明穿透已经打到 Node。

### 4.4 运行期间电脑和 cpolar 都不能关（非常重要）

这台电脑就是整场游戏的「基地」：

1. **电脑必须保持开机、不能休眠。** Windows 设置 → 系统 → 电源 → 把睡眠改成「从不」（至少插电时）。合盖睡觉也会断线。
2. **`npm start` 那个窗口不能关。** 关了，房间和位置同步全部停止。
3. **`cpolar http 8080` 那个窗口不能关。** 关了，朋友的流量就访问不到你的电脑。
4. 出门去小区玩：电脑可以留在家（插电 + 不断网），人拿手机下楼；也可以带一台笔记本到小区，用手机热点给 **电脑** 上网（玩家自己仍用各自流量即可）。

**电脑关机、断网、休眠，或关掉 Node / cpolar，游戏服务器立刻停止，所有人会掉线。**

### 4.5 免费 cpolar 的限制（只适合临时业余玩）

- 免费套餐每次重新运行 `cpolar http 8080`，**公网地址都会变**。
- 地址一变，必须重新改 `SERVER_WS_URL`，再编译/再发预览码，朋友才能连上。
- 所以一局开始前先开 cpolar、填好地址、确认能进房间，中途不要重启 cpolar。
- 免费版可能有流量、连接数、带宽限制，人少在小区玩一般够用。
- **只适合临时业余游玩，不商用。** 若要固定域名，需看 cpolar 付费套餐或自己的备案服务器，本项目不涉及商用部署。

### 4.6 苹果 / 华为微信怎么进游戏

| 方式 | 适合谁 | 注意 |
| --- | --- | --- |
| 开发者工具 **真机调试** | 你自己的手机 | 可勾选不校验域名，用来先验证 wss 通不通 |
| **预览** 二维码 | 一起玩的朋友 | 把 `wss://xxxxxx.cpolar.cn` 加到公众平台 **socket 合法域名**；request 加上 `https://apis.map.qq.com` |
| 上传 **体验版** | 固定几个人反复玩 | 同样要配合法域名；cpolar 免费地址变了就要改域名并重新提交 |

华为安卓：系统设置 → 应用 → 微信 → 位置信息 → 允许；电池改为允许后台，避免省电杀掉定位。  
苹果：设置 → 微信 → 位置 → 使用 App 期间 / 始终（按系统提示）。户外打开定位，楼间距过大时 GPS 会飘，见第七节。

---

## 五、仅供本机模拟器：局域网地址（朋友用流量时不要用）

只有你自己在电脑模拟器里调试，才可以用：

```js
SERVER_WS_URL: 'ws://127.0.0.1:8080',
```

朋友手机走移动流量时，`192.168.x.x` **一定连不上**。小区户外请只用第四节的 `wss://`。

---

## 六、隐私：定位数据不永久保存

- 打开小程序 **不会** 自动定位；只有用户点击「开启定位」才申请权限。
- `app.json` 已声明 `permission.scope.userLocation` 和 `requiredPrivateInfos`。
- 上线前在公众平台配置《用户隐私保护指引》，勾选位置信息。
- **本项目不把 GPS 写入硬盘、数据库或日志文件。** 坐标只存在电脑内存里的房间对象中，用来实时算距离。
- **一局游戏结束后应清空所有玩家的 GPS 坐标**，不永久存储定位信息。房间没人时整房会从内存删掉；关闭 Node 进程后内存全部消失。
- 请不要自己把经纬度复制到群聊、截图长期保存。玩完即可关掉服务器窗口。

---

## 七、游戏规则与小区 GPS 漂移

- 创建房间得到 4 位房间号，其他人输入同一号码加入（流量 + cpolar 即可，不必同一 Wi-Fi）。
- 至少 2 人，房主点开始。
- 随机分配：一般 1 只猫；5 人及以上 2 只猫，其余是鼠。
- 开局倒计时 10 秒（这段时间不算抓捕）。
- 进行中：所有人持续上传坐标，服务器同步给全房间。
- 猫和未抓住的鼠距离 ≤ 判定距离 → 该鼠被抓住。
- 老鼠全被抓 → 猫胜；10 分钟到仍有鼠没被抓 → 鼠胜。

**小区楼房、玻璃幕墙、树荫会让 GPS 漂移几米甚至十几米。**  
代码默认 8 米在空旷操场还行，楼间游玩容易「人已经碰到了但系统没判定」或「隔着绿化带误判」。  
**推荐把抓捕判定改成 10 米**，提升容错（仍属业余规则，不是厘米级精准）。

改两处数字（保持一致）：

1. `miniprogram/utils/config.js` 的 `CATCH_DISTANCE_METERS`
2. `server/index.js` 顶部的 `CATCH_DISTANCE`

改完重启 `npm start`（cpolar 窗口不要关；若你重启了 cpolar，地址可能会变，要按第四节再填一次）。

---

## 八、出门前检查清单

1. 电脑插电，睡眠关闭，`npm start` 在跑。
2. `cpolar http 8080` 在跑，复制最新 `https://...` 并改成 `wss://...` 写入 `config.js`。
3. 开发者工具重新编译，预览码发给朋友。
4. 自己先点「单人定位练习」，确认户外能出经纬度。
5. 创建房间，朋友用流量加入同一房间号。
6. 玩的过程中不要关电脑、不要重启 cpolar。

---

## 九、代码地图（方便初中生读）

| 文件 | 干什么 |
| --- | --- |
| `miniprogram/pages/demo/` | 单人地图 + 经纬度 |
| `miniprogram/pages/index/` | 起昵称、开房、输入房间号 |
| `miniprogram/pages/lobby/` | 等人、房主开始 |
| `miniprogram/pages/game/` | 地图、倒计时、胜负弹窗 |
| `miniprogram/utils/config.js` | 地图 Key、**cpolar 的 wss 地址**、抓捕距离 |
| `miniprogram/utils/location.js` | 定位，只在点按钮后调用 |
| `miniprogram/utils/geo.js` | 两点距离公式 |
| `miniprogram/utils/tencentMap.js` | 腾讯地图把坐标变成地址 |
| `miniprogram/utils/socket.js` | 和小程序服务器说话 |
| `server/index.js` | 房间、同步、抓捕判定（坐标只放内存） |
