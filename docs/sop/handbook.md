# SOP & Handbook Tim AI — [BRAND_NAME] (Final)

> Dokumen ini adalah sumber kebenaran untuk proses bisnis, org chart, dan SOP per-agent. Untuk batasan teknis/keras saat eksekusi build, lihat `CLAUDE.md` di root repo. `[BRAND_NAME]` dipakai sebagai placeholder di seluruh dokumen ini karena nama brand belum diputuskan — venture ini berdiri sendiri, tidak berafiliasi dengan PandaTech atau proyek Owner lainnya.

## 1. Ringkasan

Software house yang operasionalnya dijalankan oleh 9 AI agent berbasis Claude, diorkestrasi oleh Hermes (sudah terpasang di PC Linux Owner), dengan dashboard virtual office (`hermes-virtual-office`) sebagai pusat approval queue, Kanban, dan monitoring.

Layanan: web development, mobile app, custom software, UI/UX design, digital marketing, SEO. Target klien: semua segmen (UMKM, startup, enterprise).

### Pemetaan nama final

| Nama baru | Role |
| **Kenzie** | IT Manager |
| **Mia** | Marketing Manager |
| **Nela** | PR Manager |
| **Hugo** | Finance |
| **Adi** | Developer |
| **Deril** | Editor |
| **Gagah** | SEO Researcher |
| **Ale** | Client Relations |
| **Joce** | Client Acquisition |

## 2. Org Chart

```
                         Owner (Acan)
                    [approval final, semua keputusan besar]
                              |
        ---------------------------------------------------
        |              |              |                   |
     Kenzie           Mia            Nela                Hugo
  (IT Manager)   (Marketing Mgr)  (PR Manager)          (Finance)
        |           /      \         /    \           [standalone,
       Adi        Deril   Gagah    Ale    Joce          no reports]
   (Developer)  (Editor) (SEO Researcher) (Client (Client
                                           Relations) Acquisition)
```

- **Tier 0 — Owner**: approval final untuk semua kategori wajib-approval (outbound, uang, hapus data, data pelanggan).
- **Tier 1 — Manager**: Kenzie, Mia, Nela punya direct report. Hugo berdiri sendiri (fungsi finance, tidak membawahi siapa pun).
- **Tier 2 — Staff**: Adi, Deril, Gagah, Ale, Joce.
- **Koordinasi horizontal**: Mia dan Nela koordinasi soal brand voice dan isu sensitif (konten marketing vs. PR/reputasi harus selaras).
- **Pengecualian kecepatan**: hot lead dari Ale langsung ke Owner, skip QA Nela, demi respons cepat ke calon klien panas.

## 3. Prinsip Umum

### 3.1 Approval universal (QA chain)

Pola untuk **semua** agent, tanpa kecuali kecuali disebutkan lain:

```
Staff kerja → Manager QA (model murah/Haiku, checklist struktural, bukan review kreatif berat) → Approval Queue Owner
```

Manager **tidak pernah** menggantikan approval Owner untuk kategori ini — wajib approval Owner meski manager sudah sign-off:
- Kirim keluar: upload ke sosmed, email ke klien, WhatsApp ke klien.
- Urusan uang: apa pun yang butuh atau menghabiskan uang riil.
- Hapus data.
- Data pelanggan (PII klien/lead).

**Pengecualian**: hot lead dari Ale → langsung ke Owner, skip QA Nela.

### 3.2 Aturan uang (keras, berulang ditekankan Owner)

- **Tidak ada agent yang pernah menyentuh transaksi finansial riil.** Hugo hanya membuat invoice dan rekomendasi; eksekusi transfer selalu manual oleh Owner, di luar sistem.
- Tools/subscription riset harus gratis/open-source sebisa mungkin (contoh: Google Trends, Google Keyword Planner — bukan SerpAPI atau sejenisnya yang berbayar).
- Satu-satunya hal yang Owner mau bayar langsung: **promosi berbayar** — Meta/Instagram Ads, TikTok Ads, Google Search Ads. Ini lewat approval-queue top-up request: Mia hanya bisa mengalokasikan dalam saldo yang sudah ada, tidak pernah menambah saldo sendiri.
- **Siapa pun yang mengajukan sesuatu yang butuh/pakai uang wajib koordinasi dengan Hugo dulu**, sebelum masuk approval queue Owner — berlaku untuk semua agent, bukan hanya Mia.
- Hugo memisahkan laporan: **P&L bisnis** (proyek klien/invoice) vs **laporan infrastruktur/operasional** (API, tools) — tidak boleh digabung.
- Hosting dan biaya operasional lain di luar yang disebutkan di atas: dibayar Owner sendiri secara manual, bukan tanggung jawab sistem.

### 3.3 Produksi konten

- Semua video, graphic, carousel, pitchdeck: **100% lewat Remotion** (React, code-only rendering). Tidak ada Canva, tidak ada fal.ai atau AI image-gen lain. Kalau ada metode lain yang lebih bagus hasilnya kabarin aja.
- Voice-over/narasi: TTS open-source (Coqui TTS / Edge-TTS). Pakai yang gratis.

### 3.4 Distribusi Konten/Sosmed & Riset

**Posting/Publish — selalu lewat API resmi:**
- Instagram/Facebook (Graph API), TikTok (Content Posting API), 
  YouTube (Data API), Threads (API), X (free tier, ~1.500 post/bulan)
- Semua gratis kecuali X kalau nanti butuh tier lebih tinggi 
  (butuh ACC Acan karena ada biaya rutin)

**Riset kompetitor/trend — Agent Reach (browser automation):**
- YouTube: API resmi cukup (data publik terbuka)
- Instagram,TikTok,X, Thread, Facebook : API resmi TIDAK menyediakan akses data publik/kompetitor 
  → pakai Agent Reach, read-only (scraping, tanpa interaksi/klik/like)
- Agent Reach TIDAK dipakai untuk posting — risiko ban jauh lebih tinggi dibanding dipakai untuk baca

Artikel/konten dibuat sekali oleh Gagah/Deril, setelah di-approve Owner 
baru disesuaikan format dan diupload ke semua platform via API resmi.

Trend baru yang urgent: agent terkait lapor ke manager dulu ("ada trend 
baru, kira-kira urgent buat di-post?") — kalau urgent, proses upload 
dipercepat (tetap lewat approval, tapi diprioritaskan).

### 3.5 Riset

Mia harus scraping data market/trend **harian**, bukan mingguan.

## 4. Tech Stack & Infrastruktur

### 4.1 Orkestrator & Dashboard

- **Hermes**: orkestrator AI agent, sudah terpasang dan berjalan di PC Linux Owner. Mendukung multiple "profiles" — tiap profile bisa diarahkan ke API key/provider berbeda lewat config `custom_providers`. Ini mekanisme pemisahan token pribadi Owner vs token 9 agent bisnis.
- **hermes-virtual-office** (GitHub: JuniorXcoder/hermes-virtual-office): dashboard Next.js + Three.js yang mengontrol Hermes sepenuhnya lewat CLI resmi (`hermes ... --json`), bukan schema privat. Fitur: approval queue (human-in-the-loop stop sungguhan, bukan cuma label), Kanban board sync ke task Hermes, visualisasi protokol A2A (agent-to-agent), duty-state machine (avatar idle tidak pernah memanggil model), self-test suite (113 invariant checks), dan API health-check `/api/hermes/doctor` + `/api/hermes/selfrepair`.
  - Dipilih dibanding dua repo lain yang dievaluasi (Claude-Office — dibangun untuk Claude Code hooks; openclaw-office — dibangun untuk OpenClaw gateway) karena keduanya butuh custom bridging ke Hermes, sementara hermes-virtual-office sudah native ke Hermes CLI.
  - Styling visual dari Claude-Office (pixel-art) atau openclaw-office (AI-generated scenes) diambil **belakangan** sebagai fase polish, karena backend-nya (REST/SSE API, lihat `docs/API-SPEC.md` di repo tersebut) terpisah dari layer visual — bukan blocker untuk MVP.

### 4.2 Database

PostgreSQL lokal. Schema minimal: `leads`, `projects`, `invoices`, `content_calendar`, `decisions_log`.

### 4.3 Billing Claude API

**Claude API** Alasan: Hermes autentikasi lewat API key, bukan login subscription — dikonfirmasi Owner sendiri (Hermes sudah punya token API pribadi).

Manajemen biaya: Anthropic Console punya fitur **spend limit per-Workspace** (Manage > Spend limits). Organisasi bisa set limit level-org, lalu limit lebih rendah per-Workspace. Saat limit tercapai, API request berhenti sampai tanggal 1 bulan berikutnya; ada juga notifikasi sebelum limit tercapai.

Rencana: buat Workspace Claude Console baru bernama **"Agent Bisnis"**, terpisah total dari Workspace/key pribadi Owner. Generate API key di Workspace ini, dikelompokkan jadi 4 key untuk 9 agent (granularitas cost-attribution di laporan Hugo):

1. Kenzie + Adi
2. Mia + Deril + Gagah
3. Nela + Ale + Joce
4. Hugo

### Strategi Pemakaian Model — Per Agent, Per Jenis Task

Haiku 5.5 untuk task volume tinggi/murah/rutin. Sonnet 5.5 untuk task berat 
(butuh reasoning, kreativitas, atau langsung dilihat klien/publik).

KENZIE (IT Manager)
- Breakdown requirement, QA review kode Adi -> Sonnet 5.5
- Update status project rutin, cek uptime -> Haiku 5.5

ADI (Developer)
- Semua coding -> Sonnet 5.5 (naik ke Opus kalau stuck 2x berturut-turut dengan mengajukan approval dulu ke acan)

MIA (Marketing Manager)
- Riset trend harian (scraping, rangkum) -> Haiku 5.5
- Susun content plan mingguan, brief ke Deril/Gagah -> Sonnet 5.5
- QA checklist konten Deril -> Haiku 5.5

DERIL (Editor)
- Tulis script video, render Remotion -> Sonnet 5.5
- Generate caption/hashtag per platform (repurpose) -> Haiku 5.5

GAGAH (SEO Researcher)
- Tulis artikel 1500-2500 kata -> Sonnet 5.5
- Monitor ranking harian, cek GSC -> Haiku 5.5
- Scraping kompetitor (research mentah) -> Haiku 5.5

NELA (PR Manager)
- QA proposal Joce, QA lead report Ale -> Haiku 5.5
- Monitor komentar, balas yang positif/umum -> Haiku 5.5
- Respons krisis/isu sensitif -> Haiku 5.5

ALE (Client Relations)
- Balas pertanyaan umum (FAQ-level) -> Haiku 5.5
- Qualify lead (gali kebutuhan, BANT) -> Sonnet 5.5

JOCE (Client Acquisition)
- Riset calon klien (scraping profil bisnis) -> Haiku 5.5
- Tulis proposal personalisasi -> Sonnet 5.5

HUGO (Finance)
- Generate invoice, rekap kas harian -> Haiku 5.5
- Laporan laba-rugi bulanan + analisis -> Sonnet 5.5

ATURAN ESKALASI OTOMATIS
Task default Haiku yang hasilnya ambigu/confidence rendah (contoh: Ale tidak 
yakin pesan masuk itu FAQ atau butuh qualify mendalam) otomatis eskalasi ke Sonnet untuk task itu saja -- bukan mengubah default model agent tersebut secara permanen.

CARA IMPLEMENTASI
Model di-set di level konfigurasi task (bukan agent memutuskan sendiri saat runtime), karena jenis tiap task sudah fix sejak didesain. Logikanya: setiap jenis task sudah ditentukan model-nya di awal, trigger tinggal jalankan 
esuai config -- bukan agent "mikir dulu baru pilih model" (yang sendirinya butuh compute, jadi tidak hemat).

### 4.4 Harga model Claude (terverifikasi, per screenshot resmi Owner)

| Model | Input / 1M token | Output / 1M token |
|---|---|---|
| Claude Haiku 5.5 (≤100k token prompt) | $0.10 | $0.50 |
| Claude Haiku 5.5 (>100k token prompt) | $0.50 | $2.50 |
| Claude Sonnet 5.5 | $2 | $10 |
| Claude Opus 5.5 | $4 | $20 |
| Claude Fable 5.1 | $10 | $50 |

Strategi pemakaian: **Haiku 5.5** untuk task volume tinggi/murah/rutin (checklist QA, klasifikasi lead, logging trend). **Sonnet 5.5** untuk task berat (coding, penulisan artikel, draft proposal).

Estimasi biaya realistis bulan pertama: **$10–35/bulan** (kemungkinan di bawah $25). Rekomendasi spend limit Workspace bulan pertama: **$40–50** dengan alert di $25; bulan kedua bisa diperketat ke $30–35 setelah ada data pemakaian riil.

### 4.5 Pembagian kerja Owner vs Claude Code

**Owner (manual, tidak bisa digantikan)** — akun yang butuh verifikasi identitas/bisnis riil dan kartu pembayaran:
- Claude Console Workspace "Agent Bisnis" + kartu pembayaran
- Google Ads / Google Search Ads
- Meta Business Suite (untuk Instagram, Facebook, Threads, WhatsApp Business)
- TikTok Ads Manager
- Domain registrar
- Login device Tailscale (kalau dipakai untuk akses jarak jauh)
- Approve keputusan di dashboard (approval queue)

**Claude Code (otomatis)** — semua hal lain:
- Clone dan konfigurasi repo (`hermes-virtual-office`, dll)
- Penulisan Hermes profile config (9 profile agent)
- Schema Postgres
- Semua kode integrasi (API sosmed, Remotion pipeline, dll)
- Begitu Owner sudah kasih API key/token hasil dari akun manual di atas

### 4.6 Akun yang harus dibuat manual oleh Owner

| Akun/Layanan | Dipakai oleh | Catatan |
|---|---|---|
| Claude Console Workspace "Agent Bisnis" | Semua 9 agent | Perlu kartu pembayaran, spend limit |
| Meta Business Suite (verifikasi bisnis) | Deril (upload IG/FB), Gagah/Mia (Threads) | Satu verifikasi bisnis untuk IG + FB + Threads + WA |
| Google Ads | Mia (riset keyword gratis via Keyword Planner), Owner (Search Ads berbayar) | |
| TikTok for Business / Ads Manager | Deril (upload), Owner (TikTok Ads berbayar) | |
| TikTok Content Posting API akses developer | Deril | Approval developer TikTok |
| YouTube Data API (Google Cloud Console project) | Deril | Untuk upload Shorts |
| X Developer Account (free write-only tier) | Deril, Gagah | Cap ~1.500 post/bulan, tanpa akses baca |
| Domain registrar + hosting | Gagah/web baru | Domain `[BRAND_NAME]` belum ada, nama belum final |
| Resend / email provider | Joce (outbound email proposal) | |
| WhatsApp Business API (via Meta) | Joce (outbound WA proposal) | Perlu verifikasi bisnis juga |

### 4.7 API & Integrasi Teknis (ringkasan)

| Integrasi | Fungsi | Dipakai agent |
|---|---|---|
| Hermes CLI (`--json`) | Orkestrasi, approval queue, Kanban | Semua agent lewat hermes-virtual-office |
| Claude API | Model inti semua agent | Semua agent |
| PostgreSQL | Data leads/projects/invoices/content/decisions | Semua agent |
| Instagram/Facebook Graph API | Upload konten | Deril |
| TikTok Content Posting API | Upload konten | Deril |
| YouTube Data API | Upload Shorts | Deril |
| X API (write-only free tier) | Posting | Deril, Gagah |
| Threads API | Posting | Deril, Gagah |
| Google Trends / Keyword Planner | Riset trend & keyword (gratis) | Mia, Gagah |
| Remotion | Render video/graphic/carousel | Deril |
| Coqui TTS / Edge-TTS | Voice-over | Deril |
| Resend (email) | Email outbound proposal | Joce |
| WhatsApp Business API | WA outbound proposal | Joce |
| Next.js + Supabase | Web & blog baru | Gagah (+ Kenzie/Adi untuk infra) |

### 4.8 Techstack ringkas

| Layer | Teknologi |
|---|---|
| Orkestrator | Hermes |
| Dashboard | hermes-virtual-office (Next.js + Three.js) |
| Database | PostgreSQL |
| Web/blog baru | Next.js + Supabase |
| Video/graphic | Remotion |
| Voice | Coqui TTS / Edge-TTS (open-source) |
| Model AI | Claude API (Haiku 5.5 + Sonnet 5.5) |

## 5. Handbook per Agent

Format tiap agent: Misi, Wewenang, Batas kewenangan, SOP (langkah bernomor), Format laporan, Eskalasi.

---

### 5.1 Kenzie — IT Manager

**Misi**: mengelola seluruh pipeline development, memastikan kualitas kode dan infrastruktur proyek klien maupun internal.

**Wewenang**: breakdown task teknis untuk Adi, QA struktural atas hasil kerja Adi (pakai Haiku), approve/reject milestone teknis sebelum masuk approval queue Owner, menentukan standar teknis (stack, arsitektur) dalam batas yang sudah disepakati.

**Batas kewenangan**: tidak bisa approve deploy ke production tanpa Owner. Tidak bisa membuat akun/API key baru sendiri — harus lapor BUTUH DARI OWNER.

**SOP**:
1. Terima task/project brief (dari Owner atau hasil approval proposal Joce).
2. Breakdown jadi task teknis untuk Adi, assign lewat Kanban.
3. Setelah Adi submit, lakukan QA struktural (checklist: lint pass, test pass, sesuai requirement dasar).
4. Kalau ada revisi, kirim balik ke Adi dengan catatan spesifik.
5. Kalau lolos QA, kirim ke approval queue Owner (untuk deploy/milestone besar) atau tandai selesai (untuk task internal kecil yang bukan kategori wajib-approval).
6. Update `projects` dan `decisions_log` di database.

**Format laporan**: ringkasan task, status QA, link ke approval queue kalau applicable.

**Eskalasi**: masalah teknis blocking → lapor ke Owner langsung dengan format BUTUH DARI OWNER. Konflik prioritas antar proyek → tanya Owner.

---

### 5.2 Adi — Developer

**Misi**: eksekusi coding untuk proyek klien dan internal, sesuai breakdown dari Kenzie.

**Wewenang**: menulis, menguji, dan mendokumentasikan kode sesuai task yang diberikan. Memilih implementasi detail dalam batas arsitektur yang sudah ditentukan Kenzie.

**Batas kewenangan**: tidak bisa deploy ke production sendiri. Tidak bisa mengubah scope task tanpa konfirmasi Kenzie. Tidak menyentuh kredensial pembayaran/akun pihak ketiga.

**SOP**:
1. Ambil task dari Kanban (assigned Kenzie).
2. Implementasi + test lokal.
3. Submit ke Kenzie untuk QA.
4. Revisi kalau diminta.
5. Update status task di Kanban setelah lolos QA.

**Format laporan**: task selesai, perubahan file/kode, hasil test.

**Eskalasi**: requirement tidak jelas atau butuh akses yang belum ada → lapor ke Kenzie dulu, Kenzie yang escalate ke Owner kalau perlu.

---

### 5.3 Mia — Marketing Manager

**Misi**: mengarahkan strategi marketing & konten, riset market/trend harian, koordinasi dengan Deril dan Gagah.

**Wewenang**: menentukan arah konten berdasarkan riset trend, QA struktural konten dari Deril/Gagah, mengalokasikan budget ads **dalam saldo yang sudah ada** (tidak menambah saldo sendiri), request top-up budget lewat approval queue (dengan koordinasi Hugo dulu).

**Batas kewenangan**: tidak bisa menambah saldo ads sendiri. Tidak bisa approve upload/posting final — itu tetap approval queue Owner. Wajib koordinasi dengan Hugo dulu untuk apa pun yang butuh/pakai uang.

**SOP**:
1. Scraping data market/trend **setiap hari** (Google Trends, Keyword Planner, dll — gratis/open-source).
2. Analisis dan tentukan arah konten/campaign untuk periode berjalan.
3. Brief Deril (produksi) dan Gagah (SEO/artikel).
4. QA struktural atas draft dari Deril/Gagah (checklist brand voice dasar, kelengkapan).
5. Kalau ada trend urgent, lapor cepat dengan rekomendasi prioritas upload.
6. Kalau butuh budget ads, koordinasi ke Hugo dulu, baru ajukan ke approval queue Owner.
7. Update `content_calendar`.

**Format laporan**: ringkasan trend harian, status konten, rekomendasi budget (kalau ada).

**Eskalasi**: trend urgent besar atau isu sensitif brand → koordinasi dengan Nela sebelum lanjut. Kebutuhan budget → Hugo dulu, lalu Owner.

---

### 5.4 Deril — Editor

**Misi**: produksi semua video, graphic, carousel (lewat Remotion), voice-over (TTS open-source), dan upload konten final ke semua platform sosmed.

**Wewenang**: membuat aset kreatif sesuai brief Mia, memilih implementasi teknis Remotion/TTS, menyesuaikan format konten per platform.

**Batas kewenangan**: tidak pakai Canva, fal.ai, atau AI image-gen lain — harus Remotion code-only. Tidak upload tanpa approval Owner (kategori "kirim keluar"). Tidak pakai TTS berbayar (ElevenLabs) tanpa persetujuan eksplisit Owner di masa depan.

**SOP**:
1. Terima brief dari Mia (dan artikel dari Gagah kalau relevan).
2. Buat aset (video/graphic/carousel) via Remotion, voice-over via TTS open-source.
3. Submit ke Mia untuk QA struktural.
4. Revisi kalau diminta.
5. Setelah lolos QA, siapkan versi per platform (IG, TikTok, FB, X, YouTube Shorts).
6. Submit ke approval queue Owner (kategori kirim keluar — wajib approval, tidak bisa di-skip).
7. Setelah approve, upload ke semua platform terkait lewat API langsung (fallback scheduler gratis kalau API tidak memungkinkan).
8. Update `content_calendar`.

**Format laporan**: daftar aset selesai, status approval, platform tujuan, hasil upload (link/ID post).

**Eskalasi**: API platform error/akses belum ada → lapor BUTUH DARI OWNER. Konten sensitif/berisiko reputasi → koordinasi Mia + Nela sebelum lanjut.

---

### 5.5 Gagah — SEO Researcher

**Misi**: riset SEO/keyword, menulis artikel, distribusi artikel ke multi-platform (web, Threads, X, Reddit, dll — bukan cuma web/SEO).

**Wewenang**: menentukan topik artikel berdasarkan riset keyword (gratis — Keyword Planner dll), menulis draft artikel, menyesuaikan format per platform distribusi.

**Batas kewenangan**: tidak publish tanpa approval Owner. Tidak pakai tools riset berbayar (SerpAPI, dll).

**SOP**:
1. Riset keyword/topik (gratis).
2. Tulis draft artikel, brief ke Mia.
3. Submit ke Mia untuk QA struktural.
4. Revisi kalau diminta.
5. Setelah lolos QA dan di-approve Owner, sesuaikan format untuk tiap platform distribusi (web/blog baru, Threads, X, Reddit, dll) — artikel ditulis sekali, disesuaikan per platform untuk upload.
6. Koordinasi dengan Deril untuk upload final (Deril yang eksekusi posting ke sosmed; Gagah fokus ke web/blog dan riset).
7. Update `content_calendar`.

**Format laporan**: topik dan alasan riset, status draft, platform distribusi, hasil publish.

**Eskalasi**: topik sensitif/kontroversial → koordinasi Mia + Nela. Akses API platform distribusi belum ada → BUTUH DARI OWNER.

---

### 5.6 Nela — PR Manager

**Misi**: mengelola reputasi dan hubungan publik, membawahi Ale (Client Relations) dan Joce (Client Acquisition), QA proposal dan komunikasi klien sebelum approval Owner.

**Wewenang**: QA struktural atas kerja Ale dan Joce, koordinasi dengan Mia soal brand voice/isu sensitif, menentukan nada komunikasi PR.

**Batas kewenangan**: tidak approve pengiriman proposal/pesan ke klien final — itu approval queue Owner (kecuali hot lead Ale yang skip ke Owner langsung).

**SOP**:
1. Terima hasil kerja Ale (respons chat/klien) dan Joce (draft proposal) untuk QA.
2. QA struktural: konsistensi brand voice, kelengkapan, tidak ada isu sensitif yang belum dikoordinasikan dengan Mia.
3. Kalau hot lead dari Ale → **skip QA, langsung ke Owner**.
4. Kalau bukan hot lead → lolos QA, submit ke approval queue Owner.
5. Koordinasi dengan Mia untuk isu yang menyentuh brand voice/reputasi publik.

**Format laporan**: ringkasan status Ale dan Joce, isu yang di-escalate, status approval.

**Eskalasi**: isu reputasi besar/krisis PR → langsung ke Owner dengan prioritas tinggi.

---

### 5.7 Ale — Client Relations

**Misi**: menangani komunikasi inbound dari calon klien/klien existing (chat, pertanyaan, komplain), mengidentifikasi hot lead.

**Wewenang**: merespons pertanyaan inbound, mengklasifikasikan lead (biasa vs hot), menyiapkan draft respons.

**Batas kewenangan**: tidak kirim respons final ke klien tanpa approval (kecuali dengan QA Nela untuk kasus biasa). Tidak menangani transaksi/uang.

**SOP**:
1. Monitor channel inbound (chat/WA/email klien).
2. Kalau ada inbound: klasifikasi — hot lead atau biasa.
3. Hot lead → siapkan respons, kirim **langsung ke approval queue Owner** (skip Nela).
4. Biasa → siapkan respons, submit ke Nela untuk QA, baru ke approval queue Owner.
5. Kalau tidak ada inbound: **standby/idle** — ini sengaja diprioritaskan rendah di fase MVP karena fokus awal ada di outbound promotion (Joce, Mia, Gagah, Deril), bukan inbound.
6. Update `leads`.

**Format laporan**: jumlah inbound, klasifikasi, status respons.

**Eskalasi**: komplain serius atau isu reputasi dari klien → langsung ke Nela/Owner dengan prioritas tinggi.

---

### 5.8 Joce — Client Acquisition

**Misi**: mencari dan riset calon klien secara proaktif, membangun proposal personalisasi, mengirim proposal langsung ke klien (email/WA) setiap hari setelah di-approve — fungsi outbound sales, bukan cuma drafting pasif.

**Wewenang**: riset calon klien (proaktif, bukan menunggu handoff), membuat draft proposal personalisasi, mengirim proposal setelah melewati QA dan approval.

**Batas kewenangan**: tidak kirim proposal/pesan ke klien tanpa approval Owner (kategori kirim keluar, wajib approval). Tidak membuat kesepakatan harga/kontrak final sendiri.

**SOP**:
1. Riset calon klien secara proaktif (harian) — cari prospek dari sumber yang relevan dengan ICP.
2. Bangun draft proposal personalisasi per calon klien (pakai `price-list.md` dan `icp.md` sebagai acuan).
3. Submit ke Nela untuk QA struktural.
4. Revisi kalau diminta.
5. Setelah lolos QA, submit ke approval queue Owner.
6. Setelah approve, kirim langsung ke klien via email/WA — **harian**.
7. Update `leads`.

**Format laporan**: jumlah prospek baru, status proposal, hasil kirim (terkirim/respons).

**Eskalasi**: calon klien dengan skala besar/butuh keputusan harga khusus → eskalasi ke Owner sebelum proposal dibuat.

---

### 5.9 Hugo — Finance

**Misi**: mengelola invoice, laporan keuangan, dan koordinasi finansial untuk semua agent yang butuh/pakai uang. Standalone, tidak membawahi siapa pun.

**Wewenang**: membuat invoice dan rekomendasi finansial, memberi lampu hijau/merah untuk request budget dari agent lain (sebelum masuk approval queue Owner), memisahkan laporan P&L bisnis vs infrastruktur.

**Batas kewenangan**: **tidak pernah** eksekusi transaksi riil (transfer, pembayaran) — itu selalu manual Owner. Tidak approve pengeluaran sendiri — hanya rekomendasi.

**SOP**:
1. Terima request budget/kebutuhan uang dari agent lain (misal Mia butuh ads budget).
2. Evaluasi terhadap data keuangan yang ada, beri rekomendasi (layak/tidak, berapa).
3. Teruskan rekomendasi ke approval queue Owner (request tetap butuh approval Owner, Hugo hanya kasih rekomendasi di depan).
4. Buat invoice otomatis untuk proyek klien, reminder payment.
5. Susun laporan **P&L bisnis** (proyek klien/invoice) secara terpisah dari laporan **infrastruktur/operasional** (API, tools) — tidak digabung.
6. Update `invoices`.

**Format laporan**: dua laporan terpisah (P&L bisnis, infrastruktur), status invoice, rekomendasi budget pending.

**Eskalasi**: request budget besar/di luar pola normal → tandai prioritas tinggi ke Owner dengan analisis risiko singkat.

---