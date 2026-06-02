#!/usr/bin/env bash
# Linux 服务器：安装依赖并初始化 Prisma（在 /opt/mvp_vue 执行）
set -euo pipefail

cd "${MVP_DEPLOY_PATH:-/opt/mvp_vue}"

echo "==> pnpm install"
pnpm install --frozen-lockfile

echo "==> prisma generate"
pnpm prisma:generate

if [[ ! -f packages/server/prisma/dev.db ]]; then
  echo "==> no dev.db — db push + optional seed"
  pnpm -F @mvp-vue/server exec prisma db push
  pnpm -F @mvp-vue/server db:seed || true
else
  echo "==> dev.db exists, skip db push"
fi

echo "Setup done. Next: ./scripts/server-trial-start.sh (or start API/preview manually)"
