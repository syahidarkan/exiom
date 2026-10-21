#!/usr/bin/env python3
"""
deril-publish.py — Upload video/teks ke sosmed via browser automation (Chrome CDP / browser-use)

Usage:
  # Upload video
  python3 tools/helpers/deril-publish.py \
    --file workspace/deril/output/reel21-final.mp4 \
    --caption "Teks caption #hashtag" \
    --platforms tiktok,instagram,youtube,x,threads

  # Upload X thread dari JSON
  python3 tools/helpers/deril-publish.py \
    --file workspace/deril/threads/topik.json \
    --mode thread \
    --platforms x

  # Upload dengan thumbnail (YouTube)
  python3 tools/helpers/deril-publish.py \
    --file workspace/deril/output/video.mp4 \
    --caption "Judul #Shorts" \
    --platforms youtube \
    --thumbnail workspace/deril/output/thumb.jpg

JSON thread format: [{"tweet": "1/5 teks..."}, {"tweet": "2/5 teks..."}, ...]
"""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

CDP_URL = os.environ.get("BU_CDP_URL", "http://127.0.0.1:9222")
CHROME_PROFILE = os.environ.get("CHROME_EXIOM_PROFILE", "/home/naca/.config/google-chrome-exiom")
CHROME_BIN = "/opt/google/chrome/chrome"


def load_env():
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def ensure_chrome() -> bool:
    """Pastikan Chrome CDP aktif di 127.0.0.1:9222. Coba launch via Xvfb kalau belum."""
    import urllib.request
    try:
        urllib.request.urlopen(CDP_URL + "/json/version", timeout=2)
        print("[chrome] CDP sudah aktif.")
        return True
    except Exception:
        pass

    print("[chrome] CDP tidak aktif, mencoba launch Chrome via Xvfb...")

    # Cari Xvfb display kosong mulai dari :10
    display = None
    for n in range(10, 30):
        if not Path(f"/tmp/.X{n}-lock").exists():
            display = f":{n}"
            break
    if display is None:
        display = ":10"

    # Launch Xvfb virtual display
    xvfb = subprocess.Popen(
        ["Xvfb", display, "-screen", "0", "1920x1080x24"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1)

    env = os.environ.copy()
    env["DISPLAY"] = display

    subprocess.Popen(
        [
            CHROME_BIN,
            "--remote-debugging-port=9222",
            "--remote-debugging-address=127.0.0.1",
            f"--user-data-dir={CHROME_PROFILE}",
            "--no-first-run",
            "--disable-dev-shm-usage",
            "--no-sandbox",
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for i in range(20):
        time.sleep(1)
        try:
            urllib.request.urlopen(CDP_URL + "/json/version", timeout=2)
            print(f"[chrome] CDP aktif via Xvfb {display} ({i+1}s)")
            return True
        except Exception:
            pass

    print("[chrome] GAGAL launch Chrome otomatis.")
    print("  Jalankan manual di terminal desktop Owner:")
    print(f"  {CHROME_BIN} --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir={CHROME_PROFILE} &")
    print("  Lalu jalankan script ini lagi.")
    xvfb.terminate()
    return False


def run_browser(script: str) -> tuple[bool, str]:
    env = os.environ.copy()
    env["BU_CDP_URL"] = CDP_URL
    result = subprocess.run(
        ["browser-use"],
        input=script,
        capture_output=True,
        text=True,
        env=env,
        timeout=120,
    )
    output = result.stdout + result.stderr
    return result.returncode == 0, output


def _q(s: str) -> str:
    """Escape string untuk dimasukkan ke dalam Python string literal di dalam f-string."""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


# ── TikTok ────────────────────────────────────────────────────────────────────

def upload_tiktok(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    cap = _q(caption)
    script = f"""
import time
new_tab("https://www.tiktok.com/tiktokstudio/upload?lang=id-ID")
time.sleep(4)

# Upload file via hidden input
fill_input('input[type="file"]', "{abs_file}")
print("[tiktok] file di-set ke input")
time.sleep(6)

# Isi caption
wait_for_element('[data-text="true"]')
js('var el = document.querySelector("[data-text=\\"true\\"]") || document.querySelector("[contenteditable=\\"true\\"]"); if(el){{ el.focus(); }}')
time.sleep(0.3)
type_text("{cap}"[:2200])
print("[tiktok] caption diisi")
time.sleep(1)

# Klik Post
ok = js('var b = document.querySelector("button[data-e2e=\\"post-btn\\"]"); if(b){{ b.click(); return true; }} return false;')
if not ok:
    ok = js('var btns = Array.from(document.querySelectorAll("button")); var b = btns.find(x => x.textContent.trim() === "Post"); if(b){{ b.click(); return true; }} return false;')
print("[tiktok] Post diklik:", ok)
time.sleep(5)
print("[tiktok] URL:", page_info()['url'])
"""
    ok, out = run_browser(script)
    print(out)
    return ok


# ── Instagram ─────────────────────────────────────────────────────────────────

def upload_instagram(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    cap = _q(caption)
    script = f"""
import time
new_tab("https://www.instagram.com/")
time.sleep(3)

# Klik New Post
js('document.querySelector("[aria-label=\\"New post\\"]")?.click()')
time.sleep(1)
fill_input('input[type="file"]', "{abs_file}")
print("[ig] file di-set")
time.sleep(4)

# Klik Next dua kali (crop → filter → caption)
for step in range(2):
    time.sleep(2)
    js('var btns = Array.from(document.querySelectorAll("button,div[role=button]")); var b = btns.find(x => x.textContent.trim() === "Next"); if(b) b.click();')
    print(f"[ig] Next {{step+1}} diklik")

# Isi caption
time.sleep(2)
js('document.querySelector("[aria-label*=\\"caption\\"]")?.focus() || document.querySelector("[contenteditable=\\"true\\"]")?.focus()')
time.sleep(0.3)
type_text("{cap}"[:2200])
print("[ig] caption diisi")
time.sleep(1)

# Klik Share
ok = js('var btns = Array.from(document.querySelectorAll("button,div[role=button]")); var b = btns.find(x => x.textContent.trim() === "Share"); if(b){{ b.click(); return true; }} return false;')
print("[ig] Share diklik:", ok)
time.sleep(5)
print("[ig] URL:", page_info()['url'])
"""
    ok, out = run_browser(script)
    print(out)
    return ok


# ── X / Twitter ───────────────────────────────────────────────────────────────

def upload_x(file: Path, caption: str) -> bool:
    """Post single tweet dengan media."""
    abs_file = str(file.resolve())
    cap = _q(caption[:280])
    script = f"""
import time
new_tab("https://x.com/compose/post")
time.sleep(3)

# Isi teks
wait_for_element('[data-testid="tweetTextarea_0"]')
js('document.querySelector("[data-testid=\\"tweetTextarea_0\\"]").focus()')
time.sleep(0.3)
type_text("{cap}")
print("[x] teks diisi")
time.sleep(1)

# Attach media — klik tombol media lalu fill input file
js('document.querySelector("[data-testid=\\"attachments\\"]")?.click()')
time.sleep(1)
fill_input('input[type="file"]', "{abs_file}")
print("[x] media di-attach")
time.sleep(4)

# Klik Post
ok = js('var b = document.querySelector("[data-testid=\\"tweetButton\\"]") || document.querySelector("[data-testid=\\"tweetButtonInline\\"]"); if(b){{ b.click(); return true; }} return false;')
print("[x] Post diklik:", ok)
time.sleep(4)
print("[x] URL:", page_info()['url'])
"""
    ok, out = run_browser(script)
    print(out)
    return ok


def upload_x_thread(tweets: list[str]) -> bool:
    """Post X thread — beberapa tweet berurutan."""
    if not tweets:
        print("[x-thread] ERROR: list tweet kosong")
        return False

    first = _q(tweets[0][:280])

    # Build add-tweet steps for tweet 2+
    replies_code = ""
    for i, t in enumerate(tweets[1:], 1):
        tq = _q(t[:280])
        replies_code += f"""
time.sleep(2)
js('document.querySelector("[data-testid=\\"addButton\\"]")?.click()')
time.sleep(1)
# Focus textarea terakhir yang ada
js('var tas = document.querySelectorAll("[data-testid^=\\"tweetTextarea_\\"]"); if(tas.length) tas[tas.length-1].focus();')
time.sleep(0.3)
type_text("{tq}")
print("[x-thread] tweet {i+1} diisi")
"""

    script = f"""
import time
new_tab("https://x.com/compose/post")
time.sleep(3)

# Tweet pertama
wait_for_element('[data-testid="tweetTextarea_0"]')
js('document.querySelector("[data-testid=\\"tweetTextarea_0\\"]").focus()')
time.sleep(0.3)
type_text("{first}")
print("[x-thread] tweet 1 diisi")
{replies_code}

# Post All
time.sleep(1)
ok = js('var b = document.querySelector("[data-testid=\\"tweetButton\\"]"); if(b){{ b.click(); return true; }} return false;')
print("[x-thread] Post All diklik:", ok)
time.sleep(5)
print("[x-thread] URL:", page_info()['url'])
"""
    ok, out = run_browser(script)
    print(out)
    return ok


# ── Threads ───────────────────────────────────────────────────────────────────

def upload_threads(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    cap = _q(caption[:500])
    script = f"""
import time
new_tab("https://www.threads.net/")
time.sleep(3)

# Klik area compose / new thread button
js('document.querySelector("[data-pressable-container=\\"true\\"]")?.click()')
time.sleep(1)

# Focus editor
wait_for_element('[data-lexical-editor="true"]')
js('document.querySelector("[data-lexical-editor=\\"true\\"]")?.focus()')
time.sleep(0.3)
type_text("{cap}")
print("[threads] teks diisi")
time.sleep(1)

# Attach media
fill_input('input[type="file"]', "{abs_file}")
print("[threads] media di-attach")
time.sleep(4)

# Klik Post
ok = js('''
var btns = Array.from(document.querySelectorAll('[role="button"]'));
var b = btns.find(x => x.textContent.trim() === "Post");
if(!b) b = document.querySelector('[data-testid="submitButton"]');
if(b){{ b.click(); return true; }} return false;
''')
print("[threads] Post diklik:", ok)
time.sleep(4)
print("[threads] URL:", page_info()['url'])
"""
    ok, out = run_browser(script)
    print(out)
    return ok


# ── YouTube ───────────────────────────────────────────────────────────────────

def upload_youtube(file: Path, caption: str, thumbnail: Path | None = None) -> bool:
    abs_file = str(file.resolve())
    cap = _q(caption[:100])
    desc = _q(caption)
    script = f"""
import time
new_tab("https://studio.youtube.com/")
time.sleep(3)

# Klik CREATE → Upload videos
js('document.querySelector("[aria-label=\\"Create\\"]")?.click()')
time.sleep(1)
js('document.querySelector("[aria-label=\\"Upload videos\\"]")?.click()')
time.sleep(2)

# Upload file
fill_input('input[type="file"]', "{abs_file}")
print("[yt] file di-set")
time.sleep(10)

# Isi judul (textbox pertama)
wait_for_element('#textbox')
js('var boxes = document.querySelectorAll("#textbox"); if(boxes[0]){{ boxes[0].focus(); boxes[0].select(); }}')
time.sleep(0.3)
type_text("{cap}")
print("[yt] judul diisi")
time.sleep(1)

# Isi deskripsi (textbox kedua)
js('var boxes = document.querySelectorAll("#textbox"); if(boxes.length > 1){{ boxes[1].focus(); }}')
time.sleep(0.3)
type_text("{desc}")
print("[yt] deskripsi diisi")
time.sleep(1)

# Klik Next x3 lalu Publish
for step_name in ["Details", "Video elements", "Checks"]:
    time.sleep(2)
    js('document.querySelector("[aria-label=\\"Next\\"]")?.click()')
    print(f"[yt] Next ({{step_name}})")

time.sleep(2)
# Set public visibility
js('var radio = document.querySelector("tp-yt-paper-radio-button[name=\\"PUBLIC\\"]"); if(radio) radio.click();')
time.sleep(1)

# Publish / Done
ok = js('var btn = document.querySelector("#done-button"); if(btn){{ btn.click(); return true; }} return false;')
print("[yt] Publish diklik:", ok)
if not ok:
    print("[yt] WARNING: tombol Publish tidak ditemukan — klik manual di browser")
time.sleep(6)
print("[yt] URL:", page_info()['url'])
"""
    ok, out = run_browser(script)
    print(out)
    return ok


# ── Facebook ──────────────────────────────────────────────────────────────────

def upload_facebook(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    cap = _q(caption)
    script = f"""
import time
new_tab("https://www.facebook.com/")
time.sleep(3)

# Klik Photo/Video post button
js('document.querySelector("[aria-label*=\\"Photo\\"]")?.click()')
time.sleep(1)

# Upload file
fill_input('input[type="file"]', "{abs_file}")
print("[fb] file di-set")
time.sleep(5)

# Isi caption
js('var el = document.querySelector("[data-testid=\\"status-attachment-mentions-input\\"]") || document.querySelector("[contenteditable=\\"true\\"]"); if(el) el.focus();')
time.sleep(0.3)
type_text("{cap}")
print("[fb] caption diisi")
time.sleep(1)

# Klik Post
ok = js('var b = document.querySelector("[aria-label=\\"Post\\"]"); if(b){{ b.click(); return true; }} return false;')
print("[fb] Post diklik:", ok)
time.sleep(5)
print("[fb] URL:", page_info()['url'])
"""
    ok, out = run_browser(script)
    print(out)
    return ok


# ── Main ──────────────────────────────────────────────────────────────────────

PLATFORM_MAP = {
    "tiktok": upload_tiktok,
    "instagram": upload_instagram,
    "x": upload_x,
    "threads": upload_threads,
    "facebook": upload_facebook,
    "youtube": upload_youtube,
}


def main():
    load_env()
    ap = argparse.ArgumentParser(description="Upload konten ke sosmed via browser automation")
    ap.add_argument("--file", required=True)
    ap.add_argument("--caption", default="", help="Caption / teks post (tidak wajib untuk --mode thread)")
    ap.add_argument("--platforms", default="tiktok,instagram,youtube,x,threads")
    ap.add_argument("--thumbnail", help="Thumbnail untuk YouTube")
    ap.add_argument("--mode", choices=["video", "thread"], default="video",
                    help="video = upload file; thread = post JSON thread ke X")
    args = ap.parse_args()

    file = Path(args.file)
    if not file.exists():
        print(f"ERROR: file tidak ditemukan: {file}", file=sys.stderr)
        sys.exit(1)

    platforms = [p.strip().lower() for p in args.platforms.split(",")]
    thumbnail = Path(args.thumbnail) if args.thumbnail else None

    print(f"\n=== Exiom Publisher ===")
    print(f"Mode    : {args.mode}")
    print(f"File    : {file}")
    print(f"Platform: {', '.join(platforms)}")
    if args.caption:
        print(f"Caption : {args.caption[:80]}{'...' if len(args.caption) > 80 else ''}")
    print()

    if not ensure_chrome():
        sys.exit(1)

    # Mode thread — hanya untuk X
    if args.mode == "thread":
        if "x" not in platforms:
            print("ERROR: --mode thread hanya untuk platform x", file=sys.stderr)
            sys.exit(1)
        try:
            tweets_data = json.loads(file.read_text())
            tweets = [item.get("tweet", item.get("text", "")) for item in tweets_data]
            tweets = [t for t in tweets if t]
        except Exception as e:
            print(f"ERROR: gagal parse JSON thread: {e}", file=sys.stderr)
            sys.exit(1)
        print(f"Thread  : {len(tweets)} tweet")
        ok = upload_x_thread(tweets)
        print("\n=== Hasil ===")
        print(f"  x-thread   {'OK' if ok else 'GAGAL'}")
        return

    # Mode video
    results = {}
    for platform in platforms:
        if platform not in PLATFORM_MAP:
            print(f"[SKIP] Platform tidak dikenal: {platform}")
            continue
        print(f"[>>] Mengupload ke {platform.upper()}...")
        fn = PLATFORM_MAP[platform]
        try:
            if platform == "youtube":
                ok = fn(file, args.caption, thumbnail)
            else:
                ok = fn(file, args.caption)
        except Exception as e:
            print(f"[{platform}] ERROR: {e}")
            ok = False
        results[platform] = "OK" if ok else "GAGAL"
        time.sleep(2)

    print("\n=== Hasil ===")
    for p, r in results.items():
        print(f"  {p:12} {r}")


if __name__ == "__main__":
    main()
