# 跨机器同步说明 — HMI 内置样例（2026-11-15）

> 适用 commit: `270d380` `feat(hmi): 预览与截图、统一关闭按钮、内置样例只读`
> 场景: 在一台机器上开发并提交后，在另一台已有数据的机器上拉取并运行

---

## 一句话总结

**数据库不用手工改，但必须重新构建 `@mvp-vue/schema` 并重启服务。**

```bash
git pull
pnpm install
pnpm -F @mvp-vue/schema build     # ← 关键，漏了会启动失败
# 重启 dev:server 与 dev:hmi
```

---

## 1. 这次的改动影响哪些东西

### 受影响

| 目标 | 变化 |
|---|---|
| `HmiSampleSource` 表 | 新增 `builtin` 列（`INTEGER NOT NULL DEFAULT 0`） |
| 表内数据 | 首次请求时自动插入 1 条 `builtin=1` 的内置样例 |
| `packages/hmi` 依赖 | 新增 `@mvp-vue/schema`、`modern-screenshot`、`html2canvas` |
| `packages/schema` 源码 | 新增 `src/hmiSample.ts`，`src/index.ts` 增加导出 |

### 不受影响

- 其他所有表（`HmiScreen`、`HmiPublication`、`HmiFile`、`HostedImage`、`PageSchema` 等）
- 已有的 `HmiSampleSource` 记录（内容、`active` 状态都不变）
- 已有的屏幕、发布、图片数据

---

## 2. 数据库会自动迁移，不需要手工操作

### 迁移时机

服务端在收到第一个 `/api/hmi/sample-sources` 请求时触发，逻辑在
`packages/server/src/routes/hmiSampleSources.ts` 的 `ensureTable()`。

启动流程里 **没有** `HmiSampleSource` 的迁移步骤（`ensureDatabaseSchema.ts` 里查不到这张表），
所以 `prisma db push` / `prisma migrate` 都不会处理它。这是历史设计，本次沿用。

### 迁移做了什么

1. `CREATE TABLE IF NOT EXISTS` —— 老库表已存在，此步无副作用
2. `ALTER TABLE ... ADD COLUMN "builtin"` —— 老库补列，列已存在则忽略报错
3. 查 `WHERE builtin = 1` —— 已有内置样例则跳过
4. 没有则插入内置样例

### 实测结果（模拟老库：无 builtin 列 + 2 条用户样例）

```
【迁移前】
  id=1  我的病区样例  active=1
  id=2  接口样例      active=0

【第 1 次迁移】seeded
  id=3  默认样例      builtin=1  jsonLen=440   ← 新增
  id=1  我的病区样例  builtin=0  jsonLen=21    ← 原样保留，active 仍为 1
  id=2  接口样例      builtin=0  jsonLen=2     ← 原样保留

【第 2 次迁移】skip-seed

【幂等检查】total=3, builtinCount=1           ← 重启不会重复插入
```

---

## 3. 必须执行的步骤

### 3.1 拉取与安装

```bash
cd ~/prj/mvp_vue
git pull
pnpm install
```

`pnpm install` 会做两件事：装 `modern-screenshot` / `html2canvas`，
以及重建 `packages/hmi/node_modules/@mvp-vue/schema` 的 workspace 软链。

### 3.2 构建 schema 包（**最容易漏、漏了就起不来**）

```bash
pnpm -F @mvp-vue/schema build
```

**为什么必须**：`@mvp-vue/schema` 的 `package.json` 里

```json
"main": "./dist/index.js",
"types": "./dist/index.d.ts"
```

指向 `dist/`，而 `dist/` 被根 `.gitignore` 排除，没有提交进仓库。
所以每台机器都要自己构建一次。

**不构建的症状**：

| 症状 | 说明 |
|---|---|
| `ERR_MODULE_NOT_FOUND: Cannot find module '...\packages\schema\dist\hmiSample'` | `dist` 是旧的（本次新增了 `hmiSample` 模块），最常见 |
| `Cannot find module '@mvp-vue/schema'` | `dist/index.js` 完全不存在（全新机器未构建过） |
| `does not provide an export named 'HMI_DEFAULT_SAMPLE'` | `dist/index.js` 旧版，未含新导出 |
| TypeScript 报「模块无导出成员」 | `dist/index.d.ts` 过期 |

**验证是否构建成功**：

```bash
ls packages/schema/dist/hmiSample.js
# 有输出 = OK
```

### 3.3 重启服务

```bash
# 后端（在 mvp 或本仓 packages/server，按你平时的启动方式）
pnpm dev:server

# 前端
pnpm dev:hmi
```

后端启动后随便打开一次 HMI 编辑器的「样例数据」对话框，或直接打接口：

```bash
curl http://localhost:3002/api/hmi/sample-sources
```

返回里应看到一条 `"builtin": true` 的记录。

---

## 4. 不需要做的事

| 操作 | 结论 | 原因 |
|---|---|---|
| `prisma db push` | **不需要** | 该表不归 Prisma 迁移管，由路由内 SQL 自建 |
| `prisma generate` | 不需要 | Prisma Client 没加新 model，`builtin` 走 raw SQL |
| 手工 `ALTER TABLE` | 不需要 | 自动完成 |
| 手工插入内置样例 | 不需要 | 自动完成 |
| 备份数据库 | 建议但非必须 | 只是加列，不删数据；保险起见可先复制 `.db` |
| 清理旧数据 | 视情况，见第 5 节 | |

---

## 5. 可能需要手动处理的情况

### 5.1 库里有旧版「默认样例」

之前临时实现过「前端 seed 写入数据库」的方案（commit 未推送，仅本地验证）。
如果另一台机器上跑过那个版本，库里可能已存在一条 `builtin = 0` 的「默认样例」。

新版会再插入一条 `builtin = 1` 的同名记录，界面上看起来是两条。

**判断方法**：

```bash
curl http://localhost:3002/api/hmi/sample-sources
```

若返回两条 name 都是「默认样例」，且一条 `builtin` 为 true 一条为 false，就是这种情况。

**处理**：在界面上选中 `builtin=false` 那条，点「删除」即可。
它是普通样例，不受只读保护。

> 保留哪条？带橙色「内置」徽章的是新版内置样例，不要删；
> 如果旧那条里有你手工改过的内容，先「另存为」把内容留下来再删。

### 5.2 之前手动创建过同名样例

若你曾自己建过一条也叫「默认样例」的记录，同样会出现两条同名。
这个不会冲突（内置样例的判据是 `builtin = 1`，不是名字），
按需把自建那条改名即可。

### 5.3 端口 3002 被旧进程占用

拉代码后如果没重启后端，旧进程的内存里还是旧代码，
会出现「前端显示有 builtin 徽章、但点删除却成功」这类不一致。

**处理**：确认旧 `dev:server` 已退出，再启动新的。

---

## 6. 回滚方法

如果新版本有问题想退回：

```bash
git reset --hard 20f3f89        # 回到本次提交之前
pnpm install
pnpm -F @mvp-vue/schema build
# 重启服务
```

数据库层面**不需要回滚**：`builtin` 列对旧代码无害（旧代码的 SELECT 是显式列名，
不查这一列），内置样例那条记录旧代码会当成普通样例展示，功能正常。

如果确实想删掉内置样例记录：

```sql
DELETE FROM "HmiSampleSource" WHERE "builtin" = 1;
```

---

## 7. 排查清单

拉代码后如果界面异常，按顺序检查：

- [ ] `packages/schema/dist/hmiSample.js` 存在？
- [ ] `pnpm install` 后 `packages/hmi/node_modules/@mvp-vue/schema` 软链存在？
- [ ] 后端进程是本次重启的？（`ps` 看启动时间）
- [ ] `curl /api/hmi/sample-sources` 返回里有 `"builtin"` 字段？
- [ ] 浏览器硬刷新过？（`Ctrl+Shift+R`，前端可能缓存了旧 bundle）
- [ ] 样例列表是否出现两条同名？（→ 5.1）

---

## 8. 本次改动的其他注意事项（非数据库）

### 截图功能换库

截图从 `html2canvas` 换成 `modern-screenshot`。原因是前者不支持 CSS Grid，
卡片布局会塌陷成一列。旧库仍留在 `package.json` 里但已无引用，
可以择机 `pnpm -F @mvp-vue/hmi remove html2canvas` 清掉。

### 内置样例只读

服务端对 `builtin = 1` 的记录，`PUT` 和 `DELETE` 均返回 403。
要改内容必须「另存为」副本。这是设计意图，不是 bug。

### 数据单一来源

默认样例数据现在只存在于 `packages/schema/src/hmiSample.ts`。
**以后修改这份数据，必须重新 `pnpm -F @mvp-vue/schema build`**，
否则前端和 server 读到的还是旧 `dist`。
