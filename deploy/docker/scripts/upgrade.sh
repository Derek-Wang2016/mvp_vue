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
