# CLAUDE.md - Exiom

AI & Software Consultant 

Baca file ini sampai selesai sebelum mengerjakan apa pun. Dokumen rujukan lengkap ada di `docs/sop/handbook.md` (SOP dan handbook 9 agent, org chart, tech stack). Kalau isinya bentrok sama instruksi di sini, file ini yang menang untuk hal teknis, `docs/sop/handbook.md` yang menang untuk proses bisnis dan approval.

## Konteks

Owner (manusia, satu-satunya tim manusia) sedang membangun software house yang operasionalnya dijalankan 9 AI agent lewat Hermes (orkestrator yang sudah terpasang di PC Linux Owner). Layanan: web development, mobile app, custom software, UI/UX design, digital marketing, SEO - semua segmen klien (UMKM, startup, enterprise).

**Nama brand belum diputuskan.** Jangan mengarang nama. Pakai placeholder `Exiom` di semua tempat yang butuh nama bisnis (company profile, domain, email, dll), supaya gampang diganti sekali jalan kalau brand sudah fix. Tujuan fase ini adalah validasi: buktikan dulu seluruh sistem bisa jalan end-to-end, branding menyusul belakangan.

Web dan blog yang disebut di SOP (buat distribusi artikel dan SEO) itu proyek baru yang berdiri sendiri, bukan bagian dari proyek lain Owner (termasuk bukan bagian dari PandaTech - venture ini berdiri sendiri, tidak berafiliasi).

## Batasan Keras - Jangan Dilanggar

- **Jangan pernah** memasukkan nomor kartu kredit, password, atau kredensial pembayaran ke mana pun, termasuk ke file config atau environment variable. Kalau sebuah langkah butuh itu, berhenti dan minta Owner mengerjakannya manual, lanjutkan begitu API key/token hasilnya sudah dikasih ke kamu.
- **Jangan** menyentuh atau mengubah profile/API key pribadi Owner yang sudah ada di Hermes. Semua profile dan key baru untuk 9 agent bisnis harus terpisah total dari yang pribadi.
- **Jangan** mengeksekusi transaksi finansial riil dalam bentuk apa pun (transfer, pembayaran, top up saldo ads).
- **Jangan** deploy ke production, posting ke akun sosmed asli, atau kirim email/WA ke penerima asli selama masih tahap setup dan validasi ini, kecuali Owner secara eksplisit bilang sudah siap live.
- Kalau ada task yang butuh akun baru atau API key yang belum ada, **laporkan**, jangan di-skip diam-diam dan jangan dihalusinasi/dipalsukan datanya.
- Kalau SOP di `docs/sop/handbook.md` sendiri ambigu atau kontradiktif soal proses bisnis, tanya Owner. Jangan menebak keputusan bisnis.

## Format Lapor ke Owner

Tiap kali mentok butuh sesuatu dari Owner, tulis dengan format ini supaya gampang di-scan:

> **BUTUH DARI OWNER:** <apa yang dibutuhkan> - alasan: <kenapa> - buat lanjut ke: <langkah berikutnya yang nunggu ini>

## Prinsip Desain Inti (ringkasan dari SOP, detail lengkap di docs/sop/handbook.md)

- **Approval universal**: staf (agent) kerja → manager QA (pakai model murah/Haiku, checklist struktural ringan, bukan review kreatif berat) → approval queue Owner. Kategori yang **selalu** wajib approval Owner: kirim keluar (upload, email, WA ke klien), urusan uang, hapus data, data pelanggan. Pengecualian: hot lead dari Ale langsung ke Owner, skip QA Nela, demi kecepatan.
- **9 agent = 9 Hermes profile terpisah**, dikelompokkan ke 4 API key Claude di Workspace Claude Console "Agent Bisnis" (terpisah dari token pribadi Owner):
  1. Kenzie (IT Manager) + Adi (Developer)
  2. Mia (Marketing Manager) + Deril (Editor) + Gagah (SEO Researcher)
  3. Nela (PR Manager) + Ale (Client Relations) + Joce (Client Acquisition)
  4. Hugo (Finance)
- **Distribusi sosmed**: API langsung ke tiap platform diutamakan (Instagram/Facebook Graph API, TikTok Content Posting API, YouTube Data API [termasuk Shorts], X posting-only free tier, Threads API lewat verifikasi Meta Business yang sama). Scheduler pihak ketiga cuma kalau API langsung tidak memungkinkan DAN scheduler itu ada free tier yang cukup. Jangan pilih scheduler berbayar tanpa persetujuan eksplisit Owner.
- **Riset/tools**: prioritaskan yang gratis atau open-source (Google Trends, Google Keyword Planner lewat akun Ads, dll), bukan SerpAPI atau tools berbayar sejenis.
- **Video, graphic, voice**: semua lewat Remotion (code-only, React). Tidak ada Canva atau fal.ai/AI image-gen. Voice-over/narasi pakai TTS open-source (Coqui TTS / Edge-TTS); ElevenLabs cuma opsi upgrade berbayar di masa depan, bukan sekarang.
- **Uang**: agent tidak pernah pegang transaksi beneran. Hugo cuma generate invoice dan kasih rekomendasi, eksekusi transfer tetap manual Owner. Siapa pun yang mau mengajukan sesuatu yang butuh/pakai uang wajib koordinasi ke Hugo dulu sebelum masuk approval queue Owner - berlaku ke semua agent, bukan cuma Mia.
- **Price list, ICP (ideal customer profile), dan brand voice belum ada.** Bikin file placeholder dengan struktur jelas (lihat Fase 1), isi dengan TODO yang Owner lengkapi nanti. Jangan mengarang kontennya.

## Urutan Kerja

### Fase 0 - Infra Baseline
- [ ] Cek instalasi Hermes yang sudah ada di PC Owner (jangan diubah). Catat versi dan lokasi binary-nya. Hermes saat ini hanya punya profile/token pribadi Owner - belum ada profile bisnis.
- [ ] Clone `hermes-virtual-office` (https://github.com/JuniorXcoder/hermes-virtual-office), arahkan `HERMES_BIN` ke instalasi Hermes yang ada.
- [ ] Jalankan `npm run selftest` sampai hijau (113 invariant checks).
- [ ] Setup PostgreSQL lokal, bikin schema: `leads`, `projects`, `invoices`, `content_calendar`, `decisions_log`.
- [ ] **BUTUH DARI OWNER** di titik ini: 4 API key Claude dari Workspace "Agent Bisnis" (lihat pengelompokan di atas) sebelum lanjut Fase 1.

### Fase 1 - Profile Agent + Knowledge Base
- [ ] Buat 9 Hermes profile baru (Kenzie, Mia, Nela, Hugo, Adi, Deril, Gagah, Ale, Joce), tiap profile diarahkan ke API key sesuai kelompoknya, dan dibekali ringkasan SOP masing-masing dari `docs/sop/handbook.md`.
- [ ] Bikin folder knowledge base bersama (`docs/business/`): `company-profile.md` (pakai `[BRAND_NAME]` dan field kosong buat Owner isi), `price-list.md`, `icp.md`, `brand-voice.md` - semua placeholder berstruktur, bukan isi karangan.

### Fase 2 - Dev Pipeline (Kenzie + Adi)
- [ ] Implementasikan alur kerja sesuai handbook Kenzie dan Adi di `docs/sop/handbook.md`: breakdown task, QA, approval milestone/deploy lewat dashboard.
- [ ] Testing end-to-end pakai satu project dummy.

### Fase 3 - Konten dan SEO (Mia, Deril, Gagah)
- [ ] Riset dan dokumentasikan status akses API posting tiap platform (Instagram/Facebook, TikTok, YouTube, X, Threads). Banyak dari ini butuh verifikasi bisnis milik Owner, laporkan satu per satu pakai format BUTUH DARI OWNER begitu ketemu yang perlu itu.
- [ ] Bangun pipeline Remotion (video, graphic, voice-over TTS open-source) sesuai handbook Deril.
- [ ] Bangun web dan blog baru (Next.js + Supabase) dari nol, berdiri sendiri, sesuai handbook Gagah.

### Fase 4 - Sales dan PR (Nela, Ale, Joce)
- [ ] Implementasikan sesuai handbook masing-masing, termasuk jalur approval dua tahap untuk proposal Joce (manager QA Nela → approval Owner), kecuali hot lead Ale yang langsung ke Owner.

### Fase 5 - Finance (Hugo)
- [ ] Invoice otomatis, reminder payment, laporan terpisah (laba-rugi bisnis vs infrastruktur/operasional - jangan digabung), semua sesuai handbook Hugo. Tidak ada integrasi transfer riil di fase ini.

### Fase 6-7 - Lanjutan (opsional, tunggu arahan Owner)
- Priority view di approval dashboard, notifikasi push ke HP, virtual office custom (visual, boleh ambil ide dari Claude-Office / openclaw-office).

## Approve dan Prioritas

Jangan jalankan 9 agent sekaligus di percobaan pertama. Mulai dari Fase 0-2 (dev pipeline) sampai approval flow-nya kebukti jalan, baru nyalain agent berikutnya satu-satu.

## Catatan Lokasi Eksekusi

Hermes dan hermes-virtual-office pada akhirnya harus jalan di PC Linux Owner (tempat Hermes sudah terpasang), bukan cuma di sandbox cloud ini. Sandbox ini dipakai untuk menyiapkan kode, config, dan dokumen; pemindahan/deployment ke PC Owner perlu dikonfirmasi caranya (lewat device link yang tersedia di sesi ini, atau Owner yang menjalankan `git pull`/setup manual di PC-nya sendiri) - tanyakan ke Owner kalau ini belum jelas saat tiba di titik itu.
