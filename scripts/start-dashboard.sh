#!/bin/bash
# Start hermes-virtual-office dashboard untuk Exiom
# Binding ke Tailscale IP (100.112.183.73) port 3001
# Akses dari HP/laptop via: http://100.112.183.73:3001
#
# Usage: ./scripts/start-dashboard.sh [--build]

set -e
DASHBOARD_DIR="/home/naca/pemrograman/hermes-virtual-office"
TAILSCALE_IP="100.112.183.73"
PORT=3001

# Load nvm
export NVM_DIR="/home/naca/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22 --silent

cd "$DASHBOARD_DIR"

# Build kalau diminta atau belum pernah build
if [ "$1" = "--build" ] || [ ! -d ".next" ]; then
    echo "[exiom] Building hermes-virtual-office..."
    HERMES_BIN=/home/naca/.local/bin/hermes npm run build
fi

# Cek apakah sudah jalan
if curl -s "http://$TAILSCALE_IP:$PORT" > /dev/null 2>&1; then
    echo "[exiom] Dashboard sudah jalan di http://$TAILSCALE_IP:$PORT"
    exit 0
fi

echo "[exiom] Starting dashboard at http://$TAILSCALE_IP:$PORT ..."
exec node_modules/.bin/next start \
    --hostname "$TAILSCALE_IP" \
    --port "$PORT" \
    2>&1
