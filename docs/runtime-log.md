# ZestSend · 运行时行为日志（可关）

> 本项目不写本地运行日志文件；运行时行为日志只出现在 Cloudflare（服务端）与浏览器 DevTools（客户端）。

## 服务端（Cloudflare Worker）

- **产出方式**：`console.error(JSON.stringify({...}))` 结构化输出，经 Cloudflare Workers 可观测性收集。
- **开关**：`wrangler.jsonc` → `observability.enabled: true`、`head_sampling_rate: 1`（100% 采样）。要关：把 `enabled` 置 `false`，或调低 `head_sampling_rate`。
- **在线查看**：`wrangler tail`（实时）或 Cloudflare Dashboard → Worker → Logs。
- **已知事件**：

  | 事件 `event` | 字段 | 触发点 |
  | --- | --- | --- |
  | `turn_credentials_failed` | `status` | Cloudflare TURN 接口返回非 2xx |
  | `api_error` | `path`、`message` | Hono `onError` 捕获的未处理异常 |

- 响应约定：请求体非法 JSON → 400 `invalid JSON body`（不再混进 500），避免与真的服务端错误混淆。

## 客户端（浏览器）

- 无持久化日志文件；行为与错误只在 DevTools Console / Network / Application 里可见。
- 连接各阶段状态（WebSocket / STUN / TURN / P2P / 数据通道）实时显示在房间「连接状态」面板，不落盘。
- 分析事件（`window.insightflare.track / trackOnce`，如 `room_join_requested`、`p2p_session_connected`、`file_transfer_completed`）仅在**非 DEV 构建**下上报，且需页面注入 `window.insightflare`；本地 `pnpm dev` 不上报。
- `src/client/lib/utils.ts` 的 `getIPInfo` 会 `console.error`，但该函数无引用、不会执行。

## 关闭顺序建议

1. 分析事件：不注入 `window.insightflare` 即自动静默（代码已容错）。
2. 服务端日志：改 `wrangler.jsonc` 可观测性开关后重新 `pnpm deploy`。
