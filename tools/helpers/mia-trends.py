#!/usr/bin/env python3
"""
Mia Tool: Google Trends + Twitter/X scraper helper
Usage:
  python3 mia-trends.py trends "web development Indonesia" --timeframe "today 3-m"
  python3 mia-trends.py tweets "@keyword OR #topic" --limit 100
  python3 mia-trends.py search "jasa pembuatan website" --engine searxng
"""
import sys, json, argparse

def trends(keyword: str, timeframe: str = "today 3-m", geo: str = "ID"):
    from pytrends.request import TrendReq
    pt = TrendReq(hl="id-ID", tz=420)
    pt.build_payload([keyword], timeframe=timeframe, geo=geo)
    interest = pt.interest_over_time()
    related  = pt.related_queries()
    result = {
        "keyword": keyword,
        "interest": interest[keyword].tail(10).to_dict() if not interest.empty else {},
        "related_top": related[keyword]["top"].head(10).to_dict("records") if related[keyword]["top"] is not None else [],
    }
    print(json.dumps(result, default=str, indent=2))

def tweets(query: str, limit: int = 50):
    import asyncio
    import twscrape
    async def _run():
        api = twscrape.API()
        results = []
        async for tweet in api.search(query, limit=limit):
            results.append({
                "id": tweet.id,
                "text": tweet.rawContent,
                "user": tweet.user.username,
                "likes": tweet.likeCount,
                "retweets": tweet.retweetCount,
                "date": str(tweet.date),
            })
        print(json.dumps(results, indent=2))
    asyncio.run(_run())

def searxng_search(query: str, engine_url: str = "http://localhost:8080"):
    import urllib.request, urllib.parse
    params = urllib.parse.urlencode({"q": query, "format": "json", "language": "id-ID"})
    url = f"{engine_url}/search?{params}"
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.loads(r.read())
    for result in data.get("results", [])[:10]:
        print(f"- {result['title']}\n  {result['url']}\n  {result.get('content','')[:100]}\n")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd")

    t = sub.add_parser("trends")
    t.add_argument("keyword")
    t.add_argument("--timeframe", default="today 3-m")
    t.add_argument("--geo", default="ID")

    tw = sub.add_parser("tweets")
    tw.add_argument("query")
    tw.add_argument("--limit", type=int, default=50)

    s = sub.add_parser("search")
    s.add_argument("query")
    s.add_argument("--engine", default="http://localhost:8080")

    args = p.parse_args()
    if args.cmd == "trends":    trends(args.keyword, args.timeframe, args.geo)
    elif args.cmd == "tweets":  tweets(args.query, args.limit)
    elif args.cmd == "search":  searxng_search(args.query, args.engine)
    else: p.print_help()
