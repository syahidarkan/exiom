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
   Upload ke semua platform via deril-publish.py (browser automation)
       |
   Update content_calendar
       |
   Lapor hasil (link post per platform)
```

**Tidak boleh skip langkah mana pun**, termasuk step "tunggu approval". Kalau ada urgensi trend, lapor ke Mia - bukan langsung upload.

---

## 2. Spesifikasi per Platform

### Cara Upload — Browser Automation (BUKAN API token)

**Semua upload pakai `deril-publish.py` via Chrome CDP (browser-use).** Tidak ada API token yang dibutuhkan — Chrome sudah login ke semua platform atas nama akun Exiom.

```bash
# Upload video ke semua platform sekaligus
python3 tools/helpers/deril-publish.py \
  --file workspace/deril/output/<nama-video>.mp4 \
  --caption "Teks caption #hashtag" \
  --platforms tiktok,instagram,youtube,x,threads

# Upload ke platform tertentu saja
python3 tools/helpers/deril-publish.py \
  --file workspace/deril/output/<nama-video>.mp4 \
  --caption "Teks caption" \
  --platforms tiktok

# Upload dengan thumbnail (YouTube)
python3 tools/helpers/deril-publish.py \
  --file workspace/deril/output/<nama-video>.mp4 \
  --caption "Teks caption #Shorts" \
  --platforms youtube \
  --thumbnail workspace/deril/output/<nama-thumb>.jpg

# Post thread X (dari file JSON)
python3 tools/helpers/deril-publish.py \
  --file workspace/deril/threads/<topik>.json \
  --mode thread \
  --platforms x
```

**Prasyarat**: Chrome Exiom (`CHROME_EXIOM_PROFILE`) harus sudah login ke semua platform. Kalau ada platform yang minta login ulang, laporkan ke Owner via approval queue — jangan coba login sendiri.

**Format spesifikasi per platform** (untuk cek file sebelum upload):

| Platform | Format | Resolusi | Durasi | Size |
|---|---|---|---|---|
| TikTok | MP4 H.264 | 1080x1920 | 3 dtk - 10 mnt | maks 4GB |
| Instagram Reels | MP4, MOV | 1080x1920 | 3 dtk - 15 mnt | maks 1GB |
| YouTube Shorts | MP4 | 1080x1920 | maks 60 dtk | maks 128GB |
| X/Twitter video | MP4 | min 720p | 0.5 - 140 dtk | maks 512MB |
| Threads video | MP4 | min 720p | maks 5 mnt | maks 1GB |

**Caption per platform**:
- Instagram: maks 2.200 karakter, 20-30 hashtag di akhir
- TikTok: maks 2.200 karakter, hashtag dibolehkan
- YouTube Shorts: tambahkan `#Shorts` di judul/deskripsi
- X: maks 280 karakter per tweet
- Threads: maks 500 karakter

---

## 3. Checklist Sebelum Upload (Deril wajib self-check)

Setelah approval Owner granted, sebelum eksekusi upload:

- [ ] Verifikasi approval ID dari queue masih valid
- [ ] File video sudah dalam format dan ukuran yang benar per platform (tabel di atas)
- [ ] Caption sudah disesuaikan per platform (panjang, hashtag)
- [ ] Chrome Exiom bisa diakses via CDP (`http://127.0.0.1:9222`)
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
