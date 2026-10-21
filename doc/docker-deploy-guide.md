# Docker 部署操作手册（离线双镜像）

- 适用版本：2026-10-21 起的 Docker 方案
- 设计说明：[docker-deploy-design.md](docker-deploy-design.md)
- 实现计划：[docker-deploy-plan.md](docker-deploy-plan.md)
- 快速参考：[deploy/docker/README.md](../deploy/docker/README.md)

本手册覆盖：**新机器首次部署**、**从现有非 Docker 部署迁移**、**日常程序升级**、**回滚**、**备份恢复**、**端口调整**。

---

## 0. 两台机器的分工

| 角色 | 环境要求 | 是否联网 | 做什么 |
|------|----------|----------|--------|
| 构建机 | 本仓库代码、Docker（BuildKit）、bash（Windows 用 Git Bash） | **需要**（拉取 node/nginx 基础镜像与依赖） | 构建并打包，产出一个 `.tar.gz` |
| 目标机 | Linux + Docker Engine + Compose v2 | **不需要** | 解包、`docker load`、启动容器 |

目标机不需要安装 Node、pnpm 或 Nginx，也不需要拉取任何镜像。

检查目标机：

```bash
docker version
docker compose version      # 必须是 v2，命令形式为 "docker compose"
```

若普通用户执行 `docker` 提示无权限，把用户加入 docker 组后重新登录：

```bash
sudo usermod -aG docker "$USER"
```

> 镜像默认按 `linux/amd64` 构建。目标机为 arm64 时，构建时加 `PLATFORM=linux/arm64`，且发布包不能与 amd64 混用。

---

## 1. 构建机：生成发布包

在仓库根目录执行：

```bash
cd ~/prj/mvp_vue

TAG=20261021-1 ./deploy/docker/build.sh
TAG=20261021-1 ./deploy/docker/package.sh
```

- `TAG` 规则：`YYYYMMDD-N`，同一天第 N 次发布（如 `20261021-1`、`20261021-2`）。升级与回滚都依赖它，**不要重复使用同一 tag**。
- `build.sh` 构建两个镜像：`mvp-vue-web:<TAG>`、`mvp-vue-api:<TAG>`。
- `package.sh` 生成发布包，**唯一需要传输到目标机的文件**：

```text
release/mvp-vue-<TAG>.tar.gz
```

发布包内容：

```text
mvp-vue-<TAG>/
├── images.tar.gz          # 两个镜像的 docker save 结果
├── docker-compose.yml
├── .env.example
├── release.env            # 记录本次 TAG
├── README.md
└── scripts/
    ├── upgrade.sh
    ├── rollback.sh
    ├── backup-db.sh
    ├── restore-db.sh
    └── install-cron.sh
```

传输方式不限（scp / U 盘 / 内网文件服务）。

---

## 2. 新机器首次部署（无旧数据）

以下命令在目标机执行，示例部署目录为 `/opt/mvp_vue-docker`。

### 2.1 解包

```bash
sudo mkdir -p /opt/mvp_vue-docker
sudo tar -xzf mvp-vue-20261021-1.tar.gz -C /opt/mvp_vue-docker --strip-components=1
cd /opt/mvp_vue-docker
```

### 2.2 初始化配置与目录

```bash
sudo cp .env.example .env
sudo mkdir -p data backups
```

编辑 `.env`（通常只需确认端口与策略）：

```env
TAG=20261021-1            # upgrade.sh 会自动覆盖为实际版本
EDITOR_PORT=5000          # 宿主机端口，可改
RENDERER_PORT=5001        # 宿主机端口，可改
PAGE_POLICY=strict        # 与前端 strict 构建成对使用
TZ=Asia/Shanghai
RETENTION_DAYS=30
```

准备权限：容器内进程以 uid 1000 运行，`data`、`backups` 必须可写。

```bash
sudo chown -R 1000:1000 data backups
```

### 2.3 预加载镜像（可选，建议在切换窗口前完成）

```bash
sudo ./scripts/upgrade.sh --prepare
```

只执行 `docker load` 与 `docker compose config` 校验，不启动容器。输出 `镜像已导入，配置校验通过（未启动容器）` 即成功。

### 2.4 启动

```bash
sudo ./scripts/upgrade.sh
```

脚本会依次：导入镜像 → 更新 `.env` 的 `TAG` → `docker compose up -d --wait` → 健康检查。
全新空库会自动建表（`PageDraft`、`PagePublished`、`CustomIcon`、`EditableText`），无需手动初始化。

### 2.5 验收

```bash
docker compose ps                       # api、web 均应为 healthy
curl -fsS http://127.0.0.1:5000/api/publish/pages    # 期望返回 []
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5000/   # 200
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5001/   # 200
curl -fsS http://127.0.0.1:5000/runtime-config.js    # 含 rendererPort
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002      # 期望失败（000/7）
```

浏览器：访问 `http://<IP>:5000`，新建并发布一个页面，再用
`http://<IP>:5001/?id=<发布页ID>` 打开。Network 中接口应为同源 `:5000/api/...` 或 `:5001/api/...`。

### 2.6 防火墙

```bash
# firewalld
sudo firewall-cmd --permanent --add-port=5000/tcp --add-port=5001/tcp
sudo firewall-cmd --permanent --remove-port=3002/tcp
sudo firewall-cmd --reload

# 或 ufw
sudo ufw allow 5000/tcp
sudo ufw allow 5001/tcp
sudo ufw delete allow 3002/tcp
```

### 2.7 自动备份

```bash
sudo ./scripts/install-cron.sh
```

安装每日 02:17 的备份任务，日志写入 `backups/backup.log`，默认保留 30 天（`RETENTION_DAYS`）。

---

## 3. 从现有非 Docker 部署迁移

前提：现有部署为 Nginx + systemd API（3002）+ `packages/server/prisma/dev.db`。

### 3.1 切换窗口前（旧服务照常运行）

```bash
# 1) 解包到新目录
sudo mkdir -p /opt/mvp_vue-docker
sudo tar -xzf mvp-vue-20261021-1.tar.gz -C /opt/mvp_vue-docker --strip-components=1
cd /opt/mvp_vue-docker
sudo cp .env.example .env
sudo mkdir -p data backups backups/legacy

# 2) 在线一致性备份旧库（推荐）
sqlite3 /opt/mvp_vue/packages/server/prisma/dev.db \
  ".backup '/opt/mvp_vue-docker/backups/legacy/pre-docker-$(date +%F-%H%M).db'"

# 3) 预加载镜像
sudo ./scripts/upgrade.sh --prepare
```

宿主机没有 `sqlite3` 时，改为在停旧 API 后直接复制 `dev.db`（以及可能存在的 `dev.db-wal`、`dev.db-shm`）。

### 3.2 切换窗口：停止旧服务

顺序必须是 **先停 API（停止写入），再停/摘 Nginx（释放端口）**。只停用、不删除，保留回滚能力。

```bash
# 停止旧 API
sudo systemctl stop mvp-server
systemctl is-active mvp-server          # 期望 inactive
ss -lntp | grep ':3002' || echo '3002 free'
```

Nginx 按实际情况二选一：

```bash
# 情况 A：Nginx 只服务本项目
sudo systemctl stop nginx
sudo systemctl disable nginx

# 情况 B：Nginx 还服务其它站点，只摘除本项目配置
# Debian/Ubuntu
sudo mv /etc/nginx/sites-enabled/mvp-vue /root/mvp-vue.site.bak
sudo nginx -t && sudo systemctl reload nginx
# RHEL/CentOS
sudo mv /etc/nginx/conf.d/mvp-*.conf /root/
sudo nginx -t && sudo systemctl reload nginx
```

确认端口释放：

```bash
ss -lntp | grep -E ':(5000|5001|8080|8081)\b' || echo 'web ports free'
pgrep -af 'vite preview|packages/server/dist/index.js'   # 如有试运行进程，确认后停止
```

禁止旧服务开机自启（保留 unit，便于回滚）：

```bash
sudo systemctl disable mvp-server
```

### 3.3 迁移数据库并启动

```bash
cd /opt/mvp_vue-docker

# 使用 3.1 的在线备份；或复制旧库
sudo cp backups/legacy/pre-docker-*.db data/dev.db
sudo chown -R 1000:1000 data backups

sudo ./scripts/upgrade.sh
```

按 §2.5、§2.6、§2.7 完成验收、防火墙与定时备份。

### 3.4 保留与回滚到旧部署

旧目录、Nginx 配置、systemd unit、`pre-docker-*` 备份至少保留 7 天。

```bash
cd /opt/mvp_vue-docker
sudo docker compose down

# 可选：把 Docker 期间的新数据带回旧部署（表结构为增量，旧版本可读）
sudo cp data/dev.db /opt/mvp_vue/packages/server/prisma/dev.db
sudo chown mvp:mvp /opt/mvp_vue/packages/server/prisma/dev.db

sudo systemctl enable --now mvp-server
# 情况 A
sudo systemctl enable --now nginx
# 情况 B：恢复站点配置
sudo mv /root/mvp-vue.site.bak /etc/nginx/sites-enabled/mvp-vue
sudo nginx -t && sudo systemctl reload nginx
```

**禁止新旧部署同时运行**：同一 SQLite 文件多写者 + 端口冲突。

---

## 4. 日常程序升级

### 4.1 构建机

```bash
cd ~/prj/mvp_vue
TAG=20261022-1 ./deploy/docker/build.sh
TAG=20261022-1 ./deploy/docker/package.sh
```

把 `release/mvp-vue-20261022-1.tar.gz` 传到目标机。

### 4.2 目标机

```bash
cd /opt/mvp_vue-docker
sudo ./scripts/upgrade.sh mvp-vue-20261022-1.tar.gz
```

脚本自动完成：

1. 解包（覆盖 compose、`.env.example`、`scripts/`；**保留 `.env`、`data/`、`backups/`**）
2. 对运行中的 `api` 执行一次数据库备份
3. `docker load` 新镜像
4. 更新 `.env` 中的 `TAG`
5. `docker compose up -d --wait`，失败时提示回滚命令

### 4.3 升级后验收

```bash
docker compose ps
docker compose logs --tail=100 api
curl -fsS http://127.0.0.1:5000/api/publish/pages | head -c 200
```

浏览器抽查：编辑器打开/保存/发布、渲染器加载、可编辑文本、自定义图标。

### 4.4 清理旧镜像

确认新版本稳定后再清理：

```bash
docker images | grep mvp-vue
docker rmi mvp-vue-web:<更旧的tag> mvp-vue-api:<更旧的tag>
```

建议至少保留上一个版本的镜像，以便随时回滚。

---

## 5. 回滚

```bash
cd /opt/mvp_vue-docker
sudo ./scripts/rollback.sh 20261021-1
```

将 `.env` 的 `TAG` 切回旧版本并重启容器，不修改数据库。
数据库结构变更均为增量（应用启动时补表），旧版本可以继续读取。

回滚后如确认无问题，再排查新版本的问题。

---

## 6. 备份与恢复

### 6.1 手动备份

```bash
cd /opt/mvp_vue-docker
sudo ./scripts/backup-db.sh
ls -lh backups/
```

生成 `backups/dev-<时间戳>.db`，使用 SQLite 在线 `.backup`，WAL 模式下也保持一致。

### 6.2 恢复

```bash
sudo ./scripts/restore-db.sh backups/dev-YYYYmmdd-HHMMSS.db
```

脚本会先自动备份当前库（`pre-restore-*`），再停止 `api`、覆盖 `data/dev.db`、重新启动并做健康检查。

### 6.3 目录说明

| 路径 | 内容 |
|------|------|
| `data/dev.db` | 实际运行数据库 |
| `backups/dev-*.db` | 定时/手动备份 |
| `backups/backup.log` | cron 备份日志 |
| `backups/legacy/` | 迁移前旧部署备份（建议） |

---

## 7. 修改宿主机端口

容器内端口固定为 5000/5001，只调整宿主机映射，无需重新构建镜像。

```bash
cd /opt/mvp_vue-docker
sudo vi .env
```

```env
EDITOR_PORT=9080
RENDERER_PORT=9081
```

```bash
sudo docker compose up -d
curl -fsS http://127.0.0.1:9080/runtime-config.js   # 应含 rendererPort: "9081"
```

`web` 容器启动时会重新生成 `runtime-config.js`，编辑器右上角「打开渲染器」自动使用新端口。
随后调整防火墙放行新端口、关闭旧端口。

---

## 8. 常见问题

| 现象 | 排查 |
|------|------|
| `docker compose ps` 中 api 不健康 | `docker compose logs api`；确认 `data/` 可写、`TAG` 对应的镜像已 load |
| 页面 502 | 查看 `docker compose logs web`；Nginx 依赖 api 健康状态启动 |
| `data` 权限错误 | `sudo chown -R 1000:1000 data backups` |
| 端口被占用 | `ss -lntp \| grep -E ':(5000\|5001)\b'`，停旧服务或修改 `.env` |
| 升级启动失败 | 按提示执行 `./scripts/rollback.sh <old-tag>` |
| 编辑器打开渲染器仍用旧端口 | 改 `.env` 后执行 `docker compose up -d`，确认浏览器未缓存 `runtime-config.js`（该文件已设置 `no-store`） |
| 目标机完全离线时地图空白 | 地图 GeoJSON 经 API 代理访问 `geo.datav.aliyun.com`，离线环境不可用（与 Docker 无关） |

---

## 9. 与非 Docker 部署方式的关系

本次改动**不影响**「本地 build 后复制 dist + systemd + Nginx」的部署方式：

| 改动 | 对非 Docker 部署的影响 |
|------|------------------------|
| Prisma 数据源改用 `DATABASE_URL` | `packages/server/prisma/.env` 提供 `file:./dev.db`，Prisma CLI 行为不变；应用启动未设置时自动回落，数据库仍是 `packages/server/prisma/dev.db` |
| 启动时自动补表 | 全部为 `CREATE TABLE IF NOT EXISTS`，已有库无变化；空库首次启动会自动建表 |
| 编辑器引入 `/runtime-config.js` | `public/runtime-config.js` 构建时复制进 dist，内容为空对象；渲染器地址仍默认 `http://<当前主机名>:5001`，与改动前一致；设置了 `VITE_RENDERER_BASE` 时仍优先使用该值 |
| 新增 `.dockerignore` / `deploy/docker` | 仅在执行 Docker 构建时生效 |

非 Docker 部署继续按原流程：

```bash
pnpm build                # 或 VITE_API_BASE=http://<服务器IP>:3002 pnpm build
pnpm build:server
# 复制 packages/editor/dist、packages/renderer/dist 到 Nginx 目录
# systemd 启动 packages/server/dist/index.js，数据库仍在 packages/server/prisma/dev.db
```

注意两点：

1. 复制 dist 时请复制**整个目录**（含 `runtime-config.js`）。即使漏掉该文件，也只会产生一个 404 请求，功能不受影响。
2. 如果非 Docker 部署使用 8080/8081，且未设置 `VITE_RENDERER_BASE`，编辑器「打开渲染器」仍默认指向 5001——这是改动前已有的行为，与 Docker 无关；需要时在构建时设置 `VITE_RENDERER_BASE=http://<IP>:8081`。

同一台机器上，**Docker 与非 Docker 部署不要同时运行**（端口与 SQLite 写入冲突）。
