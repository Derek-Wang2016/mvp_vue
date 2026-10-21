# Docker 部署设计（离线双镜像 + 版本回滚）

- 日期：2026-10-21
- 状态：已评审（待实现）
- 关联文档：[deploy-linux-nginx.md](deploy-linux-nginx.md)（现有 Linux + Nginx 部署）

## 1. 背景与目标

现有部署为：Nginx 托管 Editor/Renderer 静态包（**5000/5001**，见 `doc/nginx/mvp-intranet.conf.example`），systemd 运行 Fastify API（3002），SQLite 文件位于 `packages/server/prisma/dev.db`。

> 仓库内端口存在两套写法：开发端口与 Nginx 模板为 5000/5001，部署文档正文与试运行脚本为 8080/8081。Docker 方案统一采用 **5000/5001**，与现有 Nginx 模板和开发端口一致。

目标：

1. 改为 Docker 部署，**默认保留现有访问方式**：Editor `:5000`、Renderer `:5001`；
   宿主机端口可通过 `.env` 调整，无需重新构建镜像。
2. API 不再对外暴露 3002，由 Nginx 在 `/api/` 同源反代到 API 容器。
3. 构建机可联网、目标服务器**离线**：通过 `docker save` / `docker load` 交付镜像。
4. 升级使用版本 tag，可快速回滚。
5. 升级前自动备份数据库，并提供每日定时备份与恢复脚本。
6. 保留现有 `dev.db` 数据。

非目标：

- 不引入数据库服务器（继续使用 SQLite）。
- 不改动页面 Schema / API 契约。
- 不在本期加入 HTTPS、认证、私有镜像仓库。

## 2. 关键决策

| 决策点 | 结论 |
|--------|------|
| 访问入口 | 双端口，容器内固定 5000/5001；宿主机端口由 `.env` 的 `EDITOR_PORT` / `RENDERER_PORT` 映射，默认 5000/5001；3002 不映射到宿主 |
| 渲染器链接 | Web 容器启动时注入 `rendererPort`，Editor 用「当前主机名 + 该端口」拼地址，改端口无需重新构建 |
| 镜像拆分 | 2 个镜像：`mvp-vue-web`（Nginx + 两个 dist）、`mvp-vue-api`（Node） |
| 前端 API 地址 | 构建时 `VITE_API_BASE=/`，请求同源 `/api`，不再写死服务器 IP |
| 数据库持久化 | 宿主目录绑定挂载 `./data:/data`，DB 路径 `/data/dev.db` |
| 发布方式 | 版本 tag（如 `20261021-1`）+ `docker save` 发布包 |
| 升级/回滚 | 切换 `.env` 中的 `TAG` 后 `docker compose up -d`，旧镜像保留 |
| 备份 | 升级前自动备份 + 每日 cron 备份，默认保留 30 天 |
| 目标架构 | `linux/amd64`（若目标为 arm64，构建时调整 `--platform`） |
| 页面策略 | `PAGE_POLICY=strict` + `VITE_PAGE_POLICY=strict`（与现状一致） |

## 3. 运行架构

```text
浏览器
  ├─ :5000  Editor  ──┐
  └─ :5001  Renderer ─┤→ web 容器（Nginx）
                       │    ├─ /        → 对应 dist（SPA fallback）
                       │    └─ /api/    → http://api:3002
                       │
                       └→ api 容器（Node 20 + Fastify + Prisma）
                              └─ /data/dev.db  ←  宿主 ./data
```

- 两个容器位于同一个 Docker bridge 网络；`api` 不发布宿主端口。
- `web` 容器的两个 server 块分别监听 5000/5001（容器内固定），均配置
  `location /api/ { proxy_pass http://api:3002; }`（不带尾斜杠，保留完整路径）。
- 宿主机映射：
  `"${EDITOR_PORT:-5000}:5000"`、`"${RENDERER_PORT:-5001}:5001"`。
  改端口只改 `.env` 后 `docker compose up -d`，不重新构建镜像。
- `api` 健康检查使用 Node `fetch` 请求本机 `/api/publish/pages`；`web` 依赖 `api` 健康后启动。

## 4. 镜像设计

### 4.1 `mvp-vue-web:<tag>`

- 构建阶段：`node:20-bookworm-slim`
  - 安装 pnpm 9（与仓库锁文件版本一致）
  - `pnpm install --frozen-lockfile`
  - `pnpm build`，构建参数：
    - `VITE_API_BASE=/`
    - `VITE_PAGE_POLICY=strict`
- 运行阶段：`nginx:1.27-alpine`
  - 复制 `packages/editor/dist` → `/usr/share/nginx/html/editor`
  - 复制 `packages/renderer/dist` → `/usr/share/nginx/html/renderer`
  - 复制 `deploy/docker/nginx/editor.conf`、`renderer.conf` 到 `/etc/nginx/conf.d/`
  - 入口脚本用 `envsubst` 生成 `/usr/share/nginx/html/editor/runtime-config.js`：
    `window.__MVP_RUNTIME__ = { rendererPort: "<RENDERER_PORT>" }`
    （compose 同时把 `RENDERER_PORT` 传入 web 容器，保证映射端口与链接端口一致）
  - Nginx 要点：`client_max_body_size 20m`、gzip、静态资源缓存、
    `try_files $uri $uri/ /index.html`、`/api/` 反代。

### 4.2 `mvp-vue-api:<tag>`

- 构建阶段：`node:20-bookworm-slim`
  - 安装依赖并执行 `pnpm -F @mvp-vue/schema build`
  - `pnpm -F @mvp-vue/server exec prisma generate`（**必须在 Linux 容器内生成**）
  - `pnpm -F @mvp-vue/server build`
- 运行阶段：`node:20-bookworm-slim`
  - 安装 `openssl`、`ca-certificates`、`sqlite3`（备份用）
  - 用 `pnpm deploy --filter @mvp-vue/server --prod /app` 生成自包含 `node_modules`
    （包含已生成的 Prisma Client 与 Linux 查询引擎）
  - 以非 root 用户运行 `node dist/index.js`
  - 运行镜像**不包含 Prisma CLI**；空库初始化由应用启动时的 `ensureDatabaseSchema` 完成（见 §5）
  - 环境变量：`DATABASE_URL=file:/data/dev.db`、`PAGE_POLICY=strict`、`NODE_ENV=production`、`TZ`
  - 挂载：`./data:/data`

镜像 tag 规则：`YYYYMMDD-N`（同日第 N 次发布），同时写入 compose `.env`。

## 5. 应用代码调整

1. **Prisma 数据源**
   - `packages/server/prisma/schema.prisma`：`url = env("DATABASE_URL")`。
   - `packages/server/src/index.ts`：在创建 `PrismaClient` 前，若未设置则回落
     `process.env.DATABASE_URL = 'file:./dev.db'`，保持本地开发行为不变。
   - 本地 Prisma CLI（`db:push` 等）通过 `packages/server/prisma/.env` 提供
     `DATABASE_URL="file:./dev.db"`（非敏感文件，需在 `.gitignore` 中放行）。
2. **Editor 打开渲染器**
   - `packages/editor/index.html`：引入 `<script src="/runtime-config.js"></script>`。
   - `packages/editor/src/config.ts`：`getRendererBase()` 优先级为
     ① `window.__MVP_RUNTIME__?.rendererPort`（Docker 运行时注入，拼
     `协议://当前主机名:端口`）；② 其余情况默认 5001（开发与生产一致）。
     改宿主机端口只改 `.env` + 重启容器，前端无需重建。
3. **空库初始化**
   - 扩展 `ensureDatabaseSchema` 的 `STEPS`：新增基线步骤，用
     `CREATE TABLE IF NOT EXISTS` 补齐 `PageDraft`、`PagePublished`、`CustomIcon`
     （`EditableText` 已有）。这样全新数据卷首次启动即可用，运行镜像无需 Prisma CLI。
   - 后续结构变更继续以新增幂等步骤的方式演进；需要改列类型的复杂迁移在开发机对
     `dev.db` 执行 `prisma db push` 后再迁移数据。
4. **`.dockerignore`**
   - 排除 `node_modules`、`**/dist`、`data`、`backups`、`.git`、发布产物。

## 6. 离線构建与发布（构建机）

```bash
TAG=20261021-1 ./deploy/docker/build.sh
TAG=20261021-1 ./deploy/docker/package.sh
```

`build.sh`：

- `docker build --platform linux/amd64 -f deploy/docker/Dockerfile.web -t mvp-vue-web:$TAG .`
- `docker build --platform linux/amd64 -f deploy/docker/Dockerfile.api -t mvp-vue-api:$TAG .`

`package.sh` 产出 `release/mvp-vue-$TAG.tar.gz`，包含：

- `images.tar.gz`：`docker save mvp-vue-web:$TAG mvp-vue-api:$TAG`
- `docker-compose.yml`
- `.env` 模板（`TAG`、`EDITOR_PORT`、`RENDERER_PORT`、`PAGE_POLICY=strict`、`TZ=Asia/Shanghai`）
- `scripts/`：`upgrade.sh`、`rollback.sh`、`backup-db.sh`、`restore-db.sh`、`install-cron.sh`
- `README.md`（首次部署 / 停旧服务 / 升级 / 回滚 / 备份操作）

`upgrade.sh` 支持两种模式：

- `--prepare <包>`：仅 `docker load` 与 `docker compose config` 校验，不启动容器（用于切换前准备）。
- 默认：备份数据库 → load → 更新 `TAG` → `docker compose up -d` → 健康检查。
  首次部署时 `api` 尚未运行，脚本跳过容器内备份（使用 7.1 的 `pre-docker-*` 备份）。

## 7. 目标机部署与切换（离线）

### 7.1 首次切换前置准备（不影响现网）

1. 将发布包传输并解压到部署目录（示例 `/opt/mvp_vue-docker`）。
2. 记录现状，确认旧服务名与实际监听端口：

   ```bash
   systemctl status mvp-server --no-pager
   systemctl status nginx --no-pager
   ss -lntp | grep -E ':(3002|5000|5001|8080|8081)\b'
   nginx -T 2>/dev/null | grep -nE 'listen\s+(3002|5000|5001|8080|8081)'
   ```

   > 旧部署可能使用 5000/5001（Nginx 模板）或 8080/8081（部署文档与试运行脚本），
   > 务必以 `ss` / `nginx -T` 的实际结果为准。
3. 在线备份现网数据库（旧 API 仍在运行）：

   ```bash
   mkdir -p /opt/mvp_vue-docker/backups
   sqlite3 /opt/mvp_vue/packages/server/prisma/dev.db \
     ".backup '/opt/mvp_vue-docker/backups/pre-docker-$(date +%F-%H%M).db'"
   ```

   若宿主机没有 `sqlite3`：先停旧 API（见 7.2 第 1 步），再复制 `dev.db`
   及可能存在的 `dev.db-wal`、`dev.db-shm`。
4. 将备份库放到 `data/dev.db`，并设置容器可写权限：

   ```bash
   mkdir -p data
   cp backups/pre-docker-*.db data/dev.db
   chown -R 1000:1000 data
   ```
5. 导入镜像（不影响运行中的旧服务）：

   ```bash
   ./scripts/upgrade.sh --prepare mvp-vue-20261021-1.tar.gz
   # 仅执行 docker load 与 docker compose config 校验，不启动容器
   ```

### 7.2 停止旧 systemd 与 Nginx（切换窗口）

顺序：**先停 API（停止写入），再停 Nginx（释放 5000/5001）**。本阶段只停用、不删除，
保留 systemd unit、Nginx 配置和旧目录，便于回滚。

1. 停止旧 API：

   ```bash
   sudo systemctl stop mvp-server
   systemctl is-active mvp-server          # 期望 inactive
   ss -lntp | grep ':3002' || echo '3002 free'
   ```

2. 停止或摘除旧 Nginx，按实际情况二选一：

   **情况 A：Nginx 仅服务 mvp（专用机）**

   ```bash
   sudo systemctl stop nginx
   sudo systemctl disable nginx
   ```

   **情况 B：Nginx 还服务其它站点（共用机）**

   不要停整个 Nginx，只摘除 mvp 的站点配置后重载：

   ```bash
   # Debian/Ubuntu
   sudo mv /etc/nginx/sites-enabled/mvp-vue /root/mvp-vue.site.bak
   sudo nginx -t && sudo systemctl reload nginx

   # RHEL/CentOS
   sudo mv /etc/nginx/conf.d/mvp-*.conf /root/
   sudo nginx -t && sudo systemctl reload nginx
   ```

   编辑器/渲染器若配置为两个独立文件，需全部摘除。

3. 释放端口检查：

   ```bash
   ss -lntp | grep -E ':(5000|5001|8080|8081)\b' || echo 'web ports free'
   ```

4. 清理试运行进程（如有）：

   ```bash
   pgrep -af 'vite preview|packages/server/dist/index.js'
   # 确认属于 mvp 后按 PID 停止；不要误杀其它服务
   ```

5. 禁止旧服务开机自启（保留 unit 文件，便于回滚）：

   ```bash
   sudo systemctl disable mvp-server
   # 仅情况 A 执行：
   sudo systemctl disable nginx
   ```

### 7.3 启动 Docker 并验收

1. 启动：

   ```bash
   cd /opt/mvp_vue-docker
   ./scripts/upgrade.sh mvp-vue-20261021-1.tar.gz
   # 已 load 过镜像时会复用；脚本更新 .env 的 TAG 后 docker compose up -d
   ```

2. 容器与健康检查：

   ```bash
   docker compose ps
   docker compose logs --tail=100 api
   ```

3. 接口与页面：

   ```bash
   curl -fsS http://127.0.0.1:5000/api/publish/pages | head -c 200
   curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5000/
   curl -fsS -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:5001/?id=<发布页ID>"
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002   # 期望失败/000
   ```

4. 浏览器验收：编辑器保存/发布、渲染器加载、可编辑文本、自定义图标；
   Network 中接口应为同源 `:5000/api` 或 `:5001/api`。
5. 防火墙调整（firewalld 示例；端口按 `.env` 实际值替换）：

   ```bash
   sudo firewall-cmd --permanent --add-port=5000/tcp --add-port=5001/tcp
   sudo firewall-cmd --permanent --remove-port=3002/tcp
   sudo firewall-cmd --reload
   sudo firewall-cmd --list-ports
   ```

   ufw 环境：

   ```bash
   sudo ufw allow 5000/tcp
   sudo ufw allow 5001/tcp
   sudo ufw delete allow 3002/tcp
   sudo ufw status
   ```

### 7.4 保留与回滚到旧部署

- 旧仓库目录、Nginx 配置、systemd unit、`pre-docker-*` 数据库备份至少保留 7 天。
- 回滚步骤：

  ```bash
  cd /opt/mvp_vue-docker
  docker compose down

  # 可选：把 Docker 期间产生的新数据带回旧部署（结构为增量，旧版本可读）
  sudo cp data/dev.db /opt/mvp_vue/packages/server/prisma/dev.db
  sudo chown mvp:mvp /opt/mvp_vue/packages/server/prisma/dev.db

  sudo systemctl enable --now mvp-server

  # 情况 A：
  sudo systemctl enable --now nginx
  # 情况 B：恢复站点配置后重载
  sudo mv /root/mvp-vue.site.bak /etc/nginx/sites-enabled/mvp-vue
  sudo nginx -t && sudo systemctl reload nginx
  ```

- **禁止新旧同时运行**：同一 SQLite 文件多写者 + 端口冲突。
- 回滚后再次切换时，重新执行 7.1–7.3。

### 7.5 修改宿主机端口（无需重建镜像）

1. 编辑部署目录 `.env`：

   ```env
   EDITOR_PORT=9080
   RENDERER_PORT=9081
   ```

2. 重启容器：

   ```bash
   docker compose up -d
   ```

   `web` 容器会重新生成 `runtime-config.js`，Editor 的「打开渲染器」自动使用新端口。
3. 防火墙放行新端口、关闭旧端口。
4. 验收：`http://<IP>:9080`、`http://<IP>:9081/?id=...`，以及编辑器右上角打开渲染器。
5. 注意：**不要同时修改容器内端口**；容器内固定 5000/5001 是设计约束，
   宿主映射即可解决端口冲突。

### 7.6 日常升级

1. 构建机产出新 tag 发布包并传输到目标机。
2. `./scripts/upgrade.sh mvp-vue-<new-tag>.tar.gz`：
   - 对当前运行中的 `api` 执行一次数据库备份
   - `docker load` 新镜像
   - 更新 `.env` 的 `TAG`
   - `docker compose up -d`（滚动替换容器）
   - 健康检查；失败时输出 `./scripts/rollback.sh <old-tag>` 提示
3. 旧镜像保留，确认稳定后再手动清理。

### 7.7 Docker 内回滚

```bash
./scripts/rollback.sh <old-tag>
```

- 将 `.env` 的 `TAG` 改为旧 tag，`docker compose up -d`。
- 数据库结构变更均为增量（`ensureDatabaseSchema`），旧版本可继续读取。

## 8. 备份与恢复

- **在线一致性备份**：在 `api` 容器内执行
  `sqlite3 /data/dev.db ".backup '/backups/dev-<时间戳>.db'"`，
  避免直接复制在 WAL 模式下产生不一致。
- 备份目录：宿主 `./backups`，通过可写挂载映射到容器 `/backups`。
- 保留策略：默认 30 天，`backup-db.sh` 启动时清理过期文件。
- 定时任务：`install-cron.sh` 安装每日 02:17 的 cron，日志写入 `backups/backup.log`。
- 恢复：`restore-db.sh <备份文件>` → 停止 `api` → 覆盖 `data/dev.db` → 启动并健康检查。

## 9. 验收标准

| 项 | 验证方式 |
|----|----------|
| 镜像可离线导入 | 断网目标机 `docker load` 成功 |
| 访问方式不变 | `http://<IP>:5000`、`http://<IP>:5001/?id=<发布页ID>` 可打开 |
| 端口可配置 | 修改 `.env` 的 `EDITOR_PORT`/`RENDERER_PORT` 后 `up -d`，新端口可访问且 Editor 链接正确 |
| 旧服务已停 | `systemctl is-active mvp-server` 为 inactive；`ss` 无 3002 监听；旧 5000/5001 已释放 |
| 同源 API | 浏览器 Network 中接口为 `http://<IP>:5000/api/...` 或 `:5001/api/...`，无 3002 |
| 3002 不暴露 | 宿主 `curl http://<IP>:3002` 失败；容器间正常 |
| 数据保留 | 迁移后草稿页、发布页、自定义图标、可编辑文本均存在 |
| 持久化 | 重启/`up -d` 后新增数据仍在 |
| 升级与回滚 | 新 tag 部署成功；回滚旧 tag 后服务可用 |
| 备份 | 手动与 cron 均生成一致的 `.db` 文件，可通过恢复脚本还原 |
| 严格策略 | `docker compose exec api env` 含 `PAGE_POLICY=strict` |

## 10. 风险与限制

- **架构**：镜像按 `linux/amd64` 构建；目标为 arm64 时需重构建（发布包不可混用）。
- **磁盘/传输**：镜像 tar 预计 300–500 MB。
- **权限**：`./data` 需允许容器用户（uid 1000）写入；部署脚本检测并提示。
- **SQLite 单实例**：禁止对 `api` 扩容多副本或共享 NFS。
- **外网依赖**：地图 GeoJSON 经 API 代理访问 `geo.datav.aliyun.com`；目标机完全离线时地图数据不可用（与 Docker 无关）。
- **旧服务并存**：旧 systemd/nginx 与新 compose 不得同时占用 5000/5001。

## 11. 交付文件

```text
deploy/docker/
├── Dockerfile.web
├── Dockerfile.api
├── entrypoint-web.sh
├── runtime-config.js.template
├── nginx/
│   ├── editor.conf
│   └── renderer.conf
├── docker-compose.yml
├── .env.example
├── build.sh
├── package.sh
├── scripts/
│   ├── upgrade.sh
│   ├── rollback.sh
│   ├── backup-db.sh
│   ├── restore-db.sh
│   └── install-cron.sh
└── README.md
.dockerignore
```

并更新：

- `packages/server/prisma/schema.prisma`
- `packages/server/src/index.ts`
- `packages/server/prisma/.env`（本地默认值，非敏感）
- `packages/editor/index.html`
- `packages/editor/src/config.ts`
- `.gitignore`
- 根 `README.md`（增加 Docker 部署入口）
