#!/bin/bash
# Start LiteLLM proxy untuk 9 agent bisnis Exiom (port 4001)
# Jalankan setelah .env sudah diisi dengan API keys
#
# Usage: ./scripts/start-business-litellm.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
CONFIG_FILE="$PROJECT_DIR/infra/litellm-business.yaml"

# Load .env kalau ada
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    echo "[exiom] Loaded env from $ENV_FILE"
else
    echo "[exiom] WARNING: .env tidak ditemukan di $ENV_FILE"
    echo "[exiom] Salin .env.example ke .env dan isi API keys dulu"
    exit 1
fi

# Cek key wajib ada
for var in EXIOM_CLAUDE_KEY_G1 EXIOM_CLAUDE_KEY_G2 EXIOM_CLAUDE_KEY_G3 EXIOM_CLAUDE_KEY_G4; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"XXXXXXXX"* ]]; then
        echo "[exiom] ERROR: $var belum diisi di .env"
        exit 1
    fi
done

echo "[exiom] Starting business LiteLLM proxy on port 4001..."

# Cek apakah sudah jalan
if curl -s http://127.0.0.1:4001/health > /dev/null 2>&1; then
    echo "[exiom] LiteLLM business sudah jalan di port 4001"
    exit 0
fi

# Install litellm kalau belum ada
if ! command -v litellm &>/dev/null; then
    echo "[exiom] Installing litellm..."
    pip install litellm[proxy] --quiet
fi

# Start proxy
exec litellm \
    --config "$CONFIG_FILE" \
    --port 4001 \
    --host 127.0.0.1 \
    --detailed_debug 2>&1
