# mvp_vue Docker 部署（离线）

默认访问：Editor `http://<IP>:5000`，Renderer `http://<IP>:5001/?id=<发布页ID>`。
API 不对外暴露，由 Nginx 同源 `/api/` 反代。

## 构建机（可联网）

```bash
TAG=20261021-1 ./deploy/docker/build.sh
TAG=20261021-1 ./deploy/docker/package.sh
# 产物：release/mvp-vue-20261021-1.tar.gz
```

## 目标机（离线）

首次部署前准备数据目录，并把旧库放到 `data/dev.db`：

```bash
tar -xzf mvp-vue-20261021-1.tar.gz
cd mvp-vue-20261021-1
cp .env.example .env
mkdir -p data backups
# 将旧部署的 dev.db 复制到 data/dev.db
chown -R 1000:1000 data backups   # 如使用非 root 部署用户且目录属主不同
./scripts/upgrade.sh
```

升级：

```bash
./scripts/upgrade.sh mvp-vue-<new-tag>.tar.gz
```

回滚（镜像需仍在本机）：

```bash
./scripts/rollback.sh <old-tag>
```

备份与恢复：

```bash
./scripts/backup-db.sh
./scripts/install-cron.sh        # 每日 02:17 自动备份，保留 30 天
./scripts/restore-db.sh backups/dev-YYYYmmdd-HHMMSS.db
```

## 修改宿主机端口

编辑 `.env` 的 `EDITOR_PORT` / `RENDERER_PORT`，执行 `docker compose up -d`。
容器内端口固定为 5000/5001，无需重建镜像。

## 停止旧部署（切换窗口）

先停 API，再停或摘除 Nginx，确认端口释放后启动 Docker。完整步骤见
`doc/docker-deploy-design.md` §7.2。禁止新旧部署同时运行。

## 常见问题

- **端口被占用**：`ss -lntp | grep -E ':(5000|5001|8080|8081)\b'`，停掉旧服务或改 `.env`。
- **502**：`docker compose ps` 检查 api 健康状态；`docker compose logs api`。
- **权限错误**：`sudo chown -R 1000:1000 data backups`。
