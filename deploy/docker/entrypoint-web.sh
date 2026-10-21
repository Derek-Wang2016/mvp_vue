#!/bin/sh
set -eu

: "${RENDERER_PORT:=5001}"
export RENDERER_PORT

envsubst '${RENDERER_PORT}' \
  < /etc/mvp/runtime-config.js.template \
  > /usr/share/nginx/html/editor/runtime-config.js

exec nginx -g 'daemon off;'
