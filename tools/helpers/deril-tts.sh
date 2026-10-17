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

  pexels)
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
    python3 - <<PYEOF
import os, sys, json, requests

key = os.environ.get("PEXELS_API_KEY", "")
if not key:
    print("Set PEXELS_API_KEY in .env first")
    sys.exit(1)

headers = {"Authorization": key}
if "$TYPE" == "video":
    url = f"https://api.pexels.com/videos/search?query={requests.utils.quote('$QUERY')}&per_page=5"
    r = requests.get(url, headers=headers)
    for v in r.json().get("videos", []):
        best = max(v["video_files"], key=lambda f: f.get("width", 0))
        print(f"  ID {v['id']} ({v['width']}x{v['height']}): {best['link']}")
else:
    url = f"https://api.pexels.com/v1/search?query={requests.utils.quote('$QUERY')}&per_page=5"
    r = requests.get(url, headers=headers)
    for p in r.json().get("photos", []):
        print(f"  ID {p['id']}: {p['src']['original']}")
PYEOF
    ;;

  *)
    echo "Usage: $0 {tts|voices|pexels} [options]"
    echo ""
    echo "  tts \"text\" [--voice <voice>] [--out <file.mp3>]"
    echo "  voices [--lang id|en]"
    echo "  pexels \"query\" [--type photo|video] [--out ./dir]"
    ;;
esac
