# ZestSend · 有没有常驻服务 / 端口表 / 外部前置条件

## 有没有常驻服务

**本地没有常驻服务。** 生产形态是 Cloudflare 上的无服务器 Worker（`zestsend`）+ Durable Object，无本地进程、无监听端口、无需开机拉起或崩溃重启。因此根目录 `services.yaml` 为 `services: []`（附理由），也不需要 `svcmgr` 注册。

## 端口表

| 场景 | 端口 | 谁拉起 | 说明 |
| --- | --- | --- | --- |
| 本地开发 | `8787`（`127.0.0.1:8787` 或 `0.0.0.0:8787`） | `pnpm dev` / `pnpm dev:worker` / `pnpm dev:without-turn` | 前端 + Worker 同端口 |
| 生产 | 无自持端口 | Cloudflare | 由 Cloudflare 暴露 HTTPS / WSS |

## 外部前置条件

| 条件 | 必需？ | 影响 |
| --- | --- | --- |
| Cloudflare 账号 + Workers/Pages | 部署 / 转生产必需 | 本地开发不需要 |
| Worker 名保持 `zestsend` | 部署必需 | 与 `wrangler.jsonc` 一致 |
| Secrets `TURN_ID` / `TURN_TOKEN` | 可选 | 缺失时仅 STUN 直连，受限网络无法中继；`/api/turn/credentials` 返回 500 与 `TURN credentials are not configured.` |
| 浏览器 WebRTC / DataChannel / OPFS 支持 | 运行时必需 | 首页「连接诊断」会显示 WebRTC / DataChannel 是否受支持 |
| Google Fonts？第三方 CDN？ | 否 | 无外部字体 / CDN 依赖，字体 `LastoriaBoldRegular.otf` 在 `public/` 内自带 |

## 对外接口一览（供排障）

- `GET /`、`GET /room/:roomId` → 307 语言跳转（带 `Set-Cookie: zestsend_locale`）
- `GET /en`、`GET /zh`、`GET /en/room/:roomId`、`GET /zh/room/:roomId` → SPA 资源
- `GET /api/rooms/:roomId/ws` → WebSocket 升级（非升级请求返回 426）
- `POST /api/turn/credentials` → 转发 Cloudflare TURN 凭证；其它方法 405
- 未匹配路由 → SPA fallback（`not_found_handling: single-page-application`）
