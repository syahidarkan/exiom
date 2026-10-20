# Analisis Referensi Video — Panduan Deril

> **UPDATE 20 Oktober 2026** — Analisis ini dibuat ulang berdasarkan 8 referensi baru
> (tersimpan di `Refrensi Video/New Ref 1–8.mp4`). Referensi lama (Ref 3, Ref 5)
> sudah **tidak berlaku**. Ikuti panduan di bawah ini untuk semua video berikutnya.

---

## Template Utama: Dark Glow + Orange Accent

### Palet Warna WAJIB

| Token | Warna | Keterangan |
|-------|-------|-----------|
| Background utama | `#0D0D0D` | Hitam pekat, bukan navy, bukan biru |
| Card/surface | `#1A1A1A` | Sedikit lebih terang dari bg |
| Accent/CTA | `#E87040` | Oranye hangat — **bukan kuning, bukan merah terang** |
| Glow blob A | `#E87040` | Glow di pojok kiri atas atau kanan bawah |
| Glow blob B | `#C0392B` | Glow tambahan (lebih merah), bisa overlap |
| Text utama | `#FFFFFF` | Putih bersih |
| Text muted | `#A0A0A0` | Abu-abu untuk sub-teks |

**Variasi cream (jarang):** Background `#F5EDE0`, accent `#C94F2A` — pakai hanya untuk
hook yang ingin feel "kertas/analog". Mayoritas konten pakai dark.

### Elemen Visual WAJIB Ada Per Video

1. **GlowBlob** — 2–3 lingkaran blur berwarna oranye/merah di pojok background. Bukan full-color panel, tapi "glow spot" seperti lampu yang bocor dari belakang.

2. **TagPill** — pill kecil di atas judul/hook, contoh: `✳ KUNCINYA`, `✳ UMKM`, `✳ FAKTA`. Warna background accent dengan opacity 20%, border tipis.

3. **KineticText** — satu atau dua kata dalam kalimat diberi highlight: kotak outline (bukan highlight penuh) mengelilingi kata target. Animasi: kotak muncul dari scale 0, teks berubah warna jadi accent.

4. **BrowserMock** — kartu putih mengapung dengan 3 dots (●●●) di kiri atas dan URL di address bar. Background kartu putih, shadow gelap. Isi konten: bisa chat WA, tabel stok, daftar pesanan.

5. **BottomSub** — teks kecil centered di bawah layar (bukan kotak hitam!). Teks putih polos, satu baris, bisa ada satu kata accent. Ini teks yang muncul bersamaan VO.

6. **FrameCounter** — "FRAME XXXX" di pojok kanan atas, font monospace kecil. Warna `#333333` (subtle, tidak mengganggu).

### Elemen yang DILARANG

- ❌ Background biru vivid (`#1441E5` atau sejenis)
- ❌ Keyboard mockup 3D
- ❌ Ghost text besar di background
- ❌ Subtitle bar hitam di bawah (kotak hitam semi-transparan)
- ❌ Side text vertikal
- ❌ Stamp/sticker diagonal

---

## Scene Types & Kapan Pakai

### `hook` — Scene pembuka (wajib scene pertama)
- 2 baris teks besar uppercase/mixed
- Baris ke-2 pakai `highlightWord` (kinetic outline box)
- Ada TagPill di atas
- Durasi: 3–5 detik
- Contoh: `"Pesanan jam 2,"` / `"kebaca jam 9."` → highlight: `"jam 9."`

### `step` — Alur langkah dengan browser mockup
- Circle angka besar di kiri (warna accent)
- Label langkah kecil di bawah circle
- BrowserMock di kanan/bawah dengan konten situasi nyata (chat WA, dll.)
- Durasi: 8–12 detik

### `stat` — Angka besar satu fakta
- Angka sangat besar (200px+), warna putih
- Unit/label kecil di bawah angka
- TagPill konteks di atas (contoh: "MINGGU INI", "SEBULAN")
- Durasi: 5–8 detik

### `compare` — Dua kondisi berdampingan
- 2 kartu gelap rounded, side by side
- Kiri: kondisi buruk (bisa ada garis coret), icon emoji
- Kanan: kondisi baik, warna accent
- TagPill "BEDANYA" / "KONDISI" / "SOLUSINYA" di atas
- Durasi: 5–8 detik

### `chat` — Bubble chat berurutan
- Bubble chat muncul satu per satu dari bawah
- Background bubble abu-abu gelap, teks putih
- Counter angka di pojok (misal: "20×")
- Durasi: 8–12 detik

### `ledger` — Tabel perbandingan angka
- Header kolom: CATATAN vs FISIK (atau sesuai konteks)
- Row dengan tanda merah jika selisih
- Durasi: 8–12 detik

### `cta` — Call to action penutup
- Pertanyaan besar di tengah layar
- Sub-teks ajakan komentar
- TagPill "TANYA" / "KAMU"
- Durasi: 5–8 detik

---

## Audio & Voice

- Voice: `id-ID-ArdiNeural` (Edge-TTS)
- Rate: `-8%` (sedikit lebih lambat dari default)
- Pitch: `+0Hz` (natural)
- BGM: `audio/bgm/house-vibez.mp3` (dipilih Deril, cocok dengan vibes dark modern)
- Volume BGM: 20–30% dari VO — jangan terlalu keras

---

## Alur Kerja Deril (Wajib Diikuti)

1. **Baca brief Mia** di `workspace/mia/brief_deril.md`
2. **Cek referensi terbaru** di folder `Refrensi Video/` — pelajari 2–3 video yang paling relevan dengan topik brief
3. **Edit konten** di `tools/node/remotion-deril/src/data/reels-content.json` — JANGAN edit `all.ts` langsung
4. **Generate VO** dengan `python3 workspace/deril/scripts/gen_vo.py` — ini auto-generate `all.ts` juga
5. **Render** dengan `npx remotion render src/index.ts <reel_id> workspace/deril/output/<filename>.mp4`
6. **Cek output**: pastikan ada audio, durasi wajar (20–40 detik), tampilan sesuai dark glow template
7. **Ajukan ke approval queue** Owner sebelum upload
8. **Upload setelah approved** via `tools/helpers/deril-publish.py`

---

## Checklist Sebelum Submit Approval

- [ ] Background `#0D0D0D` (bukan biru, bukan abu-abu standar)
- [ ] Ada GlowBlob oranye/merah di minimal 1 scene
- [ ] Ada TagPill di setiap scene
- [ ] Ada KineticText di scene hook
- [ ] Tidak ada caption/subtitle bar hitam
- [ ] Audio VO terdengar jelas, tidak clipping
- [ ] BGM ada dan tidak terlalu keras
- [ ] Durasi total 20–45 detik
- [ ] FrameCounter muncul di pojok kanan atas
