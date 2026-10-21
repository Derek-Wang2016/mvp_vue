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
