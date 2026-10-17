#!/usr/bin/env python3
"""
Exiom Session Manager — simpan dan kelola browser session Playwright per platform.
Dipakai semua agent yang butuh login tanpa API key.

Usage:
  python3 session-manager.py save reddit     # buka browser, login manual, simpan session
  python3 session-manager.py save x          # login X/Twitter
  python3 session-manager.py save instagram
  python3 session-manager.py save tiktok
  python3 session-manager.py status          # cek semua session masih valid
  python3 session-manager.py status reddit
  python3 session-manager.py import-cookies <platform> <cookies.txt>
"""
import sys, os, json, argparse, time
from pathlib import Path

SESSIONS_DIR = Path(__file__).parent.parent / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

PLATFORMS = {
    "reddit":    {"url": "https://www.reddit.com/login",       "check_url": "https://www.reddit.com/", "check_sel": '[data-testid="reddit-avatar"]'},
    "x":         {"url": "https://x.com/login",                "check_url": "https://x.com/home",      "check_sel": '[data-testid="SideNav_NewTweet_Button"]'},
    "instagram": {"url": "https://www.instagram.com/accounts/login", "check_url": "https://www.instagram.com/", "check_sel": 'svg[aria-label="Home"]'},
    "tiktok":    {"url": "https://www.tiktok.com/login",       "check_url": "https://www.tiktok.com/", "check_sel": '[data-e2e="profile-icon"]'},
    "threads":   {"url": "https://www.threads.net/login",      "check_url": "https://www.threads.net/", "check_sel": None},
    "youtube":   {"url": "https://accounts.google.com",        "check_url": "https://youtube.com/",    "check_sel": 'button[aria-label*="Google Account"]'},
    "linkedin":  {"url": "https://www.linkedin.com/login",     "check_url": "https://linkedin.com/feed", "check_sel": '[data-test-id="nav-settings__dropdown-trigger"]'},
}


def get_playwright():
    try:
        from playwright.sync_api import sync_playwright
        return sync_playwright
    except ImportError:
        print("playwright not installed. Run: pip3 install playwright && python3 -m playwright install chromium")
        sys.exit(1)


def save_session(platform: str):
    """Open browser headed, let user log in manually, then save the session."""
    cfg = PLATFORMS.get(platform)
    if not cfg:
        print(f"Unknown platform: {platform}. Available: {', '.join(PLATFORMS)}")
        sys.exit(1)

    session_file = SESSIONS_DIR / f"{platform}.json"
    sync_playwright = get_playwright()

    print(f"Opening browser for {platform}...")
    print("Log in manually, then press Enter here when done.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])
        ctx = browser.new_context(viewport=None)
        page = ctx.new_page()
        page.goto(cfg["url"])

        input(f"\n[{platform}] Login in the browser, then press Enter to save session... ")

        ctx.storage_state(path=str(session_file))
        print(f"✓ Session saved: {session_file}")
        browser.close()


def import_cookies(platform: str, cookies_file: str):
    """Convert Netscape cookies.txt to Playwright storage state."""
    domain_map = {
        "reddit":    [".reddit.com", "reddit.com"],
        "x":         [".x.com", "x.com", ".twitter.com"],
        "instagram": [".instagram.com", "instagram.com"],
        "tiktok":    [".tiktok.com", "tiktok.com"],
        "threads":   [".threads.net", "threads.net"],
        "youtube":   [".youtube.com", ".google.com"],
        "linkedin":  [".linkedin.com"],
    }
    domains = domain_map.get(platform, [f".{platform}.com"])

    cookies = []
    with open(cookies_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 7:
                continue
            domain, _, path, secure, expires, name, value = parts[:7]
            if any(domain.endswith(d.lstrip(".")) or domain == d for d in domains):
                cookies.append({
                    "name":    name,
                    "value":   value,
                    "domain":  domain,
                    "path":    path,
                    "expires": int(expires) if expires.isdigit() else -1,
                    "httpOnly": False,
                    "secure":  secure.upper() == "TRUE",
                    "sameSite": "Lax",
                })

    if not cookies:
        print(f"No cookies found for platform '{platform}' domains: {domains}")
        sys.exit(1)

    session_file = SESSIONS_DIR / f"{platform}.json"
    state = {"cookies": cookies, "origins": []}
    with open(session_file, "w") as f:
        json.dump(state, f, indent=2)
    print(f"✓ Imported {len(cookies)} cookies → {session_file}")


def check_status(platform: str = None):
    """Check if saved sessions are still logged in."""
    targets = [platform] if platform else list(PLATFORMS.keys())
    sync_playwright = get_playwright()

    with sync_playwright() as p:
        for name in targets:
            session_file = SESSIONS_DIR / f"{name}.json"
            if not session_file.exists():
                print(f"  {name:12} ✗ no session saved")
                continue

            cfg = PLATFORMS.get(name, {})
            try:
                browser = p.chromium.launch(headless=True)
                ctx = browser.new_context(storage_state=str(session_file))
                page = ctx.new_page()
                page.goto(cfg.get("check_url", f"https://{name}.com"), timeout=15000)
                page.wait_for_timeout(2000)

                sel = cfg.get("check_sel")
                if sel:
                    el = page.query_selector(sel)
                    ok = el is not None
                else:
                    ok = name.lower() in page.url.lower()

                print(f"  {name:12} {'✅ logged in' if ok else '❌ session expired'}")
                browser.close()
            except Exception as e:
                print(f"  {name:12} ⚠ error: {e}")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Exiom Browser Session Manager")
    sub = p.add_subparsers(dest="cmd")

    sv = sub.add_parser("save", help="Open browser and save session after manual login")
    sv.add_argument("platform", choices=list(PLATFORMS.keys()))

    ic = sub.add_parser("import-cookies", help="Import Netscape cookies.txt as Playwright session")
    ic.add_argument("platform", choices=list(PLATFORMS.keys()))
    ic.add_argument("cookies_file")

    st = sub.add_parser("status", help="Check if saved sessions are still valid")
    st.add_argument("platform", nargs="?", default=None)

    args = p.parse_args()
    if args.cmd == "save":
        save_session(args.platform)
    elif args.cmd == "import-cookies":
        import_cookies(args.platform, args.cookies_file)
    elif args.cmd == "status":
        check_status(args.platform)
    else:
        p.print_help()
