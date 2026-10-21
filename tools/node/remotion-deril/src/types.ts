// Struktur data Reel, diturunkan dari docs/business/deril-ref-analysis.md.
// Setiap scene = satu VO (audio) + satu visual yang dipilih dari daftar `kind`.

export type SceneKind =
  | "hookClock"      // dua jam: pesan masuk vs baru dibaca
  | "chatBadge"      // daftar chat gelap dengan badge hitungan yang naik
  | "bubbles"        // bubble pesan pelanggan masuk berurutan
  | "waitingSwap"    // satu chat menunggu dengan timer, lalu pindah ke toko lain
  | "chatStack"      // tumpukan chat, pesanan tenggelam di bawah
  | "closeCta";      // penutup gelap, logo kecil

export interface Scene {
  kind: SceneKind;
  vo: string;
  audio: string;
  seconds: number;
}

export interface Reel {
  id: string;
  file: string;
  bgm?: string;
  scenes: Scene[];
}
