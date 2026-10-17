#!/usr/bin/env python3
"""
Gagah Tool: SEO research helpers — Reddit, Google Search Console, Google Trends
Usage:
  python3 gagah-seo.py reddit "web development indonesia" --limit 50
  python3 gagah-seo.py trends "jasa website" --geo ID
  python3 gagah-seo.py gsc --site https://exiom.id --days 28
"""
import sys, json, argparse, os

def reddit_search(query: str, subreddits: list, limit: int = 50, sort: str = "relevance"):
    import praw
    client_id     = os.environ.get("REDDIT_CLIENT_ID", "")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET", "")
    user_agent    = os.environ.get("REDDIT_USER_AGENT", "exiom-seo-bot/1.0")

    if not client_id or not client_secret:
        print("Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env", file=sys.stderr)
        sys.exit(1)

    r = praw.Reddit(client_id=client_id, client_secret=client_secret, user_agent=user_agent)
    results = []
    search_scope = "+".join(subreddits) if subreddits else "all"
    for post in r.subreddit(search_scope).search(query, sort=sort, limit=limit):
        results.append({
            "title": post.title,
            "score": post.score,
            "comments": post.num_comments,
            "url": post.url,
            "selftext": post.selftext[:200],
            "subreddit": str(post.subreddit),
        })
    print(json.dumps(results, indent=2, ensure_ascii=False))

def gsc_report(site_url: str, days: int = 28):
    """Fetch Search Console performance data"""
    try:
        import searchconsole
    except ImportError:
        print("searchconsole not installed. Run: bash tools/install-tools.sh --agent gagah", file=sys.stderr)
        sys.exit(1)

    from datetime import date, timedelta
    end_date   = date.today()
    start_date = end_date - timedelta(days=days)

    # credentials from google service account or OAuth
    creds_path = os.environ.get("GDRIVE_SERVICE_ACCOUNT_PATH", "")
    if not creds_path:
        print("Set GDRIVE_SERVICE_ACCOUNT_PATH in .env", file=sys.stderr)
        sys.exit(1)

    account = searchconsole.authenticate(service_account=creds_path)
    prop    = account[site_url]
    report  = prop.query.range(str(start_date), str(end_date)).dimension("query").limit(20).get()
    rows = [{"query": r.query, "clicks": r.clicks, "impressions": r.impressions,
             "ctr": round(r.ctr * 100, 2), "position": round(r.position, 1)} for r in report.rows]
    print(json.dumps(rows, indent=2, ensure_ascii=False))

def trends(keyword: str, geo: str = "ID", timeframe: str = "today 3-m"):
    from pytrends.request import TrendReq
    pt = TrendReq(hl="id-ID", tz=420)
    pt.build_payload([keyword], timeframe=timeframe, geo=geo)
    related = pt.related_queries()
    rising  = related[keyword]["rising"]
    top     = related[keyword]["top"]
    result = {
        "keyword": keyword,
        "related_rising": rising.head(10).to_dict("records") if rising is not None else [],
        "related_top":    top.head(10).to_dict("records") if top is not None else [],
    }
    print(json.dumps(result, default=str, indent=2))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd")

    r = sub.add_parser("reddit")
    r.add_argument("query")
    r.add_argument("--subreddits", nargs="*", default=[])
    r.add_argument("--limit", type=int, default=50)
    r.add_argument("--sort", default="relevance", choices=["relevance","new","top","hot"])

    g = sub.add_parser("gsc")
    g.add_argument("--site", required=True)
    g.add_argument("--days", type=int, default=28)

    t = sub.add_parser("trends")
    t.add_argument("keyword")
    t.add_argument("--geo", default="ID")
    t.add_argument("--timeframe", default="today 3-m")

    args = p.parse_args()
    if args.cmd == "reddit":
        reddit_search(args.query, args.subreddits, args.limit, args.sort)
    elif args.cmd == "gsc":
        gsc_report(args.site, args.days)
    elif args.cmd == "trends":
        trends(args.keyword, args.geo, args.timeframe)
    else:
        p.print_help()
