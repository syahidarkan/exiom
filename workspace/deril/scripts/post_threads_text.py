#!/usr/bin/env python3
"""Post Threads teks saja (tanpa media) via browser-use. Verifikasi editor sebelum Post."""
import subprocess, sys, os, json
from pathlib import Path
CDP = os.environ.get("BU_CDP_URL", "http://127.0.0.1:9222")
path = Path(sys.argv[1]).resolve()
text = path.read_text().strip()
assert len(text) <= 500, "teks Threads > 500 char"

def run(code):
    r = subprocess.run(["browser-use"], input=code, capture_output=True, text=True,
                       env=dict(os.environ, BU_CDP_URL=CDP), timeout=240)
    return r.returncode, r.stdout + r.stderr

S1 = '''
import time, json
new_tab("https://www.threads.net/")
time.sleep(4)
TEXT = open(PATH_PLACEHOLDER).read().strip()
print("LOC", js("location.href"))
print("HAS_EDITOR_BEFORE", js("!!document.querySelector('[data-lexical-editor=\\"true\\"]')"))
'''.replace("PATH_PLACEHOLDER", repr(str(path)))
rc, out = run(S1)
print(out[-1500:])
