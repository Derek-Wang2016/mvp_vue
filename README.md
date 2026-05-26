# mvp_vue — 可视化大屏平台（Vue 3 重构）

本仓库是 [mvp](https://github.com)（React 版，通常与 `../mvp` 本地克隆并存）的 **Vue 3 重构**。业务模型、JSON Schema 契约与后端 API 与 React 版保持兼容。

## 文档

| 文档 | 说明 |
|------|------|
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
| 后端 | 3002 | 初期共用 `../mvp` 的 `@mvp/server` |

环境变量见根目录 [.env.example](.env.example)（`VITE_API_BASE`，默认 `http://<hostname>:3002`）。

## 克隆后启动

```bash
git clone https://github.com/<你的用户名>/mvp_vue.git
cd mvp_vue
pnpm install

# 另开终端：在 React 版 mvp 仓库启动后端（单实例）
cd ../mvp
pnpm install
pnpm -F @mvp/server exec prisma db push   # 首次
pnpm dev:server                           # → http://localhost:3002

# 回到 mvp_vue
pnpm dev:editor    # http://localhost:5000
pnpm dev:renderer  # http://localhost:5001?id=<页面ID>
```

构建：

```bash
pnpm build
```

## 与 React 版的关系

- 本仓库 **独立 Git 仓库**；`mvp`（React）另仓维护。
- Phase 0–3 可共用 `../mvp/packages/server`，勿重复启动多个 3002 实例。
