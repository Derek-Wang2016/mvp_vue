# Docker 离线部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 mvp_vue 从「Nginx + systemd + SQLite」部署迁移为可离线交付的 Docker Compose 部署，保留 5000/5001 访问方式、现有数据、版本回滚与数据库备份能力。

**Architecture:** 两个镜像：`mvp-vue-web`（Nginx 托管 Editor/Renderer，5000/5001，同源 `/api` 反代）与 `mvp-vue-api`（Node 20 + Fastify + Prisma）。API 不发布宿主端口，SQLite 位于宿主 `./data/dev.db`。构建机联网产出镜像 tar，目标机离线 `docker load`。

**Tech Stack:** Docker / Docker Compose v2、Nginx 1.27 Alpine、Node.js 20、pnpm 10.14、Prisma 5.22、SQLite、Bash。

> 说明：本次改动均为部署配置与少量启动配置代码，没有业务逻辑单测可写；每个任务以**构建、脚本语法检查、容器运行验证**作为验收。所有提交步骤需用户明确同意后执行，默认只修改文件。

---

## 文件结构

**修改：**
- `packages/server/prisma/schema.prisma` — 数据源改用 `DATABASE_URL`
- `packages/server/src/index.ts` — 本地开发回落到 `file:./dev.db`
- `packages/server/src/ensureDatabaseSchema.ts` — 增加基线建表步骤
- `packages/editor/index.html` — 引入运行时配置
- `packages/editor/src/config.ts` — 读取运行时渲染器端口
- `.gitignore` — 放行 Prisma 本地 `.env`，忽略 Docker 运行数据
- `README.md` — 增加 Docker 部署入口

**新增：**
- `packages/server/prisma/.env` — 本地 Prisma CLI 默认数据源（非敏感）
- `packages/editor/public/runtime-config.js` — 开发态默认运行时配置
- `.dockerignore`
- `deploy/docker/Dockerfile.web`
- `deploy/docker/Dockerfile.api`
- `deploy/docker/nginx/editor.conf`
- `deploy/docker/nginx/renderer.conf`
- `deploy/docker/entrypoint-web.sh`
- `deploy/docker/runtime-config.js.template`
- `deploy/docker/docker-compose.yml`
- `deploy/docker/.env.example`
- `deploy/docker/build.sh`
- `deploy/docker/package.sh`
- `deploy/docker/scripts/{upgrade.sh,rollback.sh,backup-db.sh,restore-db.sh,install-cron.sh}`
- `deploy/docker/README.md`

---

### Task 1: 数据库路径改为可配置

**Files:**
- Modify: `packages/server/prisma/schema.prisma`
- Modify: `packages/server/src/index.ts:1-30`
- Create: `packages/server/prisma/.env`
- Modify: `.gitignore`

- [ ] **Step 1: 修改 Prisma 数据源**

`packages/server/prisma/schema.prisma` 第 5-8 行改为：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: 本地开发回落默认库路径**

`packages/server/src/index.ts` 在 import 之后、`const app = Fastify(...)` 之前加入：

```ts
// 本地开发未设置 DATABASE_URL 时沿用原来的 prisma/dev.db
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}
```

- [ ] **Step 3: 为 Prisma CLI 提供本地默认值**

新建 `packages/server/prisma/.env`：

```env
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 4: 放行该文件**

在 `.gitignore` 的环境变量段末尾追加：

```gitignore
# Prisma 本地默认数据源（非敏感）
!packages/server/prisma/.env
```

再追加 Docker 运行数据忽略项：

```gitignore
# Docker 部署本地数据与发布产物
deploy/docker/.env
deploy/docker/data/
deploy/docker/backups/
release/
```

- [ ] **Step 5: 验证 schema 与 ignore 规则**

```bash
cd packages/server
DATABASE_URL="file:./dev.db" pnpm exec prisma validate
cd ../..
git check-ignore -v packages/server/prisma/.env
```

Expected：`prisma validate` 输出 `The schema at prisma/schema.prisma is valid 🚀`；`git check-ignore` 无输出（表示未被忽略）。

- [ ] **Step 6: 验证构建**

```bash
pnpm build:server
```

Expected：退出码 0，`packages/server/dist/index.js` 更新。

- [ ] **Step 7: 提交（需用户确认）**

```bash
git add packages/server/prisma/schema.prisma packages/server/prisma/.env \
  packages/server/src/index.ts .gitignore
git commit -m "feat(server): 数据源改为 DATABASE_URL，支持 Docker 挂载"
```

---

### Task 2: 空库自动建表

**Files:**
- Modify: `packages/server/src/ensureDatabaseSchema.ts:8-17`

- [ ] **Step 1: 增加基线建表步骤**

在 `STEPS` 数组最前面加入三个步骤（保持已有 `2026-10-20-editable-text` 不变）：

```ts
const STEPS: { id: string; sql: string }[] = [
  {
    id: '2026-10-21-baseline-page-draft',
    sql: `CREATE TABLE IF NOT EXISTS "PageDraft" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "schemaJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
  },
  {
    id: '2026-10-21-baseline-page-published',
    sql: `CREATE TABLE IF NOT EXISTS "PagePublished" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "schemaJson" TEXT NOT NULL,
      "sourceDraftId" INTEGER,
      "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
  {
    id: '2026-10-21-baseline-custom-icon',
    sql: `CREATE TABLE IF NOT EXISTS "CustomIcon" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "svgContent" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
  },
  {
    id: '2026-10-20-editable-text',
    sql: `CREATE TABLE IF NOT EXISTS "EditableText" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "content" TEXT NOT NULL DEFAULT '',
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  },
]
```

- [ ] **Step 2: 构建**

```bash
pnpm build:server
```

Expected：退出码 0。

- [ ] **Step 3: 用临时空库验证自动建表**

```bash
cd packages/server
rm -f verify.db verify.db-journal verify.db-wal verify.db-shm
DATABASE_URL="file:./verify.db" node --input-type=module -e "
import { PrismaClient } from '@prisma/client'
import { ensureDatabaseSchema } from './dist/ensureDatabaseSchema.js'
const prisma = new PrismaClient()
const applied = await ensureDatabaseSchema(prisma)
const tables = await prisma.\$queryRawUnsafe(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\")
console.log('applied:', applied)
console.log('tables:', tables)
await prisma.\$disconnect()
"
rm -f verify.db verify.db-journal verify.db-wal verify.db-shm
```

Expected：`tables` 包含 `CustomIcon`、`EditableText`、`PageDraft`、`PagePublished`、`SchemaMigration`。

- [ ] **Step 4: 提交（需用户确认）**

```bash
git add packages/server/src/ensureDatabaseSchema.ts
git commit -m "feat(server): 启动时自动创建基线数据表"
```

---

### Task 3: Editor 运行时渲染器端口

**Files:**
- Create: `packages/editor/public/runtime-config.js`
- Modify: `packages/editor/index.html`
- Modify: `packages/editor/src/config.ts:7-11`

- [ ] **Step 1: 创建开发态默认配置**

新建 `packages/editor/public/runtime-config.js`：

```js
window.__MVP_RUNTIME__ = {}
```

- [ ] **Step 2: 在入口 HTML 引入**

`packages/editor/index.html` 在 `<div id="app"></div>` 之后、入口脚本之前加入：

```html
    <script src="/runtime-config.js"></script>
```

- [ ] **Step 3: 修改渲染器地址解析**

`packages/editor/src/config.ts` 中 `getRendererBase` 改为：

```ts
type RuntimeConfig = { rendererPort?: string | number }

function getRuntimeConfig(): RuntimeConfig {
  return (window as unknown as { __MVP_RUNTIME__?: RuntimeConfig }).__MVP_RUNTIME__ ?? {}
}

export function getRendererBase(): string {
  const env = import.meta.env.VITE_RENDERER_BASE as string | undefined
  if (env) return env.replace(/\/$/, '')

  const runtimePort = getRuntimeConfig().rendererPort
  if (runtimePort) {
    return `${window.location.protocol}//${window.location.hostname}:${runtimePort}`
  }

  return `http://${window.location.hostname}:5001`
}
```

- [ ] **Step 4: 构建并检查产物**

```bash
pnpm -F @mvp-vue/editor build
grep -n "runtime-config.js" packages/editor/dist/index.html
test -f packages/editor/dist/runtime-config.js && echo "runtime-config ok"
grep -l "__MVP_RUNTIME__" packages/editor/dist/assets/*.js
```

Expected：`dist/index.html` 含 `runtime-config.js`；`dist/runtime-config.js` 存在；至少一个 assets 文件匹配 `__MVP_RUNTIME__`。

- [ ] **Step 5: 提交（需用户确认）**

```bash
git add packages/editor/index.html packages/editor/public/runtime-config.js \
  packages/editor/src/config.ts
git commit -m "feat(editor): 运行时注入渲染器端口"
```

---

### Task 4: Docker 镜像与 Nginx 配置

**Files:**
- Create: `.dockerignore`
- Create: `deploy/docker/Dockerfile.web`
- Create: `deploy/docker/Dockerfile.api`
- Create: `deploy/docker/nginx/editor.conf`
- Create: `deploy/docker/nginx/renderer.conf`
- Create: `deploy/docker/entrypoint-web.sh`
- Create: `deploy/docker/runtime-config.js.template`

- [ ] **Step 1: 创建 `.dockerignore`**

```text
.git
.gitignore
node_modules
**/node_modules
**/dist
**/*.tsbuildinfo
data
backups
release
.tmp-deploy
.claude
.cursor
doc
*.log
.env
.env.*
!.env.example
!packages/editor/.env.production.example
!packages/renderer/.env.production.example
packages/server/prisma/*.db
packages/server/prisma/*.db-*
```

- [ ] **Step 2: 创建 `Dockerfile.web`**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@10.14.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/schema/package.json packages/schema/
COPY packages/editor/package.json packages/editor/
COPY packages/renderer/package.json packages/renderer/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile

COPY packages/schema packages/schema
COPY packages/editor packages/editor
COPY packages/renderer packages/renderer

ARG VITE_API_BASE=/
ARG VITE_PAGE_POLICY=strict
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_PAGE_POLICY=$VITE_PAGE_POLICY

RUN pnpm -F @mvp-vue/schema build && pnpm build

FROM nginx:1.27-alpine
RUN apk add --no-cache gettext

COPY deploy/docker/nginx/editor.conf /etc/nginx/conf.d/default.conf
COPY deploy/docker/nginx/renderer.conf /etc/nginx/conf.d/renderer.conf
COPY --from=build /app/packages/editor/dist/ /usr/share/nginx/html/editor/
COPY --from=build /app/packages/renderer/dist/ /usr/share/nginx/html/renderer/
COPY deploy/docker/runtime-config.js.template /etc/mvp/runtime-config.js.template
COPY deploy/docker/entrypoint-web.sh /entrypoint-web.sh
RUN chmod +x /entrypoint-web.sh

ENV RENDERER_PORT=5001
EXPOSE 5000 5001
ENTRYPOINT ["/entrypoint-web.sh"]
```

- [ ] **Step 3: 创建 `Dockerfile.api`**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.14.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/schema/package.json packages/schema/
COPY packages/server/package.json packages/server/
COPY packages/editor/package.json packages/editor/
COPY packages/renderer/package.json packages/renderer/
RUN pnpm install --frozen-lockfile

COPY packages/schema packages/schema
COPY packages/server packages/server

ENV DATABASE_URL=file:/tmp/build.db
RUN pnpm -F @mvp-vue/schema build \
 && pnpm -F @mvp-vue/server exec prisma generate \
 && pnpm -F @mvp-vue/server build \
 && pnpm --filter @mvp-vue/server deploy --prod --legacy /out \
 && cd /app/packages/server \
 && ./node_modules/.bin/prisma generate --schema=/out/prisma/schema.prisma

FROM node:20-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates sqlite3 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/ ./
RUN mkdir -p /data /backups \
 && chown -R node:node /app /data /backups

USER node
ENV NODE_ENV=production \
    DATABASE_URL=file:/data/dev.db \
    PAGE_POLICY=strict
EXPOSE 3002
CMD ["node", "dist/index.js"]
```

- [ ] **Step 4: 创建 Nginx 配置**

`deploy/docker/nginx/editor.conf`：

```nginx
server {
    listen 5000;
    server_name _;

    root /usr/share/nginx/html/editor;
    index index.html;
    client_max_body_size 20m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;

    resolver 127.0.0.11 valid=10s ipv6=off;
    set $api_upstream http://api:3002;

    location /api/ {
        proxy_pass $api_upstream$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location = /runtime-config.js {
        add_header Cache-Control "no-store";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

`deploy/docker/nginx/renderer.conf`：

```nginx
server {
    listen 5001;
    server_name _;

    root /usr/share/nginx/html/renderer;
    index index.html;
    client_max_body_size 20m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;

    resolver 127.0.0.11 valid=10s ipv6=off;
    set $api_upstream http://api:3002;

    location /api/ {
        proxy_pass $api_upstream$request_uri;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 5: 创建入口脚本与模板**

`deploy/docker/runtime-config.js.template`：

```js
window.__MVP_RUNTIME__ = { rendererPort: "${RENDERER_PORT}" };
```

`deploy/docker/entrypoint-web.sh`：

```sh
#!/bin/sh
set -eu

: "${RENDERER_PORT:=5001}"
export RENDERER_PORT

envsubst '${RENDERER_PORT}' \
  < /etc/mvp/runtime-config.js.template \
  > /usr/share/nginx/html/editor/runtime-config.js

exec nginx -g 'daemon off;'
```

- [ ] **Step 6: 构建镜像**

```bash
docker build --platform linux/amd64 -f deploy/docker/Dockerfile.web -t mvp-vue-web:dev .
docker build --platform linux/amd64 -f deploy/docker/Dockerfile.api -t mvp-vue-api:dev .
```

Expected：两个镜像构建成功。

- [ ] **Step 7: 镜像内检查**

```bash
docker run --rm --entrypoint nginx mvp-vue-web:dev -t
docker run --rm --entrypoint sh mvp-vue-api:dev -c "sqlite3 --version && node -e \"import('@prisma/client').then(m => { new m.PrismaClient(); console.log('prisma ok') })\""
```

Expected：Nginx 输出 `syntax is ok` / `test is successful`；API 输出 sqlite3 版本与 `prisma ok`。

- [ ] **Step 8: 提交（需用户确认）**

```bash
git add .dockerignore deploy/docker
git commit -m "build(docker): 添加 web/api 镜像与 Nginx 配置"
```

---

### Task 5: Compose、发布与运维脚本

**Files:**
- Create: `deploy/docker/docker-compose.yml`
- Create: `deploy/docker/.env.example`
- Create: `deploy/docker/build.sh`
- Create: `deploy/docker/package.sh`
- Create: `deploy/docker/scripts/upgrade.sh`
- Create: `deploy/docker/scripts/rollback.sh`
- Create: `deploy/docker/scripts/backup-db.sh`
- Create: `deploy/docker/scripts/restore-db.sh`
- Create: `deploy/docker/scripts/install-cron.sh`
- Create: `deploy/docker/README.md`

- [ ] **Step 1: 创建 `docker-compose.yml`**

```yaml
name: mvp-vue

services:
  api:
    image: mvp-vue-api:${TAG:?TAG is required}
    restart: unless-stopped
    init: true
    environment:
      NODE_ENV: production
      DATABASE_URL: file:/data/dev.db
      PAGE_POLICY: ${PAGE_POLICY:-strict}
      TZ: ${TZ:-Asia/Shanghai}
    volumes:
      - ./data:/data
      - ./backups:/backups
    networks:
      - mvp
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:3002/api/publish/pages').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 20s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  web:
    image: mvp-vue-web:${TAG:?TAG is required}
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    environment:
      RENDERER_PORT: ${RENDERER_PORT:-5001}
    ports:
      - "${EDITOR_PORT:-5000}:5000"
      - "${RENDERER_PORT:-5001}:5001"
    networks:
      - mvp
    healthcheck:
      test:
        - CMD-SHELL
        - "wget -qO- http://127.0.0.1:5000/ > /dev/null || exit 1"
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 10s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

networks:
  mvp:
    driver: bridge
```

- [ ] **Step 2: 创建 `.env.example`**

```env
# 部署版本（由 scripts/upgrade.sh 自动更新）
TAG=20261021-1

# 宿主机端口（容器内固定 5000/5001）
EDITOR_PORT=5000
RENDERER_PORT=5001

# 页面策略：strict 或留空
PAGE_POLICY=strict

# 时区
TZ=Asia/Shanghai

# 备份保留天数
RETENTION_DAYS=30
```

- [ ] **Step 3: 创建构建与打包脚本**

`deploy/docker/build.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAG="${TAG:?用法: TAG=20261021-1 ./deploy/docker/build.sh}"
PLATFORM="${PLATFORM:-linux/amd64}"

cd "$ROOT"
docker build --platform "$PLATFORM" -f deploy/docker/Dockerfile.web -t "mvp-vue-web:$TAG" .
docker build --platform "$PLATFORM" -f deploy/docker/Dockerfile.api -t "mvp-vue-api:$TAG" .
echo "构建完成: mvp-vue-web:$TAG, mvp-vue-api:$TAG"
```

`deploy/docker/package.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAG="${TAG:?用法: TAG=20261021-1 ./deploy/docker/package.sh}"
NAME="mvp-vue-$TAG"
OUT="$ROOT/release/$NAME"

rm -rf "$OUT"
mkdir -p "$OUT/scripts"
cd "$ROOT"

docker save "mvp-vue-web:$TAG" "mvp-vue-api:$TAG" | gzip > "$OUT/images.tar.gz"
cp deploy/docker/docker-compose.yml "$OUT/"
cp deploy/docker/.env.example "$OUT/"
cp deploy/docker/README.md "$OUT/"
cp deploy/docker/scripts/*.sh "$OUT/scripts/"
printf 'TAG=%s\n' "$TAG" > "$OUT/release.env"

tar -C "$ROOT/release" -czf "$ROOT/release/$NAME.tar.gz" "$NAME"
echo "发布包: $ROOT/release/$NAME.tar.gz"
```

- [ ] **Step 4: 创建运维脚本**

`deploy/docker/scripts/upgrade.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INVOKE_DIR="$PWD"
cd "$DEPLOY_DIR"

MODE="deploy"
RELEASE=""
for arg in "$@"; do
  case "$arg" in
    --prepare) MODE="prepare" ;;
    *) RELEASE="$arg" ;;
  esac
done

if [[ -n "$RELEASE" ]]; then
  [[ "$RELEASE" = /* ]] || RELEASE="$INVOKE_DIR/$RELEASE"
  tar -xzf "$RELEASE" -C "$DEPLOY_DIR" --strip-components=1
fi

[[ -f images.tar.gz ]] || { echo "缺少 images.tar.gz" >&2; exit 1; }
[[ -f release.env ]] || { echo "缺少 release.env" >&2; exit 1; }
# shellcheck disable=SC1091
source release.env
[[ -n "${TAG:-}" ]] || { echo "release.env 缺少 TAG" >&2; exit 1; }

if [[ "$MODE" == "prepare" ]]; then
  docker load -i images.tar.gz
  docker compose --env-file .env.example config >/dev/null
  echo "镜像已导入，配置校验通过（未启动容器）"
  exit 0
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

mkdir -p data backups
if [[ ! -w data || ! -w backups ]]; then
  echo "目录不可写，请执行: sudo chown -R 1000:1000 \"$DEPLOY_DIR/data\" \"$DEPLOY_DIR/backups\"" >&2
  exit 1
fi

OLD_TAG="$(grep -E '^TAG=' .env | head -1 | cut -d= -f2- || true)"

if docker compose ps -q api 2>/dev/null | grep -q .; then
  echo "==> 升级前备份数据库"
  "$SCRIPT_DIR/backup-db.sh"
fi

echo "==> 导入镜像 $TAG"
docker load -i images.tar.gz

if grep -qE '^TAG=' .env; then
  sed -i "s/^TAG=.*/TAG=$TAG/" .env
else
  echo "TAG=$TAG" >> .env
fi

echo "==> 启动容器"
if ! docker compose up -d --wait --wait-timeout 180; then
  echo "启动失败。回滚命令：$SCRIPT_DIR/rollback.sh ${OLD_TAG:-<old-tag>}" >&2
  exit 1
fi

docker compose ps
echo "升级完成：$TAG"
```

`deploy/docker/scripts/rollback.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$DEPLOY_DIR"

TAG="${1:?用法: ./scripts/rollback.sh <tag>}"
[[ -f .env ]] || { echo "缺少 .env" >&2; exit 1; }

if grep -qE '^TAG=' .env; then
  sed -i "s/^TAG=.*/TAG=$TAG/" .env
else
  echo "TAG=$TAG" >> .env
fi

docker compose up -d --wait --wait-timeout 180
docker compose ps
echo "已切换到：$TAG"
```

`deploy/docker/scripts/backup-db.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$DEPLOY_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p backups
TS="$(date +%Y%m%d-%H%M%S)"
NAME="dev-$TS.db"

docker compose exec -T api sqlite3 /data/dev.db ".backup '/backups/$NAME'"
find backups -maxdepth 1 -type f -name 'dev-*.db' -mtime +"$RETENTION_DAYS" -delete
echo "备份完成: $DEPLOY_DIR/backups/$NAME"
```

`deploy/docker/scripts/restore-db.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$DEPLOY_DIR"

SRC="${1:?用法: ./scripts/restore-db.sh <备份文件>}"
[[ -f "$SRC" ]] || { echo "找不到备份文件: $SRC" >&2; exit 1; }

mkdir -p backups
if [[ -f data/dev.db ]]; then
  cp data/dev.db "backups/pre-restore-$(date +%Y%m%d-%H%M%S).db"
fi

echo "==> 停止 api"
docker compose stop api
cp "$SRC" data/dev.db
rm -f data/dev.db-wal data/dev.db-shm

echo "==> 启动 api"
docker compose up -d --wait --wait-timeout 120
echo "恢复完成: $SRC"
```

`deploy/docker/scripts/install-cron.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_LINE="17 2 * * * cd $DEPLOY_DIR && ./scripts/backup-db.sh >> $DEPLOY_DIR/backups/backup.log 2>&1"

mkdir -p "$DEPLOY_DIR/backups"
( crontab -l 2>/dev/null | grep -v 'scripts/backup-db.sh' || true; echo "$CRON_LINE" ) | crontab -
echo "已安装每日备份任务："
crontab -l | grep 'scripts/backup-db.sh'
```

- [ ] **Step 5: 设置脚本可执行权限**

```bash
chmod +x deploy/docker/build.sh deploy/docker/package.sh \
  deploy/docker/entrypoint-web.sh deploy/docker/scripts/*.sh
```

- [ ] **Step 6: 创建部署 README**

`deploy/docker/README.md`：

```markdown
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
```

- [ ] **Step 7: 语法与配置检查**

```bash
bash -n deploy/docker/build.sh
bash -n deploy/docker/package.sh
bash -n deploy/docker/scripts/upgrade.sh
bash -n deploy/docker/scripts/rollback.sh
bash -n deploy/docker/scripts/backup-db.sh
bash -n deploy/docker/scripts/restore-db.sh
bash -n deploy/docker/scripts/install-cron.sh
cd deploy/docker && docker compose --env-file .env.example config >/dev/null && echo "compose config ok"
```

Expected：全部命令退出码 0，输出 `compose config ok`。

- [ ] **Step 8: 提交（需用户确认）**

```bash
git add deploy/docker
git commit -m "feat(deploy): 添加离线 Docker 发布、升级与备份脚本"
```

---

### Task 6: 本地端到端验证

**Files:**
- 无新增；验证 `deploy/docker` 下的容器编排。

- [ ] **Step 1: 构建测试镜像**

```bash
cd C:/HOME/VUE/prj/mvp_vue
TAG=local-test ./deploy/docker/build.sh
```

Expected：`mvp-vue-web:local-test`、`mvp-vue-api:local-test` 构建成功。

- [ ] **Step 2: 启动测试栈（使用 15000/15001 避免与本机 dev 冲突）**

```bash
cd deploy/docker
cp .env.example .env
sed -i 's/^TAG=.*/TAG=local-test/' .env
sed -i 's/^EDITOR_PORT=.*/EDITOR_PORT=15000/' .env
sed -i 's/^RENDERER_PORT=.*/RENDERER_PORT=15001/' .env
mkdir -p data backups
cp ../../packages/server/prisma/dev.db data/dev.db
docker compose up -d --wait --wait-timeout 180
```

Expected：`docker compose ps` 中 api 与 web 均为 `healthy`。

- [ ] **Step 3: 验证访问与同源 API**

```bash
curl -fsS http://127.0.0.1:15000/api/publish/pages | head -c 200
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:15000/
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:15001/
curl -fsS http://127.0.0.1:15000/runtime-config.js
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3002
```

Expected：API 返回页面数组；两个页面 200；运行时配置含 `rendererPort: "15001"`；3002 返回 `000` 或失败。

- [ ] **Step 4: 验证备份**

```bash
./scripts/backup-db.sh
ls -l backups/dev-*.db
```

Expected：生成 `backups/dev-<时间戳>.db`，大小非 0。

- [ ] **Step 5: 验证空库自动建表**

```bash
docker compose down
mv data/dev.db data/dev.db.saved
docker compose up -d --wait --wait-timeout 180
curl -fsS http://127.0.0.1:15000/api/publish/pages
docker compose exec -T api sqlite3 /data/dev.db ".tables"
```

Expected：接口返回 `[]`；`.tables` 含 `CustomIcon PageDraft PagePublished SchemaMigration EditableText`。

- [ ] **Step 6: 恢复测试数据并验证改端口**

```bash
docker compose down
mv data/dev.db.saved data/dev.db
docker compose up -d --wait --wait-timeout 180

sed -i 's/^EDITOR_PORT=.*/EDITOR_PORT=15010/; s/^RENDERER_PORT=.*/RENDERER_PORT=15011/' .env
docker compose up -d --wait --wait-timeout 120
curl -fsS http://127.0.0.1:15010/runtime-config.js
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:15010/
```

Expected：运行时配置含 `rendererPort: "15011"`；15010 返回 200。

- [ ] **Step 7: 验证回滚**

```bash
docker tag mvp-vue-web:local-test mvp-vue-web:local-old
docker tag mvp-vue-api:local-test mvp-vue-api:local-old
./scripts/rollback.sh local-old
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:15010/
```

Expected：容器重启成功，页面 200。

- [ ] **Step 8: 清理测试环境**

```bash
docker compose down
rm -rf data backups .env
docker rmi mvp-vue-web:local-old mvp-vue-api:local-old
```

Expected：测试数据目录删除；本机 dev 环境不受影响。

- [ ] **Step 9: 提交验证中产生的修正（需用户确认）**

```bash
git status --short
git add <修正的文件>
git commit -m "fix(deploy): 端到端验证修正"
```

---

### Task 7: 文档与最终检查

**Files:**
- Modify: `README.md:5-13`

- [ ] **Step 1: 根 README 增加 Docker 入口**

在文档表格中增加一行：

```markdown
| [deploy/docker/README.md](deploy/docker/README.md) | **Docker 离线部署**（构建机打包 / 目标机 load、升级、回滚、备份） |
```

并在「Linux 内网部署」段落后增加：

```markdown
**Docker 部署**：构建机执行 `TAG=<版本> ./deploy/docker/build.sh` 与
`./deploy/docker/package.sh`；目标机按 [deploy/docker/README.md](deploy/docker/README.md)
执行。设计说明见 [doc/docker-deploy-design.md](doc/docker-deploy-design.md)。
```

- [ ] **Step 2: 最终检查**

```bash
git status --short
git diff --stat
cd packages/server && DATABASE_URL="file:./dev.db" pnpm exec prisma validate
cd ../.. && pnpm build:server
```

Expected：改动文件符合预期；Prisma schema 校验通过；server 构建通过。

- [ ] **Step 3: 提交（需用户确认）**

```bash
git add README.md
git commit -m "docs: 增加 Docker 离线部署入口"
```

---

## 验收对照（来自设计文档 §9）

| 项 | 对应验证 |
|----|----------|
| 镜像可离线导入 | Task 6 Step 2（`docker load` 由 upgrade.sh 执行） |
| 访问方式不变 | Task 6 Step 3（5000/5001；测试端口 15000/15001） |
| 同源 API、3002 不暴露 | Task 6 Step 3 |
| 数据保留 | Task 6 Step 2（复制现有 dev.db） |
| 持久化 | Task 6 Step 6（重启后数据仍在） |
| 升级与回滚 | Task 6 Step 7 |
| 备份 | Task 6 Step 4 |
| 空库初始化 | Task 6 Step 5 |
| 端口可配置 | Task 6 Step 6 |
| 严格策略 | `docker compose exec api env` 含 `PAGE_POLICY=strict`（Task 6 可加查） |
