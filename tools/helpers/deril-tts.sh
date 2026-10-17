#!/bin/bash
# Deril Tool: Edge TTS + Pexels asset helper
# Usage:
#   ./deril-tts.sh tts "Halo, selamat datang di Exiom" --voice id-ID-ArdiNeural --out voiceover.mp3
#   ./deril-tts.sh voices --lang id
#   ./deril-tts.sh pexels "modern office" --type video --out ./assets/

set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

CMD="${1:-}"
shift || true

case "$CMD" in
  tts)
    TEXT=""
    VOICE="id-ID-ArdiNeural"
    OUT="output.mp3"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --voice) VOICE="$2"; shift 2 ;;
        --out)   OUT="$2"; shift 2 ;;
        *)       TEXT="$TEXT $1"; shift ;;
      esac
    done
    TEXT="${TEXT# }"
    echo "Generating TTS: voice=$VOICE out=$OUT"
    edge-tts --voice "$VOICE" --text "$TEXT" --write-media "$OUT"
    echo "✓ Saved to $OUT"
    ;;

  voices)
    LANG=""
    [[ "${1:-}" == "--lang" ]] && LANG="$2"
    if [[ -n "$LANG" ]]; then
      edge-tts --list-voices | grep -i "$LANG"
    else
      edge-tts --list-voices
    fi
    ;;

  pixabay)
    QUERY="${1:-office}"
    TYPE="video"
    OUT_DIR="./assets"
    shift || true
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --type) TYPE="$2"; shift 2 ;;
        --out)  OUT_DIR="$2"; shift 2 ;;
        *)      shift ;;
      esac
    done
    mkdir -p "$OUT_DIR"
    # Load .env
    [ -f "$(dirname "$0")/../../.env" ] && export $(grep -E '^PIXABAY_API_KEY=' "$(dirname "$0")/../../.env" | xargs)
    python3 - <<PYEOF
import os, sys, json, urllib.request, urllib.parse

key = os.environ.get("PIXABAY_API_KEY", "")
if not key:
    print("Set PIXABAY_API_KEY in .env first")
    sys.exit(1)

query = urllib.parse.quote("$QUERY")
headers = {"User-Agent": "Mozilla/5.0"}
if "$TYPE" == "video":
    url = f"https://pixabay.com/api/videos/?key={key}&q={query}&per_page=5&video_type=all"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    for v in data.get("hits", []):
        best = v["videos"].get("large") or v["videos"].get("medium") or {}
        print(f"  ID {v['id']} | {v['tags'][:60]}")
        print(f"    URL: {best.get('url', 'n/a')[:80]}...")
else:
    url = f"https://pixabay.com/api/?key={key}&q={query}&per_page=5&image_type=photo"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    for p in data.get("hits", []):
        print(f"  ID {p['id']} | {p['tags'][:60]}")
        print(f"    Full: {p.get('fullHDURL') or p.get('largeImageURL')}")
        print(f"    Web:  {p['webformatURL']}")
PYEOF
    ;;

  *)
    echo "Usage: $0 {tts|voices|pexels} [options]"
    echo ""
    echo "  tts \"text\" [--voice <voice>] [--out <file.mp3>]"
    echo "  voices [--lang id|en]"
    echo "  pixabay \"query\" [--type photo|video] [--out ./dir]"
    ;;
esac
