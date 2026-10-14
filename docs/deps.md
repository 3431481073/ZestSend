# ZestSend · 依赖清单形态 / 环境在哪 / 对外契约

## 依赖清单形态

- **管理器**：pnpm（`packageManager: pnpm@11.1.3`）。
- **锁文件**：`pnpm-lock.yaml` 存在于仓库，但被 `.gitignore` 忽略（上游有意不提交）。
- **工作区**：`pnpm-workspace.yaml` 存在。
- **安装位置**：`node_modules/`（项目内），无需环境变量。
- **生成物**：`worker-configuration.d.ts` 由 `pnpm cf-typegen` 生成，勿手改；`*.tsbuildinfo` 为增量构建缓存。

### 运行依赖（`dependencies`）

| 类别 | 包 |
| --- | --- |
| 框架 / 路由 | `hono`、`@tanstack/react-router`、`react`、`react-dom` |
| 协作 / 富文本 | `yjs`、`y-protocols`、`@tiptap/*`（react、starter-kit、collaboration、collaboration-caret、character-count、link、placeholder、task-list、task-item） |
| 动效 / 视觉 | `framer-motion`、`@number-flow/react`、`@remixicon/react`、`overlayscrollbars`、`opentype.js`、`cuid` |
| 工具 | `clsx`、`tailwind-merge` |

### 开发依赖（`devDependencies`）

`vite`、`@vitejs/plugin-react`、`@cloudflare/vite-plugin`、`wrangler`、`typescript`、`tailwindcss`、`postcss`、`autoprefixer`、`@types/react`、`@types/react-dom`。

## 运行环境在哪

- **本地**：Node + pnpm，配置走 `.env`（gitignore 内），模板见 `.dev.vars.example`。
- **生产**：Cloudflare Worker 运行时（`compatibility_date: 2026-08-11`，`nodejs_compat`）；静态资源绑定 `ASSETS` → `./dist/client`。Secrets 在 Cloudflare Worker 设置里，不落仓库。

## 对外契约表

| 对方 | 方向 | 契约 | 备注 |
| --- | --- | --- | --- |
| Cloudflare Realtime TURN | 出 | `POST https://rtc.live.cloudflare.com/v1/turn/keys/<keyId>/credentials/generate-ice-servers`，`Authorization: Bearer <token>`，body `{ttl}` | 由 Worker `/api/turn/credentials` 代理；`ttl` 夹取 `[60, 86400]`，客户端请求 3600 |
| 公共 STUN（Google / Nextcloud / Antisip / FreeSWITCH / Metered 等 9 个） | 出 | 标准 STUN，用于直连探测 | 硬编码在 `src/client/lib/webrtc.ts` 的 `PUBLIC_STUN_CANDIDATES` |
| Cloudflare 注入的分析脚本 | 入 | 全局 `window.insightflare.track / trackOnce` | 代码只做特性探测，未在 `index.html` 引入 |
| 上游深链（如手机端 / 代码注释所指 `AI_ask`） | 入 | URL 路径 `roomId` + 查询参数 `?auto=1` | 详见 `INPUT-SLOT.md` |

> ⚠️ TURN 凭据从 Dashboard 粘贴常带尾随空白，Worker 已 `trim()` 后再用；空 body 合法。
