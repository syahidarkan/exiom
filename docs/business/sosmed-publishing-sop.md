# SOP Publikasi Sosial Media - Exiom

> Dipakai Deril (upload konten) dan Gagah (distribusi artikel). Semua upload wajib lewat approval Owner dulu - dokumen ini mengatur alur teknis setelah approval granted.

---

## 1. Alur Publikasi (selalu sama, tanpa kecuali)

```
Konten selesai diproduksi (Deril/Gagah)
       |
   Submit ke Mia QA
       |
   Submit ke Owner approval queue
       |
   TUNGGU approval Owner
       |
   Upload ke semua platform via API
       |
   Update content_calendar
       |
   Lapor hasil (link post per platform)
```

**Tidak boleh skip langkah mana pun**, termasuk step "tunggu approval". Kalau ada urgensi trend, lapor ke Mia - bukan langsung upload.

---

## 2. Spesifikasi per Platform

### Instagram (Graph API)

**API endpoint**: `POST /v21.0/{ig-user-id}/media` kemudian `POST /v21.0/{ig-user-id}/media_publish`

**Format yang bisa diupload**:
| Tipe | Format | Maks size | Durasi |
|---|---|---|---|
| Feed photo | JPG, PNG | 8MB | - |
| Carousel | JPG, PNG (maks 10 slide) | 8MB/slide | - |
| Reels | MP4, MOV | 1GB | 3 detik - 15 menit |
| Story | JPG, PNG, MP4 | 100MB | maks 60 detik |

**Caption**:
- Maks 2.200 karakter
- Hashtag: 20-30 yang relevan, taruh di akhir atau komentar pertama
- Tidak boleh ada em dash "---" dalam caption

**Token yang dibutuhkan**: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` di `.env`

```python
# Contoh upload Reels via Python
import requests

def upload_instagram_reels(video_path, caption):
    # Step 1: Create container
    res = requests.post(
        f"https://graph.instagram.com/v21.0/{IG_USER_ID}/media",
        data={"video_url": video_url, "caption": caption, "media_type": "REELS"},
        params={"access_token": IG_TOKEN}
    )
    container_id = res.json()["id"]
    
    # Step 2: Wait for processing, then publish
    # (check status via GET /{container_id}?fields=status_code)
    requests.post(
        f"https://graph.instagram.com/v21.0/{IG_USER_ID}/media_publish",
        data={"creation_id": container_id},
        params={"access_token": IG_TOKEN}
    )
```

---

### Facebook (Graph API - sama dengan IG, lewat Meta Business)

**Format**: sama dengan IG untuk Reels dan foto. FB juga support video biasa (16:9).

**Tambahan FB vs IG**:
- FB bisa post link eksternal (artikel Gagah) - IG tidak
- FB Pages API untuk post ke halaman bisnis

**Token**: `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`

---

### TikTok (Content Posting API)

**API endpoint**: `POST https://open.tiktokapis.com/v2/post/publish/video/init/`

**Format**:
| Format | Resolusi | Durasi | Size |
|---|---|---|---|
| MP4 H.264 | 720p atau 1080p | 3 detik - 10 menit | maks 4GB |

**Caption**: maks 2.200 karakter, hashtag dibolehkan

**Catatan penting TikTok**:
- Butuh approval Creator Marketplace atau Business Account
- Video diupload ke TikTok server dulu (direct upload atau dari URL), baru dipublish
- Tidak support autopost ke Story TikTok via API saat ini

**Token**: `TIKTOK_ACCESS_TOKEN` di `.env`

```python
# Contoh TikTok upload (simplified)
def upload_tiktok_video(video_url, caption):
    # Init upload
    init_res = requests.post(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        headers={"Authorization": f"Bearer {TIKTOK_TOKEN}"},
        json={
            "post_info": {"title": caption, "privacy_level": "PUBLIC_TO_EVERYONE"},
            "source_info": {"source": "PULL_FROM_URL", "video_url": video_url}
        }
    )
    publish_id = init_res.json()["data"]["publish_id"]
    # Check status via GET publish/status/
```

---

### YouTube (Data API v3)

**API endpoint**: `POST https://www.googleapis.com/upload/youtube/v3/videos`

**Format**:
| Format | Resolusi | Durasi | Size |
|---|---|---|---|
| MP4, MOV | 720p - 4K | maks 12 jam | maks 128GB (verified account) |

**Shorts**: Video 9:16, durasi <= 60 detik, tambahkan `#Shorts` di title/description

**Token**: `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`

```python
# Contoh upload YouTube Shorts
def upload_youtube_shorts(video_path, title, description):
    youtube = build('youtube', 'v3', credentials=get_credentials())
    request = youtube.videos().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title": f"{title} #Shorts",
                "description": description,
                "tags": ["Exiom", "AI", "Software"],
                "categoryId": "22"
            },
            "status": {"privacyStatus": "public"}
        },
        media_body=MediaFileUpload(video_path)
    )
    response = request.execute()
```

---

### X / Twitter (API v2 - free tier)

**Batasan free tier**: ~1.500 post/bulan (cukup untuk 50 post/hari)

**API endpoint**: `POST https://api.twitter.com/2/tweets`

**Format**:
| Format | Tipe | Maks size | Durasi |
|---|---|---|---|
| JPG, PNG, GIF | Gambar | 5MB | - |
| MP4 | Video | 512MB | 0.5 - 140 detik |

**Karakter**: 280 karakter (URL dihitung 23 karakter)

**Token**: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`

```python
import tweepy

def post_tweet_with_media(text, media_path=None):
    client = tweepy.Client(
        consumer_key=X_API_KEY, consumer_secret=X_API_SECRET,
        access_token=X_ACCESS_TOKEN, access_token_secret=X_ACCESS_SECRET
    )
    auth = tweepy.OAuth1UserHandler(X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)
    api = tweepy.API(auth)
    
    if media_path:
        media = api.media_upload(media_path)
        client.create_tweet(text=text, media_ids=[media.media_id])
    else:
        client.create_tweet(text=text)
```

---

### Threads (via Meta Business / Instagram API)

**API**: Threads API tersedia via Meta Business yang sama dengan IG. Butuh persetujuan akses Threads.

**Endpoint**: `POST https://graph.threads.net/v1.0/{user-id}/threads` kemudian publish

**Format**: teks (maks 500 karakter), foto/video (sama dengan IG)

**Token**: sama dengan Instagram (Meta ecosystem)

```python
def post_threads(text, media_url=None):
    # Create container
    data = {"text": text, "media_type": "TEXT"}
    if media_url:
        data["media_type"] = "IMAGE"
        data["image_url"] = media_url
    
    res = requests.post(
        f"https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads",
        params={"access_token": THREADS_TOKEN},
        data=data
    )
    container_id = res.json()["id"]
    
    # Publish
    requests.post(
        f"https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads_publish",
        params={"access_token": THREADS_TOKEN},
        data={"creation_id": container_id}
    )
```

---

## 3. Checklist Sebelum Upload (Deril wajib self-check)

Setelah approval Owner granted, sebelum eksekusi upload:

- [ ] Verifikasi approval ID dari queue masih valid (approval tidak kadaluarsa)
- [ ] File video/gambar sudah dalam format dan ukuran yang benar per platform
- [ ] Caption sudah disesuaikan per platform (panjang, hashtag, mention)
- [ ] Token API tersedia di `.env` untuk platform tujuan
- [ ] Jadwal upload: upload semua platform dalam 1 sesi (tidak scattered)

---

## 4. Golden Hours Upload (Indonesia, data benchmark umum)

Upload HARUS di jam-jam ini - jangan random. Engagement di luar window ini bisa 40-60% lebih rendah.

| Platform | Golden Hour Utama | Golden Hour Kedua | Frekuensi | Catatan |
|---|---|---|---|---|
| TikTok | 18.00-21.00 WIB | 07.00-09.00 WIB | 1-2x/hari | Prime time malam paling kuat |
| Instagram Reels | 19.00-21.00 WIB | 07.00-08.00 WIB | 1x/hari | Carousel bisa 12.00-14.00 |
| YouTube Shorts | 12.00-14.00 WIB | 15.00-17.00 WIB | 1x/hari | Weekend tambah slot 09.00-11.00 |
| Facebook | 13.00-15.00 WIB | 19.00-21.00 WIB | 1x/hari | Engagement FB lebih di siang |
| X (Twitter) | 08.00-10.00 WIB | 18.00-20.00 WIB | 1-3x/hari | News cycle pagi lebih aktif |
| Threads | 08.00-10.00 WIB | 20.00-22.00 WIB | 2-3x/hari | Mirror strategy X |

**Aturan praktis:**
- Kalau cuma bisa 1 waktu: pilih golden hour utama platform terbesar (TikTok/IG) = 19.00-20.00 WIB
- Jangan upload semua platform dalam 5 menit bersamaan - spread 15-30 menit antar platform
- Hari dengan engagement tertinggi: Selasa-Kamis (hindari Senin pagi dan Jumat sore)
- Weekend: engagement TikTok dan IG masih bagus, X dan Threads drop signifikan

*Update baseline ini dengan data analytics platform setelah 30 hari posting aktif*

---

## 5. Error Handling & Fallback

Kalau API platform error saat upload:
1. Catat error di `decisions_log`
2. Coba ulang sekali (beberapa error sementara)
3. Kalau masih gagal: lapor ke Owner dengan detail error
4. Jangan coba workaround manual (login browser dan upload sendiri) tanpa izin Owner
5. Fallback scheduler (Buffer free tier) hanya boleh dipakai kalau API resmi benar-benar tidak memungkinkan DAN ada ACC Owner

---

## 6. Tracking Hasil

Setelah upload berhasil, Deril/Gagah wajib update `content_calendar` dengan:
- Link post per platform
- Post ID per platform (untuk tracking analytics nanti)
- Tanggal dan waktu publish
- Status: published / scheduled / failed
