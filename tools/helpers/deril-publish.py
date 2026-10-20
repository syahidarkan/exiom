#!/usr/bin/env python3
"""
deril-publish.py — Upload video/image ke sosmed via browser automation (Chrome CDP)
Usage:
  python3 tools/helpers/deril-publish.py \
    --file out/video.mp4 \
    --caption "Teks caption #hashtag" \
    --platforms tiktok,instagram,youtube,x,threads,facebook \
    [--thumbnail out/thumb.jpg]  # untuk YouTube

Env vars yang dibutuhkan (sudah di .env):
  BU_CDP_URL=http://127.0.0.1:9222  (atau set di sini)
"""
from __future__ import annotations
import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

CDP_URL = os.environ.get("BU_CDP_URL", "http://127.0.0.1:9222")
CHROME_PROFILE = os.environ.get("CHROME_EXIOM_PROFILE", "/home/naca/.config/google-chrome-exiom")
CHROME_BIN = "/opt/google/chrome/chrome"

def ensure_chrome():
    """Pastikan Chrome CDP jalan. Launch otomatis kalau belum."""
    import urllib.request
    try:
        urllib.request.urlopen(CDP_URL + "/json/version", timeout=2)
        return True
    except Exception:
        pass

    print("[chrome] CDP tidak aktif, mencoba launch Chrome...")
    # Cari DISPLAY dari session grafis yang aktif
    display = ":0"
    try:
        result = subprocess.run(
            ["bash", "-c", "ls /tmp/.X11-unix/ 2>/dev/null | head -1 | sed 's/X/:/g'"],
            capture_output=True, text=True
        )
        if result.stdout.strip():
            display = result.stdout.strip()
    except Exception:
        pass

    env = os.environ.copy()
    env["DISPLAY"] = display

    subprocess.Popen(
        [
            CHROME_BIN,
            "--remote-debugging-port=9222",
            "--remote-debugging-address=0.0.0.0",
            f"--user-data-dir={CHROME_PROFILE}",
            "--no-first-run",
            "--minimized",
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Tunggu sampai CDP aktif, max 15 detik
    for i in range(15):
        time.sleep(1)
        try:
            urllib.request.urlopen(CDP_URL + "/json/version", timeout=2)
            print(f"[chrome] CDP aktif ({i+1}s)")
            return True
        except Exception:
            pass

    print("[chrome] GAGAL: Chrome tidak bisa dilaunch otomatis.")
    print(f"  Jalankan manual di terminal desktop:")
    print(f"  {CHROME_BIN} --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir={CHROME_PROFILE} &")
    return False

def load_env():
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))

def run_browser(script: str) -> tuple[bool, str]:
    env = os.environ.copy()
    env["BU_CDP_URL"] = CDP_URL
    result = subprocess.run(
        ["browser-use"],
        input=script,
        capture_output=True,
        text=True,
        env=env,
    )
    output = result.stdout + result.stderr
    return result.returncode == 0, output

def upload_tiktok(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    script = f"""
import time
# Buka TikTok upload page
switch_tab("tiktok.com")
goto_url("https://www.tiktok.com/tiktokstudio/upload?lang=id-ID")
time.sleep(3)

# Upload file
inp = find_element('input[type="file"]')
if inp:
    inp.send_keys("{abs_file}")
    print("File uploaded to TikTok")
    time.sleep(5)
else:
    # Coba klik area upload
    click('[class*="upload-area"]', by="css")
    time.sleep(1)
    inp = find_element('input[type="file"]')
    if inp:
        inp.send_keys("{abs_file}")
        time.sleep(5)

# Isi caption
cap_box = find_element('[data-text="true"]')
if not cap_box:
    cap_box = find_element('.caption-input', by="css")
if cap_box:
    cap_box.click()
    cap_box.clear()
    type_text("{caption.replace(chr(34), chr(39))}")
    print("Caption filled")

print(page_info()['url'])
print("TIKTOK: siap post — cek dulu di browser, lalu POST manual atau lanjutkan")
"""
    ok, out = run_browser(script)
    print(out)
    return ok

def upload_instagram(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    script = f"""
import time
switch_tab("instagram.com")
goto_url("https://www.instagram.com/")
time.sleep(2)

# Klik tombol Create/New Post
click('[aria-label="New post"]', by="css")
time.sleep(1)
if not find_element('[aria-label="New post"]'):
    click('svg[aria-label="New post"]', by="css")
time.sleep(1)

# Pilih file
inp = find_element('input[type="file"]')
if inp:
    inp.send_keys("{abs_file}")
    print("File uploaded to Instagram")
    time.sleep(4)

print(page_info()['url'])
print("INSTAGRAM: upload dimulai — lanjutkan manual di browser (crop → next → caption → share)")
"""
    ok, out = run_browser(script)
    print(out)
    return ok

def upload_x(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    script = f"""
import time
switch_tab("x.com")
goto_url("https://x.com/compose/post")
time.sleep(2)

# Isi teks
textarea = find_element('[data-testid="tweetTextarea_0"]')
if textarea:
    textarea.click()
    type_text("{caption.replace(chr(34), chr(39))[:280]}")
    time.sleep(1)

# Attach media
media_btn = find_element('[data-testid="attachments"]')
if media_btn:
    media_btn.click()
    time.sleep(1)
inp = find_element('input[type="file"]')
if inp:
    inp.send_keys("{abs_file}")
    print("Media attached to X")
    time.sleep(3)

print(page_info()['url'])
print("X: siap post — klik Post di browser atau lanjutkan")
"""
    ok, out = run_browser(script)
    print(out)
    return ok

def upload_threads(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    script = f"""
import time
switch_tab("threads.com")
goto_url("https://www.threads.com/")
time.sleep(2)

# Klik area compose
click('[data-pressable-container="true"]', by="css")
time.sleep(1)

# Isi teks
textarea = find_element('p[data-lexical-editor="true"]')
if not textarea:
    textarea = find_element('[contenteditable="true"]')
if textarea:
    textarea.click()
    type_text("{caption.replace(chr(34), chr(39))}")
    time.sleep(1)

# Attach media
inp = find_element('input[type="file"]')
if inp:
    inp.send_keys("{abs_file}")
    print("Media attached to Threads")
    time.sleep(3)

print("THREADS: siap post — cek di browser")
"""
    ok, out = run_browser(script)
    print(out)
    return ok

def upload_facebook(file: Path, caption: str) -> bool:
    abs_file = str(file.resolve())
    script = f"""
import time
switch_tab("facebook.com")
goto_url("https://www.facebook.com/")
time.sleep(2)

# Klik "Create post" / "Photo/video"
click('[aria-label*="photo"]', by="css")
time.sleep(1)
if not find_element('input[type="file"]'):
    click('[aria-label*="Video"]', by="css")
    time.sleep(1)

inp = find_element('input[type="file"]')
if inp:
    inp.send_keys("{abs_file}")
    print("File uploaded to Facebook")
    time.sleep(4)

print("FACEBOOK: upload dimulai — tambah caption dan post manual di browser")
"""
    ok, out = run_browser(script)
    print(out)
    return ok

def upload_youtube(file: Path, caption: str, thumbnail: Path | None = None) -> bool:
    abs_file = str(file.resolve())
    script = f"""
import time
switch_tab("youtube.com")
goto_url("https://studio.youtube.com/")
time.sleep(2)

# Klik tombol CREATE / UPLOAD
click('[aria-label="Create"]', by="css")
time.sleep(1)
click('[aria-label="Upload videos"]', by="css")
time.sleep(2)

inp = find_element('input[type="file"]')
if inp:
    inp.send_keys("{abs_file}")
    print("File uploaded to YouTube")
    time.sleep(8)

# Isi judul (field pertama)
title_el = find_element('#textbox')
if title_el:
    title_el.click()
    import pyperclip
    type_text("{caption[:100].replace(chr(34), chr(39))}")

print("YOUTUBE: upload berjalan — lanjutkan wizard (details→visibility) manual di browser")
"""
    ok, out = run_browser(script)
    print(out)
    return ok

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
    ap = argparse.ArgumentParser(description="Upload konten ke sosmed via browser")
    ap.add_argument("--file", required=True, help="Path ke video/image yang akan diupload")
    ap.add_argument("--caption", required=True, help="Caption / teks post")
    ap.add_argument("--platforms", default="tiktok,instagram,youtube,x,threads,facebook",
                    help="Platform yang dituju, dipisah koma")
    ap.add_argument("--thumbnail", help="Thumbnail untuk YouTube (opsional)")
    args = ap.parse_args()

    file = Path(args.file)
    if not file.exists():
        print(f"ERROR: file tidak ditemukan: {file}", file=sys.stderr)
        sys.exit(1)

    platforms = [p.strip().lower() for p in args.platforms.split(",")]
    thumbnail = Path(args.thumbnail) if args.thumbnail else None

    print(f"\n=== Exiom Publisher ===")
    print(f"File    : {file}")
    print(f"Platform: {', '.join(platforms)}")
    print(f"Caption : {args.caption[:80]}...")
    print()

    if not ensure_chrome():
        sys.exit(1)

    results = {}
    for platform in platforms:
        if platform not in PLATFORM_MAP:
            print(f"[SKIP] Platform tidak dikenal: {platform}")
            continue
        print(f"[>>] Mengupload ke {platform.upper()}...")
        fn = PLATFORM_MAP[platform]
        if platform == "youtube":
            ok = fn(file, args.caption, thumbnail)
        else:
            ok = fn(file, args.caption)
        results[platform] = "OK" if ok else "GAGAL"
        time.sleep(2)

    print("\n=== Hasil ===")
    for p, r in results.items():
        print(f"  {p:12} {r}")

if __name__ == "__main__":
    main()
