# ZestSend · 变更记录（只追加，最新在下）

> 规则：改完就追加一条 —— 改了啥 · 怎么验的 · 还剩啥。

## 2026-10-09 · 补齐工作区文档

- **改了啥**：新建 `docs/` 六件套（`README` / `run` / `data` / `deps` / `service` / `log` / `runtime-log`），按 `D:\MyProject\CLAUDE.md` §7 新建 `docs/INPUT-SLOT.md`、`docs/OUTPUT-SLOT.md`；新建根目录 `services.yaml`（`services: []` + 理由）。未改任何代码、未动数据、未删文件。
- **怎么验的**：对照源码 `src/worker/index.ts`、`src/worker/room.ts`、`src/client/lib/*`、`wrangler.jsonc`、`package.json`、`CONTRIBUTING.md`、`.dev.vars.example` 逐条核对；文档只描述已存在的行为。
- **还剩啥**：无。若后续接口 / 存储 / 端口有变，需同步更新对应文档与 SLOT。

## 2026-10-11 · 槽文档改用 §8.4 固定格式

- **改了啥**：按 `D:\MyProject\CLAUDE.md` §8.4 重写 `docs/INPUT-SLOT.md`、`docs/OUTPUT-SLOT.md`。固定标题改为 `## 我从哪拿` / `## 我往外给`，紧跟一张两列表（`锚点` + `拿什么` / `是什么`）；原有字段、假设、失效模式整体移入 `## 详情`，信息未删；输入槽去掉来源项目名。
- **怎么验的**：对照旧版逐行比对，确认原表每行都有对应锚点、原假设与失效模式都进了 `## 详情`；锚点按规则取绝对路径（`D:\MyProject\ZestSend\...`）或端口（`127.0.0.1:8787`），外部服务原样写 URL。
- **还剩啥**：本项目的输入均为外部服务 / 外部深链，锚点会落到 `D:\MyProject` 之外，`pm map` 反查时预期报为断链（已在文件开头注明）；若将来接入工作区内项目的池子，需补进 `## 我从哪拿`。
