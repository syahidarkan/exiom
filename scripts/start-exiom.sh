#!/bin/bash
# ═══════════════════════════════════════════════════════
# Exiom Virtual Office — Start All Services
# Jalankan ini setelah restart PC
# Usage: bash scripts/start-exiom.sh
# ═══════════════════════════════════════════════════════

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

# Load .env
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a; source "$PROJECT_DIR/.env"; set +a
else
    echo "❌ .env tidak ditemukan di $PROJECT_DIR"
    exit 1
fi

# Load nvm + node 22
export NVM_DIR="/home/naca/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22 --silent 2>/dev/null || true
NODE_BIN="$(which node)"
NPM_BIN="$(which npm)"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Exiom Virtual Office — Starting     ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# ── 1. PostgreSQL Docker ────────────────────────────────
echo "▶ [1/3] PostgreSQL..."
if docker ps --filter "name=exiom-postgres" --filter "status=running" | grep -q exiom-postgres; then
    echo "  ✓ exiom-postgres sudah jalan"
else
    docker start exiom-postgres 2>/dev/null || \
    docker run -d \
        --name exiom-postgres \
        -e POSTGRES_DB=exiom_office \
        -e POSTGRES_USER=exiom \
        -e POSTGRES_PASSWORD=exiom_local_db_2026 \
        -p 127.0.0.1:5432:5432 \
        --restart unless-stopped \
        postgres:16-alpine
    sleep 2
    echo "  ✓ exiom-postgres started"
fi

# ── 2. LiteLLM Business Proxy (port 4001) ───────────────
echo "▶ [2/3] LiteLLM Business Proxy (port 4001)..."
if curl -s --max-time 2 http://127.0.0.1:4001/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY" > /dev/null 2>&1; then
    echo "  ✓ LiteLLM port 4001 sudah jalan"
else
    # Kill stale processes on port 4001
    fuser -k 4001/tcp 2>/dev/null || true
    sleep 1

    nohup litellm \
        --config "$PROJECT_DIR/infra/litellm-business.yaml" \
        --port 4001 \
        --host 127.0.0.1 \
        > "$LOG_DIR/litellm-business.log" 2>&1 &
    LITELLM_PID=$!
    echo "  ℹ LiteLLM PID: $LITELLM_PID (log: logs/litellm-business.log)"

    # Tunggu max 15 detik
    for i in $(seq 1 15); do
        sleep 1
        if curl -s --max-time 1 http://127.0.0.1:4001/v1/models -H "Authorization: Bearer $LITELLM_MASTER_KEY" > /dev/null 2>&1; then
            echo "  ✓ LiteLLM ready (${i}s)"
            break
        fi
        if [ $i -eq 15 ]; then
            echo "  ⚠ LiteLLM belum ready setelah 15s, tapi proses berjalan"
        fi
    done
fi

# ── 3. Hermes Virtual Office Dashboard (port 3001) ──────
echo "▶ [3/3] Dashboard (port 3001)..."
HVO_DIR="/home/naca/pemrograman/hermes-virtual-office"

if curl -s --max-time 2 http://127.0.0.1:3001 > /dev/null 2>&1; then
    echo "  ✓ Dashboard port 3001 sudah jalan"
else
    # Kill stale processes on port 3001
    fuser -k 3001/tcp 2>/dev/null || true
    sleep 1

    cd "$HVO_DIR"
    nohup "$NPM_BIN" run dev \
        > "$LOG_DIR/dashboard.log" 2>&1 &
    DASH_PID=$!
    echo "  ℹ Dashboard PID: $DASH_PID (log: logs/dashboard.log)"

    # Tunggu max 20 detik
    for i in $(seq 1 20); do
        sleep 1
        if curl -s --max-time 1 http://127.0.0.1:3001 > /dev/null 2>&1; then
            echo "  ✓ Dashboard ready (${i}s)"
            break
        fi
        if [ $i -eq 20 ]; then
            echo "  ⚠ Dashboard belum ready setelah 20s, tapi proses berjalan"
        fi
    done
    cd "$PROJECT_DIR"
fi

# ── Done ────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║              Exiom Siap! 🚀                   ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  Dashboard   → http://100.112.183.73:3001     ║"
echo "║  LiteLLM API → http://127.0.0.1:4001          ║"
echo "║  PostgreSQL  → 127.0.0.1:5432                 ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
