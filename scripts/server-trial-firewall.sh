#!/usr/bin/env bash
# Linux 服务器（firewalld）：放行试运行端口 3002/8080/8081
# 需 root：sudo ./scripts/server-trial-firewall.sh
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo"
  exit 1
fi

if ! command -v firewall-cmd >/dev/null 2>&1; then
  echo "firewalld not found. Open ports 3002, 8080, 8081 in your firewall manually."
  exit 0
fi

for port in 3002 8080 8081; do
  firewall-cmd --permanent --add-port="${port}/tcp"
done
firewall-cmd --reload
firewall-cmd --list-ports
echo "Opened 3002, 8080, 8081"
