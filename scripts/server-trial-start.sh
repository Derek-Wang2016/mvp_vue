#!/usr/bin/env bash
# Linux 服务器：前台启动 API + Editor/Renderer preview（无 Nginx）
# 需要 tmux 或开 3 个 SSH 会话；本脚本用 tmux 一键起三个窗格（无 tmux 时仅打印命令）
set -euo pipefail

cd "${MVP_DEPLOY_PATH:-/opt/mvp_vue}"
export PAGE_POLICY="${PAGE_POLICY:-strict}"

start_api() {
  echo "Starting API on 0.0.0.0:3002 (PAGE_POLICY=$PAGE_POLICY)"
  exec pnpm -F @mvp-vue/server start
}

start_editor_preview() {
  cd packages/editor
  exec pnpm exec vite preview --host 0.0.0.0 --port 8080
}

start_renderer_preview() {
  cd packages/renderer
  exec pnpm exec vite preview --host 0.0.0.0 --port 8081
}

if command -v tmux >/dev/null 2>&1; then
  SESSION=mvp-trial
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  tmux new-session -d -s "$SESSION" -n api "cd '$PWD' && PAGE_POLICY=$PAGE_POLICY pnpm -F @mvp-vue/server start"
  tmux split-window -h "cd '$PWD/packages/editor' && pnpm exec vite preview --host 0.0.0.0 --port 8080"
  tmux split-window -v "cd '$PWD/packages/renderer' && pnpm exec vite preview --host 0.0.0.0 --port 8081"
  tmux select-layout even-horizontal
  echo "tmux session '$SESSION' started. Attach: tmux attach -t $SESSION"
  echo "Editor http://<server-ip>:8080  Renderer http://<server-ip>:8081/?id=<id>"
else
  echo "tmux not found. Run in three terminals:"
  echo "  1) cd $PWD && PAGE_POLICY=$PAGE_POLICY pnpm -F @mvp-vue/server start"
  echo "  2) cd $PWD/packages/editor && pnpm exec vite preview --host 0.0.0.0 --port 8080"
  echo "  3) cd $PWD/packages/renderer && pnpm exec vite preview --host 0.0.0.0 --port 8081"
fi
