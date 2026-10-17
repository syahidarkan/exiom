#!/usr/bin/env python3
"""
Gagah Tool: SEO research — Reddit scraping (via SearXNG + Playwright session),
Google Search Console, Google Trends.

No Reddit API key needed. Uses:
  1. SearXNG (localhost:8080) to search Reddit content via Google
  2. Playwright browser session (saved cookies) for deep scraping
  3. Google Trends (pytrends, no auth)
  4. Google Search Console (service account)

Usage:
  python3 gagah-seo.py reddit "web development indonesia" --limit 20
  python3 gagah-seo.py reddit-deep "r/Entrepreneur" --sort hot --limit 30
  python3 gagah-seo.py trends "jasa website" --geo ID
  python3 gagah-seo.py gsc --site https://exiom.id --days 28
"""
import sys, json, argparse, os, urllib.request, urllib.parse, time

SEARXNG_URL = os.environ.get("SEARXNG_URL", "http://localhost:8080")
SESSIONS_DIR = os.path.join(os.path.dirname(__file__), "../../tools/sessions")


# ─── Reddit via SearXNG (no API key) ─────────────────────────────────────────
def reddit_search(query: str, limit: int = 20, subreddit: str = ""):
    """Search Reddit posts via SearXNG → Google without any API key."""
    site_filter = f"site:reddit.com/r/{subreddit}" if subreddit else "site:reddit.com"
    full_query = urllib.parse.urlencode({
        "q": f"{site_filter} {query}",
        "format": "json",
        "language": "id-ID",
        "pageno": 1,
    })
    url = f"{SEARXNG_URL}/search?{full_query}"
    headers = {"User-Agent": "Mozilla/5.0 exiom-bot/1.0"}
    results = []
    page = 1
    while len(results) < limit:
        paged = url + f"&pageno={page}"
        try:
            req = urllib.request.Request(paged, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as r:
                data = json.loads(r.read())
        except Exception as e:
            print(f"SearXNG error: {e}", file=sys.stderr)
            break

        hits = [h for h in data.get("results", []) if "reddit.com" in h.get("url", "")]
        if not hits:
            break
        for h in hits:
            results.append({
                "title":   h.get("title", ""),
                "url":     h.get("url", ""),
                "snippet": h.get("content", "")[:200],
                "engine":  h.get("engine", ""),
            })
        page += 1
        if page > 5:
            break
        time.sleep(0.5)

    print(json.dumps(results[:limit], indent=2, ensure_ascii=False))


# ─── Reddit deep scrape via Playwright (reads full post text + comments) ──────
def reddit_deep(target: str, sort: str = "hot", limit: int = 20):
    """
    Scrape Reddit subreddit/post using Playwright.
    Saves session in tools/sessions/reddit.json for reuse.
    First run: will open browser visibly if no session saved.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright not installed. Run: python3 -m playwright install chromium", file=sys.stderr)
        sys.exit(1)

    os.makedirs(SESSIONS_DIR, exist_ok=True)
    session_file = os.path.join(SESSIONS_DIR, "reddit.json")

    with sync_playwright() as p:
        # Launch headless if session exists, headed if first time
        headless = os.path.exists(session_file)
        browser = p.chromium.launch(headless=headless)

        if os.path.exists(session_file):
            ctx = browser.new_context(storage_state=session_file)
        else:
            ctx = browser.new_context()

        page = ctx.new_page()

        if target.startswith("r/"):
            url = f"https://www.reddit.com/{target}/?sort={sort}"
        elif target.startswith("http"):
            url = target
        else:
            url = f"https://www.reddit.com/r/{target}/?sort={sort}"

        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)

        # Save session after first successful load
        ctx.storage_state(path=session_file)
        print(f"Session saved to {session_file}", file=sys.stderr)

        # Extract posts using Reddit's JSON API endpoint
        json_url = url.rstrip("/") + ".json?limit=" + str(min(limit, 100))
        page.goto(json_url)
        content = page.content()

        # Parse JSON from page body
        import re
        match = re.search(r'<pre[^>]*>(\{.*\})</pre>', content, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
            posts = []
            for child in data.get("data", {}).get("children", []):
                d = child.get("data", {})
                posts.append({
                    "title":    d.get("title", ""),
                    "score":    d.get("score", 0),
                    "comments": d.get("num_comments", 0),
                    "url":      f"https://reddit.com{d.get('permalink', '')}",
                    "selftext": d.get("selftext", "")[:300],
                    "flair":    d.get("link_flair_text", ""),
                })
            print(json.dumps(posts, indent=2, ensure_ascii=False))
        else:
            # Fallback: extract from rendered page
            titles = page.query_selector_all('h3, [data-testid="post-title"]')
            posts = [{"title": t.inner_text()} for t in titles[:limit]]
            print(json.dumps(posts, indent=2, ensure_ascii=False))

        browser.close()


# ─── Google Trends ────────────────────────────────────────────────────────────
def trends(keyword: str, geo: str = "ID", timeframe: str = "today 3-m"):
    try:
        from pytrends.request import TrendReq
    except ImportError:
        print("pytrends not installed. Run: pip install pytrends", file=sys.stderr)
        sys.exit(1)

    pt = TrendReq(hl="id-ID", tz=420)
    pt.build_payload([keyword], timeframe=timeframe, geo=geo)
    related = pt.related_queries()
    result = {
        "keyword": keyword,
        "related_rising": (related[keyword]["rising"].head(10).to_dict("records")
                           if related[keyword]["rising"] is not None else []),
        "related_top":    (related[keyword]["top"].head(10).to_dict("records")
                           if related[keyword]["top"] is not None else []),
    }
    print(json.dumps(result, default=str, indent=2))


# ─── Google Search Console ────────────────────────────────────────────────────
def gsc_report(site_url: str, days: int = 28):
    try:
        import searchconsole
    except ImportError:
        print("searchconsole not installed.", file=sys.stderr)
        sys.exit(1)

    from datetime import date, timedelta
    end_date   = date.today()
    start_date = end_date - timedelta(days=days)
    creds_path = os.environ.get("GDRIVE_SERVICE_ACCOUNT_PATH", "")
    if not creds_path:
        print("Set GDRIVE_SERVICE_ACCOUNT_PATH in .env", file=sys.stderr)
        sys.exit(1)

    account = searchconsole.authenticate(service_account=creds_path)
    prop    = account[site_url]
    report  = prop.query.range(str(start_date), str(end_date)).dimension("query").limit(20).get()
    rows = [{"query": r.query, "clicks": r.clicks, "impressions": r.impressions,
             "ctr": round(r.ctr * 100, 2), "position": round(r.position, 1)}
            for r in report.rows]
    print(json.dumps(rows, indent=2, ensure_ascii=False))


# ─── SearXNG general search ───────────────────────────────────────────────────
def search(query: str, limit: int = 10, engines: str = ""):
    params = {"q": query, "format": "json", "language": "id-ID"}
    if engines:
        params["engines"] = engines
    url = f"{SEARXNG_URL}/search?{urllib.parse.urlencode(params)}"
    headers = {"User-Agent": "Mozilla/5.0 exiom-bot/1.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.loads(r.read())
    results = data.get("results", [])[:limit]
    print(json.dumps([{
        "title":   h.get("title", ""),
        "url":     h.get("url", ""),
        "snippet": h.get("content", "")[:200],
    } for h in results], indent=2, ensure_ascii=False))


# ─── CLI ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Gagah SEO Research Tools")
    sub = p.add_subparsers(dest="cmd")

    r = sub.add_parser("reddit", help="Search Reddit via SearXNG (no API key)")
    r.add_argument("query")
    r.add_argument("--limit", type=int, default=20)
    r.add_argument("--subreddit", default="")

    rd = sub.add_parser("reddit-deep", help="Deep scrape Reddit via Playwright browser session")
    rd.add_argument("target", help="e.g. r/Entrepreneur or full URL")
    rd.add_argument("--sort", default="hot", choices=["hot","new","top","rising"])
    rd.add_argument("--limit", type=int, default=20)

    s = sub.add_parser("search", help="General search via SearXNG")
    s.add_argument("query")
    s.add_argument("--limit", type=int, default=10)
    s.add_argument("--engines", default="")

    t = sub.add_parser("trends", help="Google Trends")
    t.add_argument("keyword")
    t.add_argument("--geo", default="ID")
    t.add_argument("--timeframe", default="today 3-m")

    g = sub.add_parser("gsc", help="Google Search Console report")
    g.add_argument("--site", required=True)
    g.add_argument("--days", type=int, default=28)

    args = p.parse_args()
    if args.cmd == "reddit":        reddit_search(args.query, args.limit, args.subreddit)
    elif args.cmd == "reddit-deep": reddit_deep(args.target, args.sort, args.limit)
    elif args.cmd == "search":      search(args.query, args.limit, args.engines)
    elif args.cmd == "trends":      trends(args.keyword, args.geo, args.timeframe)
    elif args.cmd == "gsc":         gsc_report(args.site, args.days)
    else:                           p.print_help()
