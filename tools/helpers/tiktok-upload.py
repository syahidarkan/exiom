#!/usr/bin/env python3
"""
TikTok Content Posting API — upload video dari workspace/deril/output/
Dibaca dari .env di root project (bukan hardcoded).

Env vars yang dibutuhkan di .env:
  TIKTOK_ACCESS_TOKEN   — user OAuth token (scope: video.publish, video.upload)
  TIKTOK_CLIENT_KEY     — dari TikTok Developer app
  TIKTOK_CLIENT_SECRET  — dari TikTok Developer app

Usage:
  python3 tools/helpers/tiktok-upload.py \
    --video workspace/deril/output/tiktok-21okt-v2.mp4 \
    --caption "Caption TikTok kamu" \
    --mode direct_post   # atau: upload_draft
"""

import argparse
import json
import os
import sys
from pathlib import Path

# ── Load .env (baris KEY=VALUE, no quotes stripping) ──────────────────────────
def load_env(env_path: Path) -> dict:
    env = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, _, v = line.partition('=')
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env

PROJECT_ROOT = Path(__file__).parent.parent
env = {**os.environ, **load_env(PROJECT_ROOT / '.env')}

TIKTOK_ACCESS_TOKEN  = env.get('TIKTOK_ACCESS_TOKEN', '')
TIKTOK_CLIENT_KEY    = env.get('TIKTOK_CLIENT_KEY', '')


def die(msg: str):
    print(f'[ERROR] {msg}', file=sys.stderr)
    sys.exit(1)


def check_env():
    if not TIKTOK_ACCESS_TOKEN:
        die(
            'TIKTOK_ACCESS_TOKEN belum ada di .env\n'
            'Lakukan OAuth dulu:\n'
            '  1. Buka TikTok Developer Portal → app kamu\n'
            '  2. Generate user token dengan scope: video.publish, video.upload\n'
            '  3. Taruh TIKTOK_ACCESS_TOKEN=<token> di .env'
        )
    if not TIKTOK_CLIENT_KEY:
        die('TIKTOK_CLIENT_KEY belum ada di .env')


def query_creator_info() -> dict:
    import urllib.request
    req = urllib.request.Request(
        'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
        data=b'{}',
        headers={
            'Authorization': f'Bearer {TIKTOK_ACCESS_TOKEN}',
            'Content-Type': 'application/json; charset=UTF-8',
        },
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def init_upload(video_path: Path, caption: str, mode: str) -> dict:
    import urllib.request
    size = video_path.stat().st_size
    payload = {
        'post_info': {
            'title': caption[:150],
            'privacy_level': 'SELF_ONLY',  # draft aman, ubah ke PUBLIC_TO_EVERYONE kalau siap
            'disable_duet': False,
            'disable_comment': False,
            'disable_stitch': False,
            'video_cover_timestamp_ms': 1000,
        },
        'source_info': {
            'source': 'FILE_UPLOAD',
            'video_size': size,
            'chunk_size': size,
            'total_chunk_count': 1,
        },
    }
    if mode == 'upload_draft':
        payload['post_mode'] = 'MEDIA_UPLOAD'
    else:
        payload['post_mode'] = 'DIRECT_POST'

    req = urllib.request.Request(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        data=json.dumps(payload).encode(),
        headers={
            'Authorization': f'Bearer {TIKTOK_ACCESS_TOKEN}',
            'Content-Type': 'application/json; charset=UTF-8',
        },
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def upload_chunk(upload_url: str, video_path: Path):
    import urllib.request
    data = video_path.read_bytes()
    size = len(data)
    req = urllib.request.Request(
        upload_url,
        data=data,
        headers={
            'Content-Type': 'video/mp4',
            'Content-Length': str(size),
            'Content-Range': f'bytes 0-{size - 1}/{size}',
        },
        method='PUT',
    )
    with urllib.request.urlopen(req) as resp:
        status = resp.status
    print(f'[upload] HTTP {status}')
    if status not in (200, 201, 206):
        die(f'Upload chunk gagal: HTTP {status}')


def check_status(publish_id: str) -> dict:
    import urllib.request
    req = urllib.request.Request(
        'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
        data=json.dumps({'publish_id': publish_id}).encode(),
        headers={
            'Authorization': f'Bearer {TIKTOK_ACCESS_TOKEN}',
            'Content-Type': 'application/json; charset=UTF-8',
        },
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--video', required=True)
    parser.add_argument('--caption', default='Exiom | Tips usaha kecil')
    parser.add_argument('--mode', choices=['direct_post', 'upload_draft'], default='upload_draft',
                        help='upload_draft = masuk inbox TikTok (aman), direct_post = langsung publish')
    args = parser.parse_args()

    check_env()

    video_path = Path(args.video)
    if not video_path.is_absolute():
        video_path = PROJECT_ROOT / args.video
    if not video_path.exists():
        die(f'File tidak ditemukan: {video_path}')

    size_mb = video_path.stat().st_size / 1_048_576
    print(f'[info] video: {video_path.name} ({size_mb:.1f} MB)')
    print(f'[info] mode: {args.mode}')
    print(f'[info] caption: {args.caption[:60]}...')

    # Step 1: init
    print('[1/3] Init upload...')
    init_resp = init_upload(video_path, args.caption, args.mode)
    if init_resp.get('error', {}).get('code', 'ok') != 'ok':
        die(f'Init gagal: {json.dumps(init_resp["error"])}')

    data       = init_resp['data']
    publish_id = data['publish_id']
    upload_url = data['upload_url']
    print(f'[1/3] publish_id: {publish_id}')

    # Step 2: upload
    print('[2/3] Upload file...')
    upload_chunk(upload_url, video_path)

    # Step 3: cek status
    print('[3/3] Cek status...')
    import time
    for attempt in range(10):
        time.sleep(3)
        status_resp = check_status(publish_id)
        status = status_resp.get('data', {}).get('status', 'UNKNOWN')
        print(f'      status: {status}')
        if status in ('PUBLISH_COMPLETE', 'SEND_TO_USER_INBOX'):
            break
        if status in ('FAILED', 'PUBLISH_FAILED'):
            die(f'Upload/publish gagal: {json.dumps(status_resp)}')

    print('\n✅ Selesai!')
    if args.mode == 'upload_draft':
        print('   Video ada di TikTok Inbox — publish manual dari app TikTok.')
    else:
        print('   Video langsung dipublish ke TikTok.')
    print(f'   publish_id: {publish_id}')


if __name__ == '__main__':
    main()
