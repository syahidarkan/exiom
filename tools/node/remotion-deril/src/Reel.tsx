// RESET 20 Okt 2026 — template lama (dark glow, TagPill "✳", BottomSub caption)
// dihapus karena itu desain yang dipaksakan oleh orchestrator, bukan hasil analisis
// Deril sendiri terhadap referensi. Versi lama ada di ../.deprecated/Reel.tsx.old
// untuk dilihat sebagai contoh KESALAHAN yang harus dihindari (AI slop, caption,
// elemen generik yang tidak ada di referensi asli).
//
// Deril: bangun komponen ini dari nol berdasarkan analisis kamu sendiri atas
// Refrensi Video/New Ref 4.mp4 (dan referensi lain yang relevan dengan brief).
// Jangan copy struktur lama. Jangan ada subtitle/caption teks apa pun.

import React from "react";
import {AbsoluteFill} from "remotion";
import type {Reel} from "./types";

export const ReelComp: React.FC<{reel: Reel}> = () => {
  return (
    <AbsoluteFill style={{background: "#000", alignItems: "center", justifyContent: "center"}}>
      <div style={{color: "#555", fontFamily: "monospace", fontSize: 24, textAlign: "center"}}>
        Belum ada implementasi.<br />
        Deril: analisis referensi dulu sebelum membangun ulang komponen ini.
      </div>
    </AbsoluteFill>
  );
};
