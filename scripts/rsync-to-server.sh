#!/usr/bin/env bash
# 开发机：将整仓（排除 node_modules/.git）同步到 Linux 服务器
# 用法：MVP_DEPLOY_HOST=mvp@192.168.1.100 MVP_DEPLOY_PATH=/opt/mvp_vue ./scripts/rsync-to-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${MVP_DEPLOY_HOST:?设置 MVP_DEPLOY_HOST，例如 mvp@192.168.1.100}"
DEST="${MVP_DEPLOY_PATH:-/opt/mvp_vue}"

rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude dist-ssr \
  --exclude .cursor \
  --exclude .claude \
  --exclude 'packages/server/prisma/*.db' \
  --exclude 'packages/server/prisma/*.db-journal' \
  "$ROOT/" "$HOST:$DEST/"

echo "Synced to $HOST:$DEST"
