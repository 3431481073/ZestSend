# ZestSend · 数据放在哪 / 持久化格式 / 项目外还写了什么

## 总原则

ZestSend **不存储用户内容**：聊天、文件、媒体流在端对端之间传输，服务端只做信令中转。服务端唯一持久化的是「房间信令状态」，房间清空即删除。

## 服务端（Cloudflare Durable Object）

- 位置：Durable Object `Room`（绑定名 `ROOMS`），按房间名寻址 `env.ROOMS.getByName(roomId)`。
- 存储键：`room-state-v2`（`src/worker/room.ts` 的 `STORAGE_KEY`）。
- 结构（`RoomState`，`version: 2`）：

  | 字段 | 类型 | 含义 |
  | --- | --- | --- |
  | `version` | `2` | 结构版本，非 2 视为空状态 |
  | `epoch` | `number` | 信令世代号，用于丢弃过期信号 |
  | `offererSlotId` | `string \| null` | 谁发起 WebRTC offer |
  | `slots` | `SlotState[]` | 最多 2 个座位（`MAX_PEERS = 2`） |

  `SlotState`：`slotId`、`peerSessionId`、`tokenHash`（恢复令牌的 SHA-256，**不存明文**）、`connectionId`、`disconnectedAt`、`leaseExpiresAt`、`lastSeenAt`。

- 生命周期：房间无人后 `saveState` 删除该键；断线座位有 30s 租约（`DISCONNECTED_LEASE_MS`），过期清除。
- 迁移：`wrangler.jsonc` 声明 `migrations` → `v1: new_sqlite_classes: ["Room"]`，底层为 SQLite 支持的 DO 存储。

## 客户端（浏览器）

| 位置 | 键 / 用途 | 生命周期 |
| --- | --- | --- |
| `sessionStorage` | `zestsend:room:<roomId>:resume` —— 信令恢复令牌（明文，仅本标签页） | 标签页会话 |
| `localStorage` | `zestsend_locale` —— 语言偏好（`en` / `zh`） | 长期 |
| Cookie | `zestsend_locale` —— Worker 下发，`Path=/; Max-Age=1年; SameSite=Lax` | 1 年 |
| OPFS | `navigator.storage.getDirectory()` 根目录下按目标文件名写入**接收到的文件**；拒绝接收时 `removeEntry` 删除 | 由浏览器配额管理，可用 `navigator.storage.persist()` 请求持久化 |
| 内存 | 聊天消息、Yjs 协作文档（`Y.Doc`）、媒体流、传输状态 | 页面关闭即失 |

- 协作（`p2p-collaboration.ts`）明确**无服务端持久化**，Yjs 更新只走 WebRTC data channel。
- 文件接收在 Web Worker（`file-receive.worker.ts`）里按 1MiB 块、64KiB 分段写入 OPFS，块级 SHA-256 校验。
- `src/client/lib/utils.ts` 里有一个 `getIPInfo`（请求 `https://ipapi.co/...`），但**全仓库无引用**，运行时不触发；该文件带 `@ts-nocheck`，属历史遗留。

## 项目外还写了什么

- **Cloudflare 侧**：Worker `zestsend`、Durable Object `Room` 及其 SQLite 存储（随 Worker 存在）、Worker Secrets `TURN_ID` / `TURN_TOKEN`、Workers 可观测性日志。这些不在本地文件系统，删仓库不会清掉。
- **本地**：仅 `node_modules/`、`dist/`、`.wrangler/`、`*.tsbuildinfo`、`.env`（均在 `.gitignore`）。无注册表、无计划任务、无工作区外写入。
- **外呼**：运行时仅调用 Cloudflare TURN 凭证接口 + 多个公共 STUN 服务器（见 `deps.md`）。
