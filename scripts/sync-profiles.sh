#!/bin/bash
# Sync SOUL.md dari project repo ke ~/.hermes/profiles/
# Jalankan setelah edit SOUL.md di project, atau setelah git pull
set -e
PROFILES_SRC="$(dirname "$(dirname "$0")")/agents/profiles"
HERMES_DIR="$HOME/.hermes/profiles"

for agent in kenzie adi mia deril gagah nela ale joce hugo; do
  src="$PROFILES_SRC/$agent/SOUL.md"
  dst="$HERMES_DIR/$agent/SOUL.md"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo "[sync] $agent SOUL.md → $dst"
  fi
done
echo "[sync] Done."
