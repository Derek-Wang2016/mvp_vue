#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAG="${TAG:?用法: TAG=20261021-1 ./deploy/docker/build.sh}"
PLATFORM="${PLATFORM:-linux/amd64}"

cd "$ROOT"
docker build --platform "$PLATFORM" -f deploy/docker/Dockerfile.web -t "mvp-vue-web:$TAG" .
docker build --platform "$PLATFORM" -f deploy/docker/Dockerfile.api -t "mvp-vue-api:$TAG" .
echo "构建完成: mvp-vue-web:$TAG, mvp-vue-api:$TAG"
