#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_LINE="17 2 * * * cd $DEPLOY_DIR && ./scripts/backup-db.sh >> $DEPLOY_DIR/backups/backup.log 2>&1"

mkdir -p "$DEPLOY_DIR/backups"
( crontab -l 2>/dev/null | grep -v 'scripts/backup-db.sh' || true; echo "$CRON_LINE" ) | crontab -
echo "已安装每日备份任务："
crontab -l | grep 'scripts/backup-db.sh'
