# Exiom Agent Tools — Overview

> Machine-readable registry: `tools/tools-manifest.json`
> Install script: `bash tools/install-tools.sh`
> Docker services: `docker compose -f tools/docker-compose.tools.yml up -d`

## Quick Status

| Tool | Type | Agent | Status | Port/Binary |
|------|------|-------|--------|-------------|
| browser-use | Python CLI | Mia | ✅ installed | `browser-use` |
| twscrape | Python CLI | Mia | ✅ installed | `twscrape` |
| pytrends | Python lib | Mia, Gagah | ✅ installed | `import pytrends` |
| searxng | Docker | Mia | 🐳 needs `docker compose up` | localhost:8080 |
| google-maps-scraper | Go binary | Joce | ✅ installed | `~/.local/bin/google-maps-scraper` |
| puppeteer-extra-stealth | Node | Joce | ✅ installed | `tools/node/joce-crawler/` |
| check-email | Docker | Joce | 🐳 needs `docker compose up` | localhost:8989 |
| remotion | Node framework | Deril | ✅ pre-existing | `remotion/` |
| edge-tts | Python CLI | Deril | ✅ installed | `edge-tts` |
| pexels (requests) | Python lib | Deril | ✅ (via requests) | `import requests` |
| yt-dlp | Python CLI | Deril | ✅ installed | `yt-dlp` |
| single-file-cli | Node CLI | Adi | ⚠️ needs `npm i -g single-file-cli` | `single-file` |
| playwright | Python lib | Adi | installed via auto-* | `python3 -m playwright` |
| shadcn/ui | npx | Adi | no install needed | `npx shadcn@latest` |
| praw | Python lib | Gagah | ✅ installed | `import praw` |
| searchconsole | Python lib | Gagah | ✅ installed | `import searchconsole` |
| rss-bridge | Docker | Nela, Ale | 🐳 needs `docker compose up` | localhost:3100 |
| baileys-whatsapp | Node | Nela, Ale | ✅ installed | `tools/node/baileys-wa/` |
| uptime-kuma | Docker | Kenzie, Hugo | 🐳 needs `docker compose up` | localhost:3001 |
| typst | Binary | Hugo | ✅ installed | `~/.local/bin/typst` |
| psutil | Python lib | Kenzie | ✅ installed | `import psutil` |

## Docker Services — Start All

```bash
docker compose -f tools/docker-compose.tools.yml up -d
```

Or individual:
```bash
docker compose -f tools/docker-compose.tools.yml up searxng -d      # Mia search
docker compose -f tools/docker-compose.tools.yml up check-email -d  # Joce email validator
docker compose -f tools/docker-compose.tools.yml up rss-bridge -d   # Nela/Ale RSS
docker compose -f tools/docker-compose.tools.yml up uptime-kuma -d  # Kenzie/Hugo monitor
```

## ENV Variables Required

Add to `.env`:
```env
# Deril — Pexels stock assets
PEXELS_API_KEY=your_pexels_api_key

# Gagah — Reddit scraping
REDDIT_CLIENT_ID=your_reddit_app_id
REDDIT_CLIENT_SECRET=your_reddit_app_secret
REDDIT_USER_AGENT=exiom-seo-bot/1.0

# Nela/Ale — WhatsApp (after linking via QR)
WA_SESSION_DIR=tools/node/baileys-wa/session
```

**BUTUH DARI OWNER:**
- `PEXELS_API_KEY` — daftar gratis di pexels.com/api — alasan: diperlukan Deril untuk download stock assets — buat lanjut ke: pipeline konten Remotion
- `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` — buat di reddit.com/prefs/apps — alasan: Gagah butuh untuk riset keyword dari forum — buat lanjut ke: SEO research pipeline
