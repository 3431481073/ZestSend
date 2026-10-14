# ZestSend · INPUT-SLOT（我从哪拿）

> 判据：消费者能不能【不读你源码】就从本文件知道我从哪个池子拿什么？
> 说明：本项目运行在 Cloudflare Worker + 浏览器里，**不读 `D:\MyProject` 内任何项目的池子**；下方都是外部服务或外部深链，项目外的锚点按原样写。

## 我从哪拿

| 锚点 | 拿什么 |
| --- | --- |
| https://rtc.live.cloudflare.com/v1/turn/keys/<keyId>/credentials/generate-ice-servers | TURN 中继凭证（ICE servers JSON） |
| stun:stun.l.google.com:19302 | 直连用 `srflx` 候选（另有 8 个同类公共 STUN） |
| https://<host>/<locale>/room/<roomId>?auto=1 | 唤起深链：房间号 `roomId`、参数 `auto` |
| window.insightflare | 页面注入的匿名事件上报接口 |
| https://ipapi.co/<ip>/json/ | （已废弃）IP 归属信息，无引用 |

## 详情

### TURN 凭证 —— `rtc.live.cloudflare.com`
- **字段**：ICE servers JSON，含 `urls`、`username`、`credential`。
- **怎么取**：由 Worker `POST /api/turn/credentials` 代理请求（`Authorization: Bearer <token>`，body `{ttl}`）。
- **假设**：Worker Secrets `TURN_ID` / `TURN_TOKEN` 已设且**无尾随空白**（Worker 会 `trim()`）；`ttl` 在 `[60, 86400]` 内。
- **失效模式**：缺失 → `/api/turn/credentials` 返回 500 `TURN credentials are not configured.`；接口失败 → 透传其状态码。均为**非阻塞**：仍走 STUN 直连。

### 公共 STUN —— `stun:*`
- 共 9 个：Google ×5（`stun.l.google.com:19302` … `stun4.l.google.com:19302`）、Nextcloud（`stun.nextcloud.com:443`）、Antisip（`stun.antisip.com:3478`）、FreeSWITCH（`stun.freeswitch.org:3478`）、Metered（`stun.relay.metered.ca:80`）。
- **拿什么**：`srflx` 候选。
- **拿来干嘛**：探测延迟、选最快 3 家用于直连。
- **假设**：网络放行 STUN（UDP/TCP 3478、443 等）。
- **失效模式**：单个不可达 → 诊断里标 `error`，自动换下一个，不中断连接。

### 唤起深链 —— `?auto=1`
- **字段**：URL 路径里的 `roomId`，查询参数 `auto`。
- **拿来干嘛**：`roomId` 作为信令房间名建立 P2P 连接；`auto=1` 时自动接收文件并全屏播放，用户零操作。
- **假设**：`roomId` 必须匹配 `^(?:\d{4}\|rec_[0-9a-f]{32})$`；`auto` 语义值等价于 `1`，但 TanStack Router 的 `parseSearch` 会把 `?auto=1` 解析成**数字 1** 而非字符串。
- **失效模式**：`roomId` 不合法 → Worker 返回 `400 {"message":"Invalid room ID."}`；`auto` 归一失败 → 退回手动点「接收」，不会自动播放（不报错）。

### 页面注入脚本 —— `window.insightflare`
- **字段**：全局 `window.insightflare.track / trackOnce`。
- **拿来干嘛**：上报匿名事件（`room_join_requested`、`p2p_session_connected`、`workspace_opened` 等）。
- **假设**：仅**非 DEV 构建**且确有注入。
- **失效模式**：无注入 → 事件进队列；队列满 40 条后静默丢弃，不影响功能。

### 已废弃 —— `ipapi.co`
- 历史遗留的 `getIPInfo`，**全仓库无引用**，运行时不触发，无影响。

## 最关键的跨项目假设

- **房间号是共享命名空间**：任何项目只要构造同样的 `roomId`（四位数字，或 `rec_` + 32 位小写 hex），就能与 ZestSend 的同一房间配对。这是本项目唯一对外的「输入契约」。
- 信令消息上限 `MAX_MESSAGE_BYTES = 128 KiB`；超过会以 close code `4_011` 断开。
