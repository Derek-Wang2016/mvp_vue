#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

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
