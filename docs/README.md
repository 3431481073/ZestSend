# ZestSend · README（文档指针）

## 这是什么

ZestSend 是一个开源的 WebRTC 点对点连接网页工具，可自行部署在 Cloudflare 上：两位参与者输入相同的四位房间号（或上游下发的 `record_id`）即可建立端对端加密的匿名连接，支持聊天、文件互传、语音 / 视频通话、屏幕共享、同播、文本协作与画板。可点对点直连，也可经 Cloudflare TURN 中转。无账号、无数据记录、服务端不落盘用户内容。

## 状态

- **状态**：在用（开源可自部署形态，上游仓库 `RavelloH/ZestSend`，预览站 https://send.ravelloh.com）
- **形态**：Web 应用（React SPA）+ Cloudflare Worker（Hono）+ Durable Object 信令房间；可选 Cloudflare Realtime TURN
- **版本**：`package.json` → `0.2.0`
- **端口**：本地开发 `8787`（无监听端口的生产常驻服务，见 `service.md`）

## 文档地图

| 想知道什么 | 看哪份 |
| --- | --- |
| 怎么装、怎么跑、怎么测、有什么限制 | [`run.md`](./run.md) |
| 数据放在哪、持久化格式、项目外还写了什么 | [`data.md`](./data.md) |
| 依赖清单形态、环境在哪、对外契约 | [`deps.md`](./deps.md) |
| 有没有常驻服务、端口表、外部前置条件 | [`service.md`](./service.md) |
| 变更记录（只追加） | [`log.md`](./log.md) |
| 运行时的行为日志（可关） | [`runtime-log.md`](./runtime-log.md) |
| 我产出什么（给别的项目） | [`OUTPUT-SLOT.md`](./OUTPUT-SLOT.md) |
| 我吃什么（从别的项目） | [`INPUT-SLOT.md`](./INPUT-SLOT.md) |

> 根目录 `README.md` 是 GitHub 面向使用者的说明（部署步骤、截图），本文件是工作区内部文档指针，两者职责不同。

## 项目外还写了什么（删项目前必须知道）

- **Cloudflare Worker `zestsend`**：部署在 Cloudflare 账号下（`wrangler.jsonc` 的 `name`）。删除本地仓库不会删除线上 Worker，需在 Cloudflare Dashboard 手动删除。
- **Durable Object `Room` + 其 SQLite 存储**：随 Worker 一起存在于 Cloudflare，房间清空后 `room-state-v2` 被删除，无长期用户数据。
- **Worker Secrets `TURN_ID` / `TURN_TOKEN`**：存入 Cloudflare Worker 的 Variables and Secrets，仓库内不保存，删文件 ≠ 吊销凭据。
- **Workers 可观测性日志**：Cloudflare 侧开启（`observability.enabled`），保留策略由 Cloudflare 决定。
- 本地无注册表项、无计划任务、无工作区外的文件写入（构建产物只在 `dist/`、`node_modules/`、`.wrangler/`）。
