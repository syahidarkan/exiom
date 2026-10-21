#!/usr/bin/env python3
"""Post X thread via browser-use (CDP). Verifikasi isi tiap tweet sebelum Post All."""
import json, subprocess, sys, os
from pathlib import Path

CDP = os.environ.get("BU_CDP_URL", "http://127.0.0.1:9222")
tweets = [t["tweet"] for t in json.loads(Path(sys.argv[1]).read_text()) if t.get("tweet")]
assert tweets and all(len(t) <= 280 for t in tweets), "tweet kosong / lebih dari 280 char"

def run(code):
    env = dict(os.environ, BU_CDP_URL=CDP)
    r = subprocess.run(["browser-use"], input=code, capture_output=True, text=True, env=env, timeout=240)
    return r.returncode, r.stdout + r.stderr

tw = json.dumps(tweets)  # aman untuk di-embed sebagai literal Python
step1 = f"""
import time, json
tweets = json.loads({json.dumps(tw)})
new_tab("https://x.com/compose/post")
time.sleep(4)
for i, t in enumerate(tweets):
    if i > 0:
        js('(function(){{ var b=document.querySelector("[data-testid=\\\\"addButton\\\\"]"); if(b) b.click(); }})()')
        time.sleep(1.5)
    js('(function(){{ var tas=document.querySelectorAll("[data-testid^=\\\\"tweetTextarea_\\\\"]"); if(tas.length) tas[tas.length-1].focus(); }})()')
    time.sleep(0.4)
    type_text(t)
    time.sleep(1)
    print("filled", i+1)
n = js('document.querySelectorAll("[data-testid^=\\\\"tweetTextarea_\\\\"]").length')
print("TEXTAREA_COUNT", n)
vals = js('Array.from(document.querySelectorAll("[data-testid^=\\\\"tweetTextarea_\\\\"]")).map(e=>e.innerText.trim())')
print("VALUES_JSON", json.dumps(vals))
"""
rc, out = run(step1)
print(out[-3000:])
vals_line = [l for l in out.splitlines() if l.startswith("VALUES_JSON")]
if rc != 0 or not vals_line:
    print("ABORT: gagal mengisi tweet, Post All TIDAK diklik"); sys.exit(2)
got = json.loads(vals_line[0].split(" ", 1)[1])
norm = lambda s: " ".join(s.split())
mismatch = [i for i, (g, e) in enumerate(zip(got, tweets)) if norm(g) != norm(e)]
if len(got) != len(tweets) or mismatch:
    print(f"ABORT: verifikasi gagal. jumlah={len(got)} mismatch={mismatch}. Post All TIDAK diklik"); sys.exit(3)
print("VERIFIED: semua", len(tweets), "tweet cocok dengan draft")
step2 = """
import time
ok = js('(function(){ var b=document.querySelector("[data-testid=\\\\"tweetButton\\\\"]"); if(b){ b.click(); return true;} return false; })()')
print("POST_ALL_CLICKED", ok)
time.sleep(6)
print("URL", page_info()["url"])
"""
rc2, out2 = run(step2)
print(out2[-2000:])
sys.exit(0 if rc2 == 0 else 4)
