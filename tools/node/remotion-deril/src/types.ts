// RESET 20 Okt 2026 — struktur lama dihapus, Deril membangun ulang dari nol.
// Definisikan Scene/Reel sendiri berdasarkan analisis referensi (New Ref 4.mp4),
// bukan berdasarkan struktur bawaan ini.

export interface Scene {
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
