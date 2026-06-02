#!/usr/bin/env bash
# Linux 服务器或内网机：验证 API 与端口
set -euo pipefail

IP="${MVP_SERVER_IP:-127.0.0.1}"

echo "==> API publish pages"
curl -sf "http://${IP}:3002/api/publish/pages" | head -c 300
echo ""
echo ""

echo "==> listening ports (ss)"
ss -tlnp 2>/dev/null | grep -E ':3002|:8080|:8081' || netstat -tlnp 2>/dev/null | grep -E ':3002|:8080|:8081' || true

echo ""
echo "Browser:"
echo "  Editor:   http://${IP}:8080"
echo "  Renderer: http://${IP}:8081/?id=<publishPageId>"
