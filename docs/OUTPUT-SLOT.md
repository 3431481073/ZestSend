# ZestSend · OUTPUT-SLOT（我往外给）

> 判据：消费者能不能【不读你源码】就从本文件知道我能给什么？
> 说明：本项目**不落盘、不建库、不写业务文件**给别的项目读；对外产出是本地开发服务端口、配置声明与文档。

## 我往外给

| 锚点 | 是什么 |
| --- | --- |
| 127.0.0.1:8787 | 本地开发服务：信令 WebSocket、TURN 凭证代理、SPA 路由与语言 Cookie |
| D:\MyProject\ZestSend\services.yaml | 常驻服务声明（`services: []`，无常驻进程） |
| D:\MyProject\ZestSend\docs\ | 对外文档接口（README / run / data / deps / service / runtime-log / 三份槽） |

## 详情

### 本地开发服务 —— `127.0.0.1:8787`
- 仅在 `pnpm dev` / `pnpm dev:worker` 等运行时监听；生产由 Cloudflare 暴露同名 HTTPS / WSS，锚点非本机端口，故不列入上方机器表。
- **信令 WebSocket**：`GET /api/rooms/:roomId/ws`（`ws://` / `wss://`）。JSON 文本消息，单条上限 128 KiB，超限 close `4_011`；非 WebSocket 升级返回 426。`roomId` 须匹配 `^(?:\d{4}\|rec_[0-9a-f]{32})$`。
  - 客户端 → 服务端：`hello`（`mode: new | resume-signaling | restart-peer`，可带 `resumeToken`）、`ping`、`signal`（`payload.description` / `payload.candidate`）、`leave`。
  - 服务端 → 客户端：`welcome`（`slotId`、`peerSessionId`、`resumeToken`、`epoch`、`offererSlotId`、`isInitiator`、`peerCount`、`resumed`）、`peer-ready`、`negotiate`、`peer-disconnected`、`peer-reconnected`、`peer-left`、`signal`、`replaced`、`pong`、`error`（`code` ∈ `room-full` / `room-reserved` / `resume-invalid` 等，`room-reserved` 带 `retryAfterMs`）。
  - 约定：`epoch` 单调递增，客户端须丢弃小于当前 epoch 的信号；断线座位保留 30s 租约（`DISCONNECTED_LEASE_MS`），期间新人加入收到 `room-reserved` 而非 `room-full`。
- **TURN 凭证代理**：`POST /api/turn/credentials`，返回 `{ "iceServers": [ { "urls": [...], "username": "...", "credential": "..." } ] }`；失败为 `{ "error", "message" }`。可选 body `{"ttl": <秒>}`（夹取 60–86400，默认 86400）；其它方法 405。
- **页面路由 / SPA**：`/`、`/en`、`/zh`、`/room/:roomId`、`/:locale/room/:roomId`；`/` 与 `/room/:roomId` 为 307 语言跳转。
- **语言 Cookie**：`Set-Cookie: zestsend_locale=<en\|zh>; Path=/; Max-Age=31536000; SameSite=Lax`；响应 `Vary: Cookie, Accept-Language`。

### 常驻服务声明 —— `services.yaml`
- YAML，顶层 `services:` 数组。每项字段：`name` · `command` · `args` · `cwd` · `host` · `port` · `health` · `manager` · `logs` 等；没有常驻服务就写 `services: []` + 一句理由。本项目即 `services: []`。

### 内部状态（非池子）
- Durable Object `Room` 存储键 `room-state-v2`（`RoomState` JSON，字段见 `data.md`）：**仅 DO 内部读写，无外部读取入口**，不构成可读池子。

## 变更纪律

接口、存储键、端口、路由任一变化 → **当场更新本文件**，与写 `docs/log.md` 同等对待。
