#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

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
