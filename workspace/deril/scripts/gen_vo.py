"""Generate VO (Edge-TTS, gratis) per scene.

SOURCE OF TRUTH: tools/node/remotion-deril/src/data/reels-content.json
  → Edit file itu untuk ganti konten scene (visual + VO text)
  → Jangan edit all.ts secara langsung

OUTPUT:
  tools/node/remotion-deril/public/audio/<id>/s<n>.mp3  (audio VO)
  tools/node/remotion-deril/src/data/all.ts             (di-generate ulang)

Jalankan: python3 gen_vo.py
"""
import json
import os
import pathlib
import subprocess

ROOT = pathlib.Path("/home/naca/pemrograman/virtual office agent/tools/node/remotion-deril")
EDGE = os.path.expanduser("~/.local/bin/edge-tts")

VOICE = "id-ID-ArdiNeural"
RATE  = "-8%"
PITCH = "+0Hz"
FPS   = 30
PAD   = 0.45
MIN   = 2.5

CONTENT_FILE = ROOT / "src" / "data" / "reels-content.json"


def duration(path: pathlib.Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(out.strip())


def main():
    reels = json.loads(CONTENT_FILE.read_text(encoding="utf-8"))

    for reel in reels:
        adir = ROOT / "public" / "audio" / reel["id"]
        adir.mkdir(parents=True, exist_ok=True)

        for i, sc in enumerate(reel["scenes"]):
            mp3 = adir / f"s{i}.mp3"
            print(f"  TTS {reel['id']} s{i}: {sc['vo'][:60]}...")
            subprocess.run(
                [EDGE, f"--rate={RATE}", f"--pitch={PITCH}",
                 "--voice", VOICE, "--no-progress",
                 "--text", sc["vo"], "--write-media", str(mp3)],
                check=True, timeout=120,
            )
            sc["audio"] = f"audio/{reel['id']}/s{i}.mp3"
            sc["seconds"] = round(max(MIN, duration(mp3) + PAD), 2)

        total = sum(round(s["seconds"] * FPS) for s in reel["scenes"])
        print(f"  {reel['id']}: {len(reel['scenes'])} scene, {total / FPS:.1f}s")

    # Tulis all.ts dari data yang sudah ada audio-nya
    data_dir = ROOT / "src" / "data"
    body = ["import type {Reel} from './types';", ""]
    names = []
    for reel in reels:
        name = "REEL_" + reel["id"].replace("reel", "")
        names.append(name)
        body.append(f"export const {name}: Reel = {json.dumps(reel, ensure_ascii=False, indent=2)};")
        body.append("")
    body.append(f"export const REELS: Reel[] = [{', '.join(names)}];")
    (data_dir / "all.ts").write_text("\n".join(body) + "\n", encoding="utf-8")
    print("wrote src/data/all.ts")


if __name__ == "__main__":
    main()
