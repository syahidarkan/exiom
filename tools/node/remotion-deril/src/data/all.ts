// Reel 21 Okt. Durasi dari ffprobe audio VO (Gadis) + pad 0.3 dtk.
import type {Reel} from '../types';

export const REELS: Reel[] = [
  {
    "id": "reel21",
    "file": "tiktok-21okt-pesanan-wa.mp4",
    "bgm": "bgm-main.mp3",
    "scenes": [
      {
        "kind": "hookClock",
        "vo": "Pesanan jam 2 siang, baru kebaca jam 9 malam.",
        "audio": "audio/reel21/s0.mp3",
        "seconds": 5.87
      },
      {
        "kind": "chatBadge",
        "vo": "Di HP ada 47 chat belum dibalas. Tiga di antaranya pesanan.",
        "audio": "audio/reel21/s1.mp3",
        "seconds": 8.12
      },
      {
        "kind": "bubbles",
        "vo": "Yang satu minta 20 kotak. Yang satu tanya bisa diantar hari ini atau nggak. Yang terakhir cuma kirim foto menu.",
        "audio": "audio/reel21/s2.mp3",
        "seconds": 11.44
      },
      {
        "kind": "waitingSwap",
        "vo": "Pelanggannya nunggu, lalu pindah ke toko sebelah.",
        "audio": "audio/reel21/s3.mp3",
        "seconds": 5.08
      },
      {
        "kind": "chatStack",
        "vo": "Ini ilustrasi, tapi polanya sering terjadi. Pesanan tenggelam di antara obrolan keluarga, foto grup, dan promo.",
        "audio": "audio/reel21/s4.mp3",
        "seconds": 11.46
      },
      {
        "kind": "closeCta",
        "vo": "Kamu juga begini?",
        "audio": "audio/reel21/s5.mp3",
        "seconds": 3.4
      }
    ]
  },
];
