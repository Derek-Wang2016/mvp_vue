# @mvp-vue/server

Fastify 4 + Prisma 5 + SQLite（`:3002`），与编辑器 / 渲染器 API 契约一致。

## 启动

```bash
# 在 mvp_vue 根目录
pnpm install
pnpm -F @mvp-vue/server exec prisma generate   # 首次或 schema 变更后
pnpm dev:server                                  # → http://localhost:3002
```

## 构建与生产运行

```bash
# 根目录；Client 已生成且未改 schema 时，可只跑 build:server
pnpm prisma:generate   # 首次 / schema 变更后；Windows 上须先停 dev:server，否则 EPERM
pnpm build:server      # tsc → dist/
pnpm -F @mvp-vue/server start   # node dist/index.js，默认 :3002
```

`prisma generate` 会替换 `node_modules` 里的查询引擎 DLL；**`pnpm dev:server` 运行时该文件被占用**，在 Windows 上常见 `EPERM: operation not permitted, rename ...query_engine-windows.dll.node`。

部署流程见 [doc/deploy-linux-nginx.md](../../doc/deploy-linux-nginx.md)。**无 Nginx 内网试运行**见该文档 §4.4（`scripts/server-trial-*.sh`、`pnpm build:trial`）。

数据库文件：`prisma/dev.db`（自 React 版 `@mvp/server` 迁入，含 draft / publish 双表数据）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `PAGE_POLICY=strict` | 发布模式：调试表只读，发布表可写；须与编辑器 `VITE_PAGE_POLICY=strict` 成对 |

## 常用命令

```bash
pnpm -F @mvp-vue/server db:push      # schema 变更后同步表结构
pnpm -F @mvp-vue/server db:seed      # Mock SQL 表 + 地图字段修正（不删页面数据）
pnpm -F @mvp-vue/server db:studio    # Prisma Studio
```

## 从旧单表迁移

仅当 `dev.db` 仍为 `Page` 单表时：

```bash
sqlite3 packages/server/prisma/dev.db < packages/server/prisma/migrate-to-dual-table.sql
pnpm -F @mvp-vue/server db:push
pnpm -F @mvp-vue/server exec prisma generate
```
