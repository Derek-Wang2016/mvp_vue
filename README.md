# mvp_vue — 可视化大屏平台（Vue 3 重构）

本仓库是 [mvp](https://github.com)（React 版，通常与 `../mvp` 本地克隆并存）的 **Vue 3 重构**。业务模型、JSON Schema 契约与后端 API 与 React 版保持兼容。

## 文档

| 文档 | 说明 |
|------|------|
| [doc/deploy-linux-nginx.md](doc/deploy-linux-nginx.md) | **Linux + Nginx 构建、发布、部署**（含 [§4.4 无 Nginx 试运行](doc/deploy-linux-nginx.md#44-无-nginx-试运行内网验收)） |
| [doc/tech-stack.md](doc/tech-stack.md) | 技术选型说明（版本、对比、约束） |
| [doc/dev-plan.md](doc/dev-plan.md) | 分阶段开发计划与进度跟踪 |
| [doc/parity-checklist.md](doc/parity-checklist.md) | 与 React 版功能对等验收清单 |
| [CLAUDE.md](CLAUDE.md) | Agent / AI 协作约定与项目速览 |

需求原文见 React 版：`../mvp/doc/需求.md`（本地克隆时）。

## 目标架构

```
Editor (Vue)  →  JSON Schema  →  Server (Fastify)  →  Renderer (Vue)
```

## 端口

| 服务 | 端口 | 包名 |
|------|------|------|
| 编辑器 | 5000 | `@mvp-vue/editor` |
| 渲染器 | 5001 | `@mvp-vue/renderer` |
| 后端 | 3002 | `@mvp-vue/server` |

环境变量见根目录 [.env.example](.env.example)（`VITE_API_BASE`，默认 `http://<hostname>:3002`）。

**发布态双表策略**（可选）：编辑器 `VITE_PAGE_POLICY=strict` 与后端 `PAGE_POLICY=strict` 成对启用后，调试表（`/api/draft/pages`）只读，发布表（`/api/publish/pages`）可编辑；Renderer 只读发布表。

## 克隆后启动

```bash
git clone https://github.com/Derek-Wang2016/mvp_vue.git
cd mvp_vue
pnpm install
pnpm -F @mvp-vue/server exec prisma generate   # 首次或 schema 变更后
pnpm dev:server                                  # → http://localhost:3002

# 另开终端
pnpm dev:editor    # http://localhost:5000
pnpm dev:renderer  # http://localhost:5001?id=<发布页ID>
```

构建：

```bash
pnpm build              # editor + renderer（Vite，含 vue-tsc）

# 后端：首次或 prisma/schema 变更后先生成 Client，再编译
pnpm prisma:generate    # 须先停掉 pnpm dev:server（Windows 否则会 EPERM）
pnpm build:server       # tsc → packages/server/dist/
```

生产启动 API：`pnpm -F @mvp-vue/server start`（需先 `build:server`）。详见 [packages/server/README.md](packages/server/README.md)。

**Linux 内网试运行（不配 Nginx）**：`MVP_SERVER_IP=<服务器IP> pnpm build:trial` → `scripts/rsync-to-server.sh` → 服务器上 `scripts/server-trial-setup.sh` / `server-trial-start.sh`。详见 [doc/deploy-linux-nginx.md §4.4](doc/deploy-linux-nginx.md#44-无-nginx-试运行内网验收)。

生产部署见 [doc/deploy-linux-nginx.md](doc/deploy-linux-nginx.md)；构建前参考各包 `packages/*/env.production.example` 配置 `VITE_API_BASE`。

## 与 React 版的关系

- 本仓库 **独立 Git 仓库**；`mvp`（React）另仓维护，Schema 与 API 契约保持兼容。
- 后端已迁入 `packages/server`（含 `prisma/dev.db`）；勿与 React 版 `@mvp/server` 同时占用 3002 端口。
