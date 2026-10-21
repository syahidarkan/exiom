"""VO reel 21 Okt, Edge-TTS suara Gadis (id-ID-GadisNeural). Output: public/audio/reel21/s<n>.mp3 + durasi."""
import json, pathlib, subprocess, os
ROOT = pathlib.Path("/home/naca/pemrograman/virtual office agent/tools/node/remotion-deril")
EDGE = os.path.expanduser("~/.local/bin/edge-tts")
VOICE = "id-ID-GadisNeural"
RATE = "-6%"
PITCH = "-2Hz"
VO = [
    "Pesanan jam 2 siang, baru kebaca jam 9 malam.",
    "Di HP ada 47 chat belum dibalas. Tiga di antaranya pesanan.",
    "Yang satu minta 20 kotak. Yang satu tanya bisa diantar hari ini atau nggak. Yang terakhir cuma kirim foto menu.",
    "Pelanggannya nunggu, lalu pindah ke toko sebelah.",
    "Ini ilustrasi, tapi polanya sering terjadi. Pesanan tenggelam di antara obrolan keluarga, foto grup, dan promo.",
    "Kamu juga begini?",
]
out = ROOT / "public" / "audio" / "reel21"
out.mkdir(parents=True, exist_ok=True)
res = []
for i, t in enumerate(VO):
    mp3 = out / f"s{i}.mp3"
    subprocess.run([EDGE, f"--rate={RATE}", f"--pitch={PITCH}", "--voice", VOICE,
                    "--text", t, "--write-media", str(mp3)], check=True, timeout=120)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "csv=p=0", str(mp3)], capture_output=True, text=True, check=True).stdout)
    res.append({"i": i, "text": t, "audio": f"audio/reel21/s{i}.mp3", "dur": round(d, 2)})
    print(i, round(d, 2), t)
json.dump(res, open(pathlib.Path(__file__).with_name("reel21_vo.json"), "w"), ensure_ascii=False, indent=2)
