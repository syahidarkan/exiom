import type {Reel} from './types';

export const REEL_21: Reel = {
  "id": "reel21",
  "file": "tiktok-21okt-pesanan-wa",
  "bgm": "audio/bgm/house-vibez.mp3",
  "scenes": [
    {
      "kind": "hook",
      "theme": "dark",
      "tag": "UMKM",
      "lines": [
        "Pesanan jam 2,",
        "kebaca jam 9."
      ],
      "accent": 1,
      "highlightWord": "jam 9.",
      "vo": "Pesanan jam dua siang baru kebaca jam sembilan malam.",
      "audio": "audio/reel21/s0.mp3",
      "seconds": 4.46
    },
    {
      "kind": "step",
      "theme": "dark",
      "stepNum": 1,
      "stepLabel": "Situasi nyata",
      "title": "Chat WA masuk terus, pesanan tenggelam.",
      "browser": {
        "url": "wa.me",
        "content": "Kak mau pesan 2 kopi susu ya 👋\nAda yang ready?\nKak jadi ga pesanannya?\nHalo kak? 😢"
      },
      "vo": "Chat WA masuk terus sepanjang hari. Pesanan kecil seperti ini tenggelam. Bukan karena kamu lalai, tapi karena WhatsApp memang tidak dibuat untuk mencatat pesanan.",
      "audio": "audio/reel21/s1.mp3",
      "seconds": 11.92
    },
    {
      "kind": "stat",
      "theme": "dark",
      "tag": "MINGGU INI",
      "value": "3",
      "unit": "pesanan kelewat",
      "vo": "Misalnya minggu ini ada tiga pesanan yang kelewat. Pelanggan kecewa, kamu rugi.",
      "audio": "audio/reel21/s2.mp3",
      "seconds": 7.22
    },
    {
      "kind": "compare",
      "theme": "dark",
      "tag": "BEDANYA",
      "title": "Dua kondisi:",
      "compare": {
        "left": {
          "icon": "📱",
          "label": "WA MANUAL",
          "sub": "pesanan bisa tenggelam",
          "crossed": true
        },
        "right": {
          "icon": "✅",
          "label": "TERCATAT",
          "sub": "semua pesanan aman",
          "color": "#E87040"
        }
      },
      "vo": "Satu perbedaan kecil di cara mencatat pesanan bisa mengubah segalanya.",
      "audio": "audio/reel21/s3.mp3",
      "seconds": 5.32
    },
    {
      "kind": "cta",
      "theme": "dark",
      "tag": "TANYA",
      "text": "Kamu juga begini?",
      "sub": "Pesanan apa yang paling sering kelewat?",
      "vo": "Kamu juga begini? Tulis di kolom komentar, pesanan apa yang paling sering kelewat.",
      "audio": "audio/reel21/s4.mp3",
      "seconds": 7.12
    }
  ]
};

export const REEL_23: Reel = {
  "id": "reel23",
  "file": "tiktok-23okt-selisih-stok",
  "bgm": "audio/bgm/house-vibez.mp3",
  "scenes": [
    {
      "kind": "hook",
      "theme": "dark",
      "tag": "STOK",
      "lines": [
        "Di buku: 12.",
        "Di rak: 7."
      ],
      "accent": 1,
      "highlightWord": "Di rak: 7.",
      "vo": "Di buku tertulis 12. Di rak tinggal 7. Selisihnya ke mana?",
      "audio": "audio/reel23/s0.mp3",
      "seconds": 7.89
    },
    {
      "kind": "ledger",
      "theme": "dark",
      "tag": "CONTOH STOK",
      "title": "Catatan vs fisik hari ini",
      "rows": [
        {
          "item": "Kopi susu botol",
          "book": 12,
          "shelf": 7
        },
        {
          "item": "Roti sobek",
          "book": 8,
          "shelf": 8
        },
        {
          "item": "Teh tarik",
          "book": 20,
          "shelf": 18
        }
      ],
      "vo": "Stok di buku dan stok di rak hampir selalu beda. Barang keluar lewat WA, kasir, atau tangan karyawan, dan tidak semuanya ditulis.",
      "audio": "audio/reel23/s1.mp3",
      "seconds": 10.6
    },
    {
      "kind": "stat",
      "theme": "dark",
      "tag": "SEBULAN",
      "value": "150",
      "unit": "selisih stok",
      "vo": "Kalau setiap hari ada lima barang yang selisih, akhir bulan sudah 150 yang tidak jelas ke mana.",
      "audio": "audio/reel23/s2.mp3",
      "seconds": 6.91
    },
    {
      "kind": "compare",
      "theme": "dark",
      "tag": "KONDISI",
      "title": "Dua kondisi stok:",
      "compare": {
        "left": {
          "icon": "❌",
          "label": "SELISIH",
          "sub": "buku ≠ rak",
          "crossed": false,
          "color": "#E84B3A"
        },
        "right": {
          "icon": "✅",
          "label": "COCOK",
          "sub": "buku = rak",
          "color": "#E87040"
        }
      },
      "vo": "Istilahnya selisih stok. Jumlah yang tercatat dikurangi jumlah fisik. Lima botol hilang tanpa jejak.",
      "audio": "audio/reel23/s3.mp3",
      "seconds": 9.33
    },
    {
      "kind": "cta",
      "theme": "dark",
      "tag": "KAMU",
      "text": "Stok kamu dicatat di mana?",
      "sub": "Buku tulis? Excel? Atau ingatan?",
      "vo": "Stok kamu sekarang dicatat di mana? Tulis di kolom komentar.",
      "audio": "audio/reel23/s4.mp3",
      "seconds": 5.85
    }
  ]
};

export const REEL_25: Reel = {
  "id": "reel25",
  "file": "tiktok-25okt-tanya-stok",
  "bgm": "audio/bgm/house-vibez.mp3",
  "scenes": [
    {
      "kind": "hook",
      "theme": "dark",
      "tag": "UMKM",
      "lines": [
        "Pertanyaan yang sama,",
        "20× sehari."
      ],
      "accent": 1,
      "highlightWord": "20× sehari.",
      "vo": "Pertanyaan yang sama, dua puluh kali sehari.",
      "audio": "audio/reel25/s0.mp3",
      "seconds": 4.39
    },
    {
      "kind": "chat",
      "theme": "dark",
      "title": "Satu sore di WA usahamu",
      "bubbles": [
        "Ada stok kopi susu?",
        "Ada roti sobek?",
        "Buka jam berapa kak?",
        "Masih ada gula aren?"
      ],
      "counter": {
        "label": "pertanyaan hari ini",
        "value": 20
      },
      "vo": "Ada stok kopi susu? Ada roti sobek? Buka jam berapa? Pertanyaan yang sama datang berulang setiap hari.",
      "audio": "audio/reel25/s1.mp3",
      "seconds": 10.55
    },
    {
      "kind": "stat",
      "theme": "dark",
      "tag": "SEBULAN",
      "value": "10",
      "unit": "jam terbuang",
      "vo": "Dua puluh pertanyaan, satu menit per pertanyaan, tiga puluh hari. Sepuluh jam cuma untuk menjawab ada stok atau tidak.",
      "audio": "audio/reel25/s2.mp3",
      "seconds": 9.52
    },
    {
      "kind": "compare",
      "theme": "dark",
      "tag": "SOLUSINYA",
      "title": "Bedanya sederhana:",
      "compare": {
        "left": {
          "icon": "🔁",
          "label": "TANYA MANUAL",
          "sub": "tiap pelanggan nanya satu-satu",
          "crossed": true
        },
        "right": {
          "icon": "📲",
          "label": "STOK ONLINE",
          "sub": "pelanggan cek sendiri",
          "color": "#E87040"
        }
      },
      "vo": "Pertanyaan berulang itu sebenarnya data yang belum dicatat. Begitu tercatat dan bisa dibaca, pertanyaannya tidak perlu diulang lagi.",
      "audio": "audio/reel25/s3.mp3",
      "seconds": 9.69
    },
    {
      "kind": "cta",
      "theme": "dark",
      "tag": "KAMU",
      "text": "Pernah begini?",
      "sub": "Pertanyaan apa yang paling sering masuk?",
      "vo": "Kamu juga pernah begini? Tulis di kolom komentar, pertanyaan apa yang paling sering masuk ke usahamu.",
      "audio": "audio/reel25/s4.mp3",
      "seconds": 7.89
    }
  ]
};

export const REELS: Reel[] = [REEL_21, REEL_23, REEL_25];
