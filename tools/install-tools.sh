#!/bin/bash
# Exiom Agent Tools Installer
# Installs all tools for all 9 agents
# Usage: bash tools/install-tools.sh [--skip-docker] [--skip-node] [--agent <name>]
set -euo pipefail

SKIP_DOCKER=0
SKIP_NODE=0
TARGET_AGENT=""

for arg in "$@"; do
  case "$arg" in
    --skip-docker) SKIP_DOCKER=1 ;;
    --skip-node)   SKIP_NODE=1 ;;
    --agent)       shift; TARGET_AGENT="$1" ;;
  esac
done

export PATH="$HOME/.local/bin:$PATH"

log()  { echo -e "\033[1;32m[TOOLS]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
fail() { echo -e "\033[1;31m[FAIL]\033[0m $*"; }

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$TOOLS_DIR")"

# ─── Check prereqs ────────────────────────────────────────────────────────────
check_prereqs() {
  log "Checking prerequisites..."
  command -v uv   >/dev/null || { warn "uv not found, installing..."; curl -LsSf https://astral.sh/uv/install.sh | sh; export PATH="$HOME/.local/bin:$PATH"; }
  command -v node >/dev/null || warn "node not found — skip Node tools or install Node 20+"
  command -v docker >/dev/null || warn "docker not found — skip Docker services"
}

# ─── MIA — Python tools ───────────────────────────────────────────────────────
install_mia() {
  log "Installing Mia tools (Marketing Manager)..."

  # twscrape — X/Twitter scraper
  uv tool install twscrape 2>/dev/null || uv tool upgrade twscrape
  log "  ✓ twscrape"

  # browser-use — already via auto-* deps, ensure standalone too
  uv tool install browser-use 2>/dev/null || true
  log "  ✓ browser-use"

  # pytrends — Google Trends (unofficial API, free)
  uv pip install --system pytrends 2>/dev/null || pip3 install --user pytrends
  log "  ✓ pytrends (Google Trends)"

  # social-analyzer — social media OSINT/analytics
  uv tool install social-analyzer 2>/dev/null || pip3 install --user social-analyzer || warn "  social-analyzer install failed (optional)"
  log "  ✓ social-analyzer (optional)"
}

# ─── JOCE — Go binary + Node ──────────────────────────────────────────────────
install_joce() {
  log "Installing Joce tools (Client Acquisition)..."

  # google-maps-scraper — pre-compiled Go binary
  GMAPS_BIN="$HOME/.local/bin/google-maps-scraper"
  if [ ! -f "$GMAPS_BIN" ]; then
    ARCH=$(uname -m)
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    [[ "$ARCH" == "x86_64" ]] && ARCH="amd64"
    [[ "$ARCH" == "aarch64" ]] && ARCH="arm64"
    GMAPS_URL="https://github.com/gosom/google-maps-scraper/releases/latest/download/google-maps-scraper_${OS}_${ARCH}.tar.gz"
    TMP=$(mktemp -d)
    if curl -fsSL "$GMAPS_URL" -o "$TMP/gmaps.tar.gz" 2>/dev/null; then
      tar -xzf "$TMP/gmaps.tar.gz" -C "$TMP"
      cp "$TMP/google-maps-scraper" "$HOME/.local/bin/"
      chmod +x "$HOME/.local/bin/google-maps-scraper"
      rm -rf "$TMP"
      log "  ✓ google-maps-scraper"
    else
      warn "  google-maps-scraper download failed — check arch/OS or install manually"
    fi
  else
    log "  ✓ google-maps-scraper (already installed)"
  fi

  # check-email — Rust-based email validator via cargo or pre-built
  if ! command -v check_email >/dev/null 2>&1; then
    if command -v cargo >/dev/null 2>&1; then
      cargo install check-if-email-exists 2>/dev/null || warn "  check-email cargo install failed"
    else
      warn "  check-email: cargo not found, install Rust or use the HTTP API via check-email Docker"
    fi
  fi
  log "  ✓ check-email (reachability: see check-email Docker service)"

  # puppeteer-extra stealth — handled in Node section
  if [ "$SKIP_NODE" -eq 0 ]; then
    JOCE_DIR="$REPO_ROOT/tools/node/joce-crawler"
    mkdir -p "$JOCE_DIR"
    if [ ! -f "$JOCE_DIR/package.json" ]; then
      cd "$JOCE_DIR"
      cat > package.json << 'JSON'
{
  "name": "joce-crawler",
  "version": "1.0.0",
  "description": "Stealth web crawler for Joce — lead scraping",
  "type": "module",
  "dependencies": {
    "puppeteer-extra": "^3.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2",
    "puppeteer": "^22.0.0"
  }
}
JSON
      npm install --silent 2>&1 | tail -3 && log "  ✓ puppeteer-extra + stealth"
    else
      log "  ✓ puppeteer-extra (already installed)"
    fi
  fi
}

# ─── DERIL — Python tools ────────────────────────────────────────────────────
install_deril() {
  log "Installing Deril tools (Editor/Content)..."

  # edge-tts — Microsoft Edge TTS (free, Indonesian + English)
  uv tool install edge-tts 2>/dev/null || uv tool upgrade edge-tts
  log "  ✓ edge-tts"

  # pexels-python — free stock assets
  uv pip install --system pexels-python 2>/dev/null || pip3 install --user pexels-python
  log "  ✓ pexels-python"

  # yt-dlp — download reference video for editing (stock B-roll)
  uv tool install yt-dlp 2>/dev/null || uv tool upgrade yt-dlp
  log "  ✓ yt-dlp"

  # Remotion already set up in ~/pemrograman/virtual office agent/remotion
  log "  ✓ remotion (pre-existing)"
}

# ─── ADI — Node/npm tools ────────────────────────────────────────────────────
install_adi() {
  log "Installing Adi tools (Developer)..."

  # SingleFile CLI — full page archiver / UI cloner
  if ! command -v single-file >/dev/null 2>&1; then
    npm install -g single-file-cli 2>&1 | tail -3 && log "  ✓ single-file-cli"
  else
    log "  ✓ single-file (already installed)"
  fi

  # Playwright — browser automation / E2E testing
  uv tool install playwright 2>/dev/null || uv tool upgrade playwright
  python3 -m playwright install chromium 2>/dev/null || true
  log "  ✓ playwright"

  # shadcn/ui — used via npx per-project, no global install needed
  log "  ✓ shadcn/ui (usage: npx shadcn@latest add <component>)"
}

# ─── GAGAH — Python tools ────────────────────────────────────────────────────
install_gagah() {
  log "Installing Gagah tools (SEO Researcher)..."

  # praw — Reddit API
  uv pip install --system praw 2>/dev/null || pip3 install --user praw
  log "  ✓ praw (Reddit)"

  # searchconsole (Google Search Console SDK)
  uv pip install --system searchconsole 2>/dev/null || pip3 install --user searchconsole || warn "  searchconsole install failed"
  log "  ✓ searchconsole"

  # pytrends — Google Trends (shared with Mia, idempotent)
  uv pip install --system pytrends 2>/dev/null || pip3 install --user pytrends
  log "  ✓ pytrends"

  # google-auth — needed for Search Console
  uv pip install --system google-auth google-auth-oauthlib google-api-python-client 2>/dev/null || true
  log "  ✓ google-auth stack"
}

# ─── NELA & ALE — Docker + Node ───────────────────────────────────────────────
install_nela_ale() {
  log "Installing Nela & Ale tools (PR & Client Relations)..."

  # rss-bridge — handled in Docker Compose (see docker-compose.tools.yml)
  log "  ✓ rss-bridge (Docker — run: docker compose -f tools/docker-compose.tools.yml up rss-bridge -d)"

  # Baileys WhatsApp client
  if [ "$SKIP_NODE" -eq 0 ]; then
    BAILEYS_DIR="$REPO_ROOT/tools/node/baileys-wa"
    mkdir -p "$BAILEYS_DIR"
    if [ ! -f "$BAILEYS_DIR/package.json" ]; then
      cd "$BAILEYS_DIR"
      cat > package.json << 'JSON'
{
  "name": "baileys-wa",
  "version": "1.0.0",
  "description": "WhatsApp client for Nela & Ale agents",
  "type": "module",
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.9",
    "qrcode-terminal": "^0.12.0",
    "pino": "^9.0.0"
  }
}
JSON
      npm install --silent 2>&1 | tail -3 && log "  ✓ @whiskeysockets/baileys"
    else
      log "  ✓ baileys (already installed)"
    fi
  fi
}

# ─── KENZIE & HUGO — Docker + system tools ───────────────────────────────────
install_kenzie_hugo() {
  log "Installing Kenzie & Hugo tools (IT Ops & Finance)..."

  # uptime-kuma — Docker (see docker-compose.tools.yml)
  log "  ✓ uptime-kuma (Docker — run: docker compose -f tools/docker-compose.tools.yml up uptime-kuma -d)"

  # typst — PDF/document generator (Rust binary)
  if ! command -v typst >/dev/null 2>&1; then
    TYPST_URL="https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz"
    TMP=$(mktemp -d)
    if curl -fsSL "$TYPST_URL" -o "$TMP/typst.tar.xz" 2>/dev/null; then
      tar -xJf "$TMP/typst.tar.xz" -C "$TMP"
      cp "$TMP"/typst-*/typst "$HOME/.local/bin/typst"
      chmod +x "$HOME/.local/bin/typst"
      rm -rf "$TMP"
      log "  ✓ typst"
    else
      warn "  typst download failed — try: cargo install typst-cli"
    fi
  else
    log "  ✓ typst (already installed)"
  fi

  # psutil — system monitoring helper
  uv pip install --system psutil 2>/dev/null || pip3 install --user psutil
  log "  ✓ psutil (system monitoring)"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  check_prereqs

  case "$TARGET_AGENT" in
    mia)        install_mia ;;
    joce)       install_joce ;;
    deril)      install_deril ;;
    adi)        install_adi ;;
    gagah)      install_gagah ;;
    nela|ale)   install_nela_ale ;;
    kenzie|hugo) install_kenzie_hugo ;;
    "")
      install_mia
      install_joce
      install_deril
      install_adi
      install_gagah
      install_nela_ale
      install_kenzie_hugo
      ;;
    *)
      fail "Unknown agent: $TARGET_AGENT"
      exit 1
      ;;
  esac

  echo ""
  log "Done. Docker services (searxng, rss-bridge, uptime-kuma, check-email) are defined"
  log "in tools/docker-compose.tools.yml — start them with:"
  echo "  docker compose -f tools/docker-compose.tools.yml up -d"
}

main
