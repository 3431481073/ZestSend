# ZestSend · 怎么装 / 怎么跑 / 怎么测 / 已知限制

## 环境要求

- Node.js（配合 `package.json` 声明的 pnpm 版本）
- **pnpm `11.1.3`**（`packageManager` 字段固定；`pnpm-lock.yaml` 被 `.gitignore` 忽略，是本机锁文件）
- 部署/本地跑 Worker 需要 `wrangler`（devDependency，随 `pnpm install` 装入）

## 安装

```bash
pnpm install
```

## 跑起来

| 命令 | 实际做什么 | 说明 |
| --- | --- | --- |
| `pnpm dev` | `vite --host 0.0.0.0 --port 8787` | 经 `@cloudflare/vite-plugin` 同时起前端与 Worker，日常开发用这个 |
| `pnpm dev:worker` | `wrangler dev --local --ip 0.0.0.0 --port 8787 --env-file .env` | 纯 Worker 本地调试，读 `.env` 里的 TURN 配置 |
| `pnpm dev:without-turn` | `wrangler dev --local --ip 0.0.0.0 --port 8787` | 不加载 `.env`，只走公共 STUN 直连 |

打开 <http://127.0.0.1:8787>。根路径 `/` 会按 `Accept-Language` / Cookie 307 跳到 `/en` 或 `/zh`。

### TURN 配置（可选）

复制 `.dev.vars.example` 为 `.env`：

```dotenv
TURN_ID=your_cloudflare_turn_key_id
TURN_TOKEN=your_cloudflare_turn_api_token
```

留空时不报错，应用退回公共 STUN 尝试直连；受限网络无法穿透时不会启用中继。

## 构建 / 检查

| 命令 | 做什么 | 产物 |
| --- | --- | --- |
| `pnpm build` | `tsc -b && vite build` | `dist/`（`dist/client` 为静态资源） |
| `pnpm check` | `tsc -b` 类型检查 | — |
| `pnpm preview` | `vite preview` | — |
| `pnpm cf-typegen` | `wrangler types` | 生成/更新 `worker-configuration.d.ts`（勿手改） |
| `pnpm deploy` | `pnpm run build && wrangler deploy --keep-vars` | 部署到 Cloudflare Worker `zestsend` |

## 怎么测

- 仓库内**没有**单元 / 集成测试框架，`package.json` 无 `test` 脚本。
- 连接、媒体、传输相关的改动，按 `CONTRIBUTING.md` 要求用**两个独立浏览器会话**手工验证，并在 PR 里写明测过的场景与限制。
- ICE 连通性可在首页「关于 → 连接诊断」里看 STUN / TURN 探测结果。

## 已知限制

- 未配置 TURN 时，对称 NAT / 受限网络下可能无法中继，只能尝试直连。
- Cloudflare TURN 免费额度约每月 1000GB 中转流量（上游 README 口径）。
- 房间号仅两种合法形态：四位数字 `\d{4}`，或 `rec_` + 32 位小写 hex（上游 `record_id` 形态）。
- Cloudflare 部署需保持 Worker 名为 `zestsend`，与 `wrangler.jsonc` 一致；部署包管理器选 `pnpm`、Build command 留空、Deploy command 为 `pnpm deploy`。
- `worker-configuration.d.ts` 是 `cf-typegen` 生成的大文件（约 560KB），不是手写源码。
