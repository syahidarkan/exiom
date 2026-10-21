# Design Standards - Exiom

> Dokumen ini adalah acuan teknis dan estetika untuk Deril (Editor) dan Joce (pitchdeck/proposal).
> Ini bukan sekadar style guide - ini standar minimum yang harus dipenuhi sebelum aset bisa masuk QA.

---

## 1. Prinsip Dasar (berlaku semua aset)

- **Setiap elemen punya alasan.** Tidak ada ornamen dekoratif tanpa fungsi komunikasi.
- **Konsistensi adalah kualitas.** Spacing, warna, tipografi harus konsisten dalam satu aset dan antar aset Exiom.
- **Kecepatan membaca menentukan keberhasilan.** Pesan utama harus tersampaikan dalam 3 detik pertama.
- **Benchmarked ke referensi terbaik** - tidak cukup "sudah bagus", harus setara level awwwards/top agency.

---

## 2. Brand Tokens (wajib pakai, tidak boleh improvisasi warna)

```
Accent (primary): #FF5A1F
Background dark:  #1C1C1E
Background light: #FAFAFA
Text primary:     #0A0A0A (light mode) / #FAFAFA (dark mode)
Text secondary:   #6B7280
Border subtle:    #E5E7EB (light) / #2C2C2E (dark)
```

File lengkap: `Brand Identity/Brand Guideline.html`
Logo: `Brand Identity/Primary Light.svg` (di atas bg gelap), `Primary Dark.svg` (di atas bg terang)

---

## 3. Tipografi

- **Heading utama**: Space Grotesk Bold atau Neue Montreal Bold
- **Body/caption**: Inter Regular atau IBM Plex Sans
- **Hierarchy minimum**: minimal 2 ukuran berbeda dalam satu layout (judul vs body)
- **Jangan lebih dari 2 font family** dalam satu aset

---

## 4. Video (Deril) - Standar Produksi

### Format output
| Platform | Ratio | Resolusi | Durasi | Format |
|---|---|---|---|---|
| TikTok | 9:16 | 1080x1920 | 15-60 detik | MP4 H.264 |
| Instagram Reels | 9:16 | 1080x1920 | 15-90 detik | MP4 H.264 |
| Instagram Feed | 1:1 atau 4:5 | 1080x1080 / 1080x1350 | maks 60 detik | MP4 H.264 |
| YouTube Shorts | 9:16 | 1080x1920 | maks 60 detik | MP4 H.264 |
| Facebook Reels | 9:16 | 1080x1920 | 15-90 detik | MP4 H.264 |
| X (video tweet) | 16:9 atau 1:1 | 1280x720 | maks 140 detik | MP4 H.264 |

### Remotion - cara render
```bash
# Video
npx remotion render <composition> output.mp4 --codec=h264

# Still frame / grafis statis
npx remotion still <composition> output.png --frame=0

# Batch export (semua format sekaligus via script)
# Buat script di tools/node/remotion-deril/scripts/batch-export.ts
```

### Standar visual video
- **Hook 0-2 detik**: motion atau teks besar - tidak boleh dimulai dengan logo statis
- **Teks on-screen**: minimal 36px, kontras 4.5:1 terhadap background
- **Transisi**: purposeful - setiap transisi harus ada alasan komunikasinya, bukan sekadar "biar kelihatan keren"
- **Logo Exiom**: muncul konsisten - opening atau closing, tidak keduanya sekaligus (kecuali dikecilkan)
- **Audio**: balance -14 LUFS integrated loudness (standar sosmed)
- **Color grade**: konsisten dengan palet brand - tidak random filter Instagram

### Referensi style video yang disukai Owner
- Referensi ada di `Refrensi Video/` (Ref 1-5.mp4)
- Boleh Cari referensi tambahan mandiri (Bukan Kewajiban, Kalau Memang dirasa perlu): TikTok explore, YouTube Shorts, Motionographer.com
- Benchmark mingguan: screenshot 3 video terbaik yang ditemukan, simpan di memory Deril

---

## 5. Grafis Statis - Carousel, Banner, Thumbnail (Deril)

### Format output
| Format | Resolusi | Platform |
|---|---|---|
| Carousel slide | 1080x1080 | IG, LinkedIn |
| Story | 1080x1920 | IG Story, FB Story |
| Banner horizontal | 1200x628 | FB, LinkedIn share |
| Thumbnail | 1280x720 | YouTube |

### Cara produksi (Remotion stills)
```tsx
// Contoh struktur React component untuk still frame
export const CarouselSlide: React.FC<{slide: SlideData}> = ({slide}) => (
  <AbsoluteFill style={{background: '#1C1C1E'}}>
    <Img src={staticFile('logo.svg')} style={{...}} />
    <div style={{fontFamily: 'Space Grotesk', fontSize: 72, color: '#FAFAFA'}}>
      {slide.headline}
    </div>
  </AbsoluteFill>
)
```

### Standar layout
- **Grid**: gunakan 8px atau 12px grid system - semua elemen snap ke grid
- **White space**: minimum 48px margin dari edge
- **Carousel**: slide pertama harus berdiri sendiri sebagai teaser
- **Konsistensi antar slide**: warna, font, style identik - hanya konten yang berubah

---

## 6. Pitchdeck & Proposal (Joce)

### Format output
- **Pitchdeck**: PDF (dari Remotion stills, bukan PPT template generik)
- **Proposal teks**: Markdown yang dirender jadi PDF - jangan pakai Google Slides default template

### Standar slide pitchdeck
| Slide | Konten wajib |
|---|---|
| Cover | Nama klien, nama project, tanggal, logo Exiom |
| Problem | Satu kalimat masalah klien, bukan paragraph. Data kalau ada. |
| Solution | Apa yang Exiom kerjakan. Spesifik, bukan "kami hadir untuk..." |
| Deliverable | List konkret apa yang diserahkan, format apa, kapan |
| Timeline | Visual gantt atau milestone sederhana |
| Investment | Harga dari price-list.md setelah multiplier segmen, bukan range ambigu |
| About Exiom | 3 kalimat max - bukan company profile panjang |
| CTA | Satu aksi yang diminta klien: "Reply ke email ini" bukan 5 pilihan |

### Cara cari referensi pitchdeck
- Slideshare (search "agency proposal deck" atau "software house proposal")
- Deck.to, Pitch.com (lihat public templates)
- Dribbble (search "pitch deck design")
- Referensi dari Owner ada di `Refrensi Pitchdeck/Proposal/`

### Anti-pattern yang dilarang
- Template PowerPoint default dengan warna biru/abu
- Stock photo orang tersenyum di depan laptop
- Bullet list 5+ point per slide
- Font lebih dari 2 family
- Warna di luar brand tokens tanpa alasan spesifik

---

## 7. QA Checklist Sebelum Submit ke Mia/Nela

Deril dan Joce wajib self-check ini sebelum submit:

- [ ] Semua brand tokens dipakai (tidak ada warna improvisasi)
- [ ] Tipografi sesuai standar (Space Grotesk/Inter)
- [ ] Logo Exiom ada dan proporsinya benar
- [ ] Tidak ada em dash (--) dalam teks yang akan dipublikasi
- [ ] Tidak ada kata-kata AI slop (lihat brand-voice.md)
- [ ] Pesan utama tersampaikan dalam 3 detik pertama
- [ ] Semua teks terbaca (kontras cukup, ukuran cukup)
- [ ] Format sesuai spesifikasi platform tujuan
- [ ] File size dalam batas platform (video maks 4GB TikTok, 250MB IG)
