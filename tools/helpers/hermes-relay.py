#!/usr/bin/env python3
"""
hermes-relay.py — HTTP relay untuk kirim prompt ke Hermes agent dari dashboard.

Jalankan sekali di background:
  python3 tools/helpers/hermes-relay.py &

Atau tambah ke autostart desktop:
  ~/.config/autostart/hermes-relay.desktop

Dashboard POST ke http://127.0.0.1:3100/send:
  { "agent": "mia", "prompt": "Cek approval queue kamu dan lanjutkan." }
"""
from __future__ import annotations
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

PORT      = int(os.environ.get('RELAY_PORT', '3100'))
VALID     = {'kenzie','adi','mia','deril','gagah','nela','ale','joce','hugo'}
HERMES    = os.environ.get('HERMES_BIN',  str(Path.home() / '.local/bin/hermes'))
WORKDIR   = os.environ.get('OFFICE_ROOT', str(Path.home() / 'pemrograman/virtual office agent'))
HERMES_ENV = {**os.environ, 'HERMES_HOME': str(Path.home() / '.hermes')}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # noqa: suppress default access log
        print(f'[relay] {self.address_string()} {fmt % args}', flush=True)

    def send_json(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path != '/send':
            self.send_json(404, {'error': 'not found'})
            return
        length = int(self.headers.get('Content-Length', 0))
        body   = json.loads(self.rfile.read(length))
        agent  = body.get('agent', '').strip().lower()
        prompt = body.get('prompt', '').strip()

        if agent not in VALID:
            self.send_json(400, {'error': f'agent tidak valid: {agent}'})
            return
        if len(prompt) < 3:
            self.send_json(400, {'error': 'prompt terlalu pendek'})
            return

        print(f'[relay] → hermes -p {agent} chat -q "{prompt[:80]}…" -Q', flush=True)
        log_path = Path(WORKDIR) / 'workspace' / agent / f'relay_{agent}.log'
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_file = open(log_path, 'a')
        subprocess.Popen(
            [HERMES, '-p', agent, 'chat', '-q', prompt, '-Q'],
            cwd=WORKDIR,
            env=HERMES_ENV,
            stdout=log_file,
            stderr=log_file,
        )
        self.send_json(200, {'ok': True, 'agent': agent})

    def do_GET(self):
        if self.path == '/health':
            self.send_json(200, {'ok': True, 'port': PORT})
        else:
            self.send_json(404, {'error': 'not found'})


if __name__ == '__main__':
    HTTPServer.allow_reuse_address = True
    server = HTTPServer(('127.0.0.1', PORT), Handler)
    print(f'[hermes-relay] listening on http://127.0.0.1:{PORT}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[hermes-relay] stopped')
        sys.exit(0)
