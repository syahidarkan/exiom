#!/bin/bash
# Setup PostgreSQL database untuk Exiom Virtual Office Agent
# Menggunakan Docker (tanpa perlu sudo)
#
# Usage: ./scripts/setup-db.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[exiom] Checking PostgreSQL Docker container..."

if docker ps --filter "name=exiom-postgres" --filter "status=running" | grep -q exiom-postgres; then
    echo "[exiom] exiom-postgres already running"
else
    echo "[exiom] Starting exiom-postgres..."
    docker start exiom-postgres 2>/dev/null || docker run -d \
        --name exiom-postgres \
        --restart unless-stopped \
        -e POSTGRES_DB=exiom_office \
        -e POSTGRES_USER=exiom \
        -e POSTGRES_PASSWORD=exiom_local_db_2026 \
        -p 127.0.0.1:5432:5432 \
        -v exiom_pgdata:/var/lib/postgresql/data \
        postgres:16-alpine

    echo "[exiom] Waiting for PostgreSQL to be ready..."
    sleep 3
fi

docker exec exiom-postgres pg_isready -U exiom -d exiom_office

echo "[exiom] Applying schema..."
docker exec -i exiom-postgres psql -U exiom -d exiom_office < "$PROJECT_DIR/db/schema.sql" 2>&1 | grep -v "^$" || true

echo "[exiom] PostgreSQL ready at 127.0.0.1:5432"
echo "[exiom] DB: exiom_office | User: exiom"
