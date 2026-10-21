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
