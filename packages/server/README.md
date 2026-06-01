# @mvp-vue/server

Fastify 4 + Prisma 5 + SQLite（`:3002`），与编辑器 / 渲染器 API 契约一致。

## 启动

```bash
# 在 mvp_vue 根目录
pnpm install
pnpm -F @mvp-vue/server exec prisma generate   # 首次或 schema 变更后
pnpm dev:server                                  # → http://localhost:3002
```

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
