#!/bin/bash
# Deril Tool: Free background music & SFX downloader (no API key needed)
# Sources: YouTube Audio Library (via yt-dlp), ccMixter, Incompetech
#
# Usage:
#   ./deril-audio.sh music "background corporate"     # search + download music
#   ./deril-audio.sh sfx "notification"               # search SFX dari freesound mirror
#   ./deril-audio.sh youtube-audio-lib "upbeat"       # YouTube Audio Library
#   ./deril-audio.sh list-voices                      # TTS voices Indonesia

set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

CMD="${1:-}"
QUERY="${2:-background music}"
OUT_DIR="${3:-./assets/audio}"
mkdir -p "$OUT_DIR"

case "$CMD" in
  music)
    echo "Searching CC music via SearXNG + downloading via yt-dlp..."
    # ccMixter.org — CC licensed music, no API key
    ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")
    echo "→ Fetching from ccMixter..."
    python3 - << PYEOF
import urllib.request, json, re, os

query = "$QUERY"
out_dir = "$OUT_DIR"

# ccMixter API (no auth, CC licensed)
url = f"https://ccmixter.org/api/query?f=json&t=song&search={query.replace(' ', '+')}&limit=5&lic=open"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
    print(f"Found {len(data)} tracks on ccMixter:")
    for t in data:
        print(f"  [{t.get('upload_id')}] {t.get('upload_name','?')} by {t.get('user_real_name','?')}")
        print(f"    License: {t.get('license_name','CC')}")
        dl_url = t.get('files', [{}])[0].get('download_url', '') if t.get('files') else ''
        if dl_url:
            print(f"    Download: {dl_url}")
except Exception as e:
    print(f"ccMixter error: {e}")
PYEOF
    echo ""
    echo "→ Searching YouTube Audio Library (free music, no copyright)..."
    # YouTube Audio Library doesn't have API but yt-dlp can fetch playlist
    yt-dlp "ytsearch5:$QUERY site:youtube.com audio library free music no copyright" \
      --no-playlist --extract-audio --audio-format mp3 --audio-quality 192K \
      -o "$OUT_DIR/%(title)s.%(ext)s" \
      --match-filter "duration < 300" \
      --quiet --progress 2>/dev/null \
      || echo "(yt-dlp search — check internet connection)"
    echo "✓ Saved to $OUT_DIR"
    ;;

  sfx)
    echo "Searching SFX..."
    # Use yt-dlp to grab from YouTube SFX videos (public domain)
    yt-dlp "ytsearch3:$QUERY sound effect free no copyright" \
      --no-playlist --extract-audio --audio-format mp3 --audio-quality 128K \
      -o "$OUT_DIR/sfx_%(title)s.%(ext)s" \
      --match-filter "duration < 60" \
      --quiet --progress 2>/dev/null \
      || echo "(check internet connection)"
    echo "✓ Saved to $OUT_DIR"
    ;;

  youtube-audio-lib)
    # YouTube Audio Library — free, no copyright, for YouTube content
    # Browse: https://www.youtube.com/audiolibrary
    # Using yt-dlp with cookie session for authenticated download
    SESSION="$HOME/pemrograman/virtual office agent/tools/sessions/youtube.json"
    if [ -f "$SESSION" ]; then
      echo "Using YouTube session..."
      yt-dlp "https://www.youtube.com/audiolibrary?nv=1" \
        --cookies-from-browser chromium \
        --extract-audio --audio-format mp3 \
        -o "$OUT_DIR/%(title)s.%(ext)s" \
        --quiet --progress 2>/dev/null \
        || echo "Try: python3 tools/helpers/session-manager.py save youtube"
    else
      echo "No YouTube session. Trying unauthenticated search..."
      yt-dlp "ytsearch10:$QUERY youtube audio library" \
        --no-playlist --extract-audio --audio-format mp3 --audio-quality 192K \
        -o "$OUT_DIR/%(title)s.%(ext)s" \
        --match-filter "duration < 300" \
        --quiet --progress 2>/dev/null
    fi
    echo "✓ Saved to $OUT_DIR"
    ;;

  list-voices)
    edge-tts --list-voices 2>/dev/null | grep -iE "id-ID|en-US|en-GB" | \
      awk '{print $1, $2, $3}' | column -t
    ;;

  incompetech)
    # Kevin MacLeod music — all CC BY, just credit him
    echo "Downloading from Incompetech (Kevin MacLeod, CC BY)..."
    python3 - << PYEOF
import urllib.request, json

# Incompetech doesn't have JSON API but their RSS/XML works
url = "https://incompetech.com/music/royalty-free/ajax/films/?keywords=$QUERY"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        content = r.read().decode()
    print(f"Incompetech results:\n{content[:500]}")
except Exception as e:
    print(f"Browse manually: https://incompetech.com/music/royalty-free/index.html?keywords={('$QUERY').replace(' ', '+')}")
    print("All music is CC BY — just credit 'Kevin MacLeod (incompetech.com)' in your video")
PYEOF
    ;;

  *)
    echo "Usage: $0 {music|sfx|youtube-audio-lib|list-voices|incompetech} [query] [out_dir]"
    echo ""
    echo "Sources (all free, no API key):"
    echo "  music            — ccMixter.org (CC) + yt-dlp search"
    echo "  sfx              — yt-dlp SFX search (short clips)"
    echo "  youtube-audio-lib — YouTube Audio Library (free for YouTube)"
    echo "  incompetech      — Kevin MacLeod CC BY music"
    echo "  list-voices      — TTS voices Indonesia/English"
    ;;
esac
