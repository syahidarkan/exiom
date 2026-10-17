#!/usr/bin/env python3
"""
Joce Tool: Google Maps lead scraper + email validator
Usage:
  python3 joce-leads.py maps "digital agency Jakarta" --limit 20 --out leads.json
  python3 joce-leads.py validate-email info@example.com
  python3 joce-leads.py validate-email --batch leads.json
"""
import sys, json, argparse, subprocess, os

GMAPS_BIN = os.path.expanduser("~/.local/bin/google-maps-scraper")
CHECK_EMAIL_URL = "http://localhost:8989/v0/check_email"

def maps_scrape(query: str, limit: int = 20, out: str = None):
    """Run google-maps-scraper and capture output"""
    if not os.path.exists(GMAPS_BIN):
        print("ERROR: google-maps-scraper not installed. Run: bash tools/install-tools.sh --agent joce", file=sys.stderr)
        sys.exit(1)

    args_list = [GMAPS_BIN, "--query", query, "--max", str(limit), "--json"]
    result = subprocess.run(args_list, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print(f"ERROR: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(result.stdout)
    if out:
        with open(out, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✓ Saved {len(data)} leads to {out}")
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))

def validate_email(email: str):
    """Check email reachability via check-email Docker API"""
    import urllib.request, urllib.error
    payload = json.dumps({"to_email": email}).encode()
    req = urllib.request.Request(
        CHECK_EMAIL_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
        print(json.dumps({
            "email": email,
            "is_reachable": data.get("is_reachable"),
            "smtp": data.get("smtp", {}).get("can_connect_smtp"),
            "mx": data.get("mx", {}).get("accepts_mail"),
        }, indent=2))
    except urllib.error.URLError:
        print(f"WARNING: check-email service not running. Start with: docker compose -f tools/docker-compose.tools.yml up check-email -d")

def validate_batch(leads_file: str):
    with open(leads_file) as f:
        leads = json.load(f)
    emails = [l.get("email") for l in leads if l.get("email")]
    results = []
    for email in emails:
        import urllib.request, urllib.error, time
        payload = json.dumps({"to_email": email}).encode()
        req = urllib.request.Request(CHECK_EMAIL_URL, data=payload,
                                     headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
            results.append({"email": email, "is_reachable": data.get("is_reachable")})
        except Exception as e:
            results.append({"email": email, "error": str(e)})
        time.sleep(1)
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd")

    m = sub.add_parser("maps")
    m.add_argument("query")
    m.add_argument("--limit", type=int, default=20)
    m.add_argument("--out", default=None)

    v = sub.add_parser("validate-email")
    v.add_argument("email", nargs="?")
    v.add_argument("--batch", default=None)

    args = p.parse_args()
    if args.cmd == "maps":
        maps_scrape(args.query, args.limit, args.out)
    elif args.cmd == "validate-email":
        if args.batch:
            validate_batch(args.batch)
        elif args.email:
            validate_email(args.email)
        else:
            p.print_help()
    else:
        p.print_help()
