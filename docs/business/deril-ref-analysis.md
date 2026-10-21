# Analisis Referensi: New Ref 4.mp4 (oleh Deril, 20 Okt 2026)

Sumber: Refrensi Video/New Ref 4.mp4. Spesifikasi asli: 1280x720 (landscape 16:9), 30 fps, durasi 15,43 detik.
Metode: watch.py (--engine local, token-burner, 768px). Frame yang dibaca langsung: 0001 sampai 0008, 0010 sampai 0012, 0014, 0015 (13 frame). Frame 0009 dan 0013 tidak ikut ter-extract, jadi tidak dianalisis. Warna dicek ulang dengan sampling piksel dari frame 0 s, 5 s, dan 10 s, bukan tebakan saja.

## 1. Apa isi videonya

Ini promo produk AI (Claude Opus 5.5), dan itu penting: logo dan palet mereknya tidak boleh ikut ditiru. Yang ditiru adalah BAHASA VISUALNYA, bukan identitasnya.

Alurnya, dibaca dari frame:
- 0 s sampai ~3 s: kartu cream dengan pola titik halftone di tepi kiri dan kanan. Di tengah ada bentuk lonjong (lozenge) krem, lalu muncul starburst oranye.
- ~3 s sampai ~5 s: wordmark "Claude Opus 5.5" tampil di tengah pada latar cream dengan glow peach lembut.
- ~5 s sampai ~7 s: latar berubah jadi gelap (hitam ke cokelat tua di tengah). Angka "5.5" besar disusun dari partikel emas dan tembaga, dengan kilau horizontal lewat di tengah.
- ~7 s sampai ~9 s: beralih ke screenshot antarmuka chat gelap. Kalimat sapaan "Halo, Ngorz, mau bikin apa hari ini?" dan prompt "Buatkan video motion grafis 20 detik untuk Opus 5.5".
- ~9 s sampai ~11 s: pil status berisi spinner dan teks "Menganimasikan." dengan gradien kaca (koral, lavender, amber). Ini sengaja jadi jeda.
- ~11 s sampai ~13 s: screenshot aplikasi editor (panel easing, timeline, keyframe). Kontennya memperlihatkan produk ini bekerja, bukan cuma diklaim.
- ~13 s sampai ~15 s: kembali ke tepi dot halftone gelap, dengan pecahan koral di tengah, lalu wordmark muncul pelan dari blur ("Cla...").

Pola besarnya: dua kutub, cream terang dan gelap hangat, dipindah-pindah. Pindah scene lewat perubahan latar dan tipografi, bukan lewat potongan keras.

## 2. Palet yang benar-benar terukur (sampling piksel)

- Frame 0 s (cream): #F0E8E0 dominan (sekitar 19% piksel), varian #F8E8D8, #F8E0D0, #E8D0C0.
- Frame 5 s dan 10 s (gelap): #080808 dominan (33 sampai 38% piksel), sisanya cokelat gelap #181008, #281810, #382018.
- Titik halftone: koral pucat sekitar #F2A7A3 sampai #F0B5A5.
- Aksen oranye/terakota: sekitar #D97757 sampai #E8795A.

Untuk Exiom, palet ini TIDAK dipakai langsung. Brand tokens wajib: Accent #FF5A1F, Background dark #1C1C1E, Background light #FAFAFA, Text #0A0A0A/#FAFAFA, Text secondary #6B7280. Palet referensi hanya memberi "logika" dua kutub terang/gelap.

## 3. Elemen visual yang BENAR-BENAR ada di referensi (dan dipakai)

1. Pola titik halftone di tepi kiri dan kanan, makin rapat dan tebal ke tepi, makin tipis ke tengah (terlihat jelas di frame 1, 2, 3, 4, 12, 14).
2. Dua kutub latar: cream terang dan gelap hangat/hitam. Pergantian antar dua kutub adalah ritme utama.
3. Glow radial lembut di tengah, tanpa tepi keras (frame 4, 5, 6, 15).
4. Tipografi sans-serif geometris, bobot reguler sampai medium. Teks utama besar di tengah, teks kecil di antarmuka.
5. Screenshot UI sungguhan (chat, editor). Ini bagian yang paling membuat video terasa "nyata" dan bukan ilustrasi generik.
6. Animasi masuk teks dengan blur ke fokus (frame 15, kata "Mau bikin apa" tajam, kata berikutnya memudar).
7. Jeda pendek sebagai napas: pil "Menganimasikan." dan wordmark muncul dari blur.

## 4. Yang TIDAK dipakai (sengaja)

- Logo starburst Claude dan wordmark mereknya. Itu merek orang lain.
- Palet terakota/peach dan latar screenshot Claude.
- Angka "5.5" partikel. Efek partikel berat butuh shader atau ribuan elemen. Dan dari sisi brief, ini tidak relevan untuk pemilik usaha kecil.
- Teks on-screen dalam bentuk caption/subtitle. Owner melarang ini dan saya tidak menambahkan apa pun yang mirip. Teks yang ada di referensi adalah judul dan antarmuka, bukan transkrip VO.
- Pill tag dengan simbol aneh (✳) atau ikon emoji. Tidak ada di referensi.

## 5. Adaptasi ke brief Exiom (keputusan saya, perlu QA Mia)

- Format: brief dan design-standards minta 9:16 (1080x1920) untuk TikTok dan YouTube Shorts. Referensi 16:9. Saya render 9:16 dan menyusun ulang komposisi jadi vertikal, dengan tepi halftone tetap di kiri dan kanan.
- Visual adalah UI sungguhan dalam bentuk mockup kode (Remotion): daftar chat, badge hitungan, bubble pesan. Ini meniru prinsip "screenshot UI" di referensi, tanpa memakai screenshot asli orang lain.
- Tidak ada teks overlay yang mengulang VO. Teks yang tampil hanya bagian dari UI mockup (nama chat, isi bubble, angka penunjuk waktu).
- Logo Exiom kecil di ujung video (sesuai brief), bukan di awal.
- VO: id-ID-ArdiNeural via edge-tts (gratis), rate -8%.

## 6. Timing dan pacing

- Hook dalam 3 detik pertama: situasi konkret, bukan pertanyaan. Di Exiom, hook dibuat dari dua angka jam di UI chat, bukan dari kalimat.
- Catatan jujur: saya TIDAK mengukur timestamp per frame dari referensi. Frame yang dianalisis hanya 13 dari 15 detik, dan waktu tiap frame tidak saya verifikasi. Jadi pembagian detik di bagian ini hanya perkiraan, bukan fakta.
- Pergantian scene setiap 2 sampai 9 detik, mengikuti panjang VO. Tidak ada transisi kosong.
- Total ~34,6 detik (dalam rentang 30 sampai 45 detik brief).

## 7. Catatan jujur

- Analisis ini dari 13 frame, bukan dari setiap frame. Gerakan (easing, kecepatan) hanya disimpulkan dari posisi antar frame, belum diukur dari video penuh.
- Hasil render harus dibandingkan frame-per-frame dengan referensi sebelum submit approval (lihat SOP di SOUL.md langkah 9).

## 8. Catatan implementasi v1 (20 Okt, sebelum QA)

- Komponen: tools/node/remotion-deril/src/Reel.tsx, 6 scene (hookClock, chatBadge, bubbles, waitingSwap, chatStack, closeCta), format 1080x1920.
- Still frame 0, 40, 110, 190, 300, 420, 520 sudah dicek dengan vision: tidak ada subtitle, tidak ada teks yang tumpang tindih, tidak ada logo di awal.
- Kekurangan yang saya tahu: scene bubble dan chatStack masih tampil sebagai skeleton (bar abu-abu) dan belum sekuat referensi. Referensi punya screenshot UI yang detail, sedangkan ini mockup sederhana. Ini akan saya bandingkan lagi setelah render v1 selesai.
- Palet yang dipakai adalah brand token Exiom (#FF5A1F, #1C1C1E, #FAFAFA), bukan palet referensi.
