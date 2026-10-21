// Komponen reel vertikal 1080x1920. Visual dibangun dari analisis sendiri
// (docs/business/deril-ref-analysis.md). Tanpa subtitle/caption VO.
// Teks di layar hanya elemen UI (nama chat, angka, judul pendek). Tidak ada
// kalimat yang mengulang VO.

import React from "react";
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import type {Reel, Scene} from "./types";

const FPS = 30;
const ACCENT = "#FF5A1F";
const DARK = "#1C1C1E";
const LIGHT = "#FAFAFA";
const TEXT_DARK = "#0A0A0A";
const TEXT_LIGHT = "#FAFAFA";
const MUTED = "#6B7280";
const BORDER_LIGHT = "#E5E7EB";
const BORDER_DARK = "#2C2C2E";
const HEAD = "'Space Grotesk', sans-serif";
const BODY = "'Inter', sans-serif";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

// Pola titik halftone di tepi kiri dan kanan, makin rapat ke tepi.
const Halftone: React.FC<{side: "left" | "right"; color: string}> = ({side, color}) => {
  const grad = side === "left" ? "to right" : "to left";
  const mask = `linear-gradient(${grad}, black 0%, transparent 100%)`;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 230,
        backgroundImage: `radial-gradient(circle, ${color} 5px, transparent 6px)`,
        backgroundSize: "34px 34px",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
};

const Frame: React.FC<{theme: "light" | "dark"; children: React.ReactNode}> = ({theme, children}) => {
  const isDark = theme === "dark";
  const dot = isDark ? "rgba(255,90,31,0.28)" : "rgba(255,90,31,0.22)";
  return (
    <AbsoluteFill style={{background: isDark ? DARK : LIGHT, fontFamily: BODY, overflow: "hidden"}}>
      <Halftone side="left" color={dot} />
      <Halftone side="right" color={dot} />
      {children}
    </AbsoluteFill>
  );
};

// Teks muncul dari blur ke fokus.
const blurIn = (f: number, start: number, dur: number) => ({
  opacity: interpolate(f, [start, start + dur], [0, 1], clamp),
  filter: `blur(${interpolate(f, [start, start + dur], [14, 0], clamp)}px)`,
});

const SceneHookClock: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lineGrow = interpolate(f, [30, 60], [0, 260], clamp);
  const pop = spring({frame: f - 52, fps, config: {damping: 200}});
  return (
    <Frame theme="light">
      <div style={{position: "absolute", top: 560, width: "100%", textAlign: "center", fontFamily: HEAD, fontWeight: 700, fontSize: 230, color: TEXT_DARK, letterSpacing: -6, ...blurIn(f, 0, 16)}}>
        14.02
      </div>
      <div style={{position: "absolute", left: "50%", top: 920, width: 4, height: lineGrow, background: ACCENT, transform: "translateX(-50%)"}} />
      <div style={{position: "absolute", top: 1060, width: "100%", textAlign: "center", fontFamily: HEAD, fontWeight: 700, fontSize: 230, color: ACCENT, letterSpacing: -6, opacity: interpolate(f, [52, 66], [0, 1], clamp), transform: `translateY(${interpolate(pop, [0, 1], [40, 0])}px)`}}>
        21.09
      </div>
    </Frame>
  );
};

// Isi preview chat = teks UI daftar chat (bukan caption). Dipakai sebagai tampilan HP.
const CHAT_ROWS = [
  {name: "Keluarga", preview: "Nanti sore pulang jam berapa?"},
  {name: "Foto grup RT", preview: "[Foto] 14 foto"},
  {name: "Promo toko", preview: "Diskon 20% khusus hari ini"},
  {name: "Ibu Sari", preview: "Mau pesan lagi yang kemarin"},
  {name: "Pesanan", preview: "Minta 20 kotak, bisa diantar?"},
];

const SceneChatBadge: React.FC = () => {
  const f = useCurrentFrame();
  const count = Math.round(interpolate(f, [0, 110], [3, 47], clamp));
  return (
    <Frame theme="dark">
      <div style={{position: "absolute", top: 300, left: 110, right: 110, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div style={{fontFamily: HEAD, fontWeight: 700, fontSize: 88, color: TEXT_LIGHT}}>Chat</div>
        <div style={{minWidth: 120, height: 120, borderRadius: 60, background: ACCENT, color: TEXT_LIGHT, fontFamily: HEAD, fontWeight: 700, fontSize: 64, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px"}}>
          {count}
        </div>
      </div>
      <div style={{position: "absolute", top: 520, left: 110, right: 110}}>
        {CHAT_ROWS.map((row, i) => {
          const s = interpolate(f, [i * 8, i * 8 + 14], [0, 1], clamp);
          return (
            <div key={row.name} style={{display: "flex", alignItems: "center", gap: 36, padding: "38px 0", borderBottom: `2px solid ${BORDER_DARK}`, opacity: s, transform: `translateX(${(1 - s) * 80}px)`}}>
              <div style={{width: 110, height: 110, borderRadius: 55, background: "#2C2C2E", flexShrink: 0}} />
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontFamily: HEAD, fontWeight: 700, fontSize: 52, color: TEXT_LIGHT}}>{row.name}</div>
                <div style={{marginTop: 10, fontFamily: BODY, fontSize: 38, color: "#A1A1A6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{row.preview}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

// Bubble pesan pelanggan tanpa teks. Isinya bentuk saja, supaya tidak jadi caption.
const SceneBubbles: React.FC = () => {
  const f = useCurrentFrame();
  // Bubble berisi nama pengirim + jam, bukan kalimat VO (tidak ada caption).
  const rows = [
    {w: 620, h: 150, text: "Ibu Sari · 14.02"},
    {w: 700, h: 150, text: "Bayu · 14.05"},
    {w: 460, h: 360, photo: true, text: "Menu · 14.09"},
  ];
  return (
    <Frame theme="light">
      <div style={{position: "absolute", top: 260, left: 110, fontFamily: HEAD, fontWeight: 700, fontSize: 64, color: TEXT_DARK}}>Pelanggan</div>
      <div style={{position: "absolute", top: 380, left: 110, right: 110, display: "flex", flexDirection: "column", gap: 44}}>
        {rows.map((b, i) => {
          const s = interpolate(f, [i * 36, i * 36 + 22], [0, 1], clamp);
          return (
            <div key={i} style={{alignSelf: "flex-start", width: b.w, height: b.h, background: "#FFFFFF", border: `2px solid ${BORDER_LIGHT}`, borderRadius: 40, borderBottomLeftRadius: 8, padding: 36, boxSizing: "border-box", opacity: s, transform: `translateY(${(1 - s) * 60}px)`}}>
              {b.photo ? (
                <div style={{width: "100%", height: "100%", borderRadius: 24, background: "#EDEDEF", display: "flex", alignItems: "flex-end", padding: 16, boxSizing: "border-box"}}>
                  <div style={{fontFamily: BODY, fontSize: 36, color: MUTED}}>{b.text}</div>
                </div>
              ) : (
                <div style={{fontFamily: BODY, fontSize: 48, color: TEXT_DARK, lineHeight: 1.2}}>{b.text}</div>
              )}
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

const SceneWaitingSwap: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const secs = Math.round(interpolate(f, [0, 70], [0, 3240], clamp));
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const out = interpolate(f, [70, 92], [0, 1], clamp);
  const inn = spring({frame: f - 80, fps, config: {damping: 200}});
  const rowStyle: React.CSSProperties = {display: "flex", alignItems: "center", gap: 36, padding: "44px 40px", background: "#2C2C2E", borderRadius: 36, width: "100%", boxSizing: "border-box"};
  return (
    <Frame theme="dark">
      <div style={{position: "absolute", top: 600, left: 110, right: 110}}>
        <div style={{...rowStyle, opacity: 1 - out, transform: `translateX(${out * -200}px)`}}>
          <div style={{width: 110, height: 110, borderRadius: 55, background: "#48484A", flexShrink: 0}} />
          <div style={{flex: 1}}>
            <div style={{fontFamily: HEAD, fontWeight: 700, fontSize: 52, color: TEXT_LIGHT}}>Pelanggan</div>
            <div style={{fontFamily: HEAD, fontWeight: 700, fontSize: 88, color: ACCENT, marginTop: 8, fontVariantNumeric: "tabular-nums"}}>{hh}:{mm}:{ss}</div>
          </div>
        </div>
        <div style={{...rowStyle, marginTop: 40, opacity: inn, transform: `translateX(${(1 - inn) * 200}px)`}}>
          <div style={{width: 110, height: 110, borderRadius: 55, background: "#48484A", flexShrink: 0}} />
          <div style={{flex: 1}}>
            <div style={{fontFamily: HEAD, fontWeight: 700, fontSize: 52, color: TEXT_LIGHT}}>Toko sebelah</div>
            <div style={{fontFamily: BODY, fontSize: 40, color: "#A1A1A6", marginTop: 8}}>Balas cepat</div>
          </div>
        </div>
      </div>
    </Frame>
  );
};

const STACK = ["Keluarga", "Foto grup", "Promo toko"];

const SceneChatStack: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Frame theme="light">
      <div style={{position: "absolute", top: 260, left: 110, fontFamily: HEAD, fontWeight: 700, fontSize: 64, color: TEXT_DARK}}>Chat masuk</div>
      <div style={{position: "absolute", top: 400, left: 110, right: 110}}>
        {STACK.map((name, i) => {
          const s = interpolate(f, [i * 22, i * 22 + 20], [0, 1], clamp);
          return (
            <div key={name} style={{display: "flex", alignItems: "center", gap: 36, padding: "40px 0", borderBottom: `2px solid ${BORDER_LIGHT}`, opacity: s, transform: `translateY(${(1 - s) * -40}px)`}}>
              <div style={{width: 110, height: 110, borderRadius: 55, background: BORDER_LIGHT, flexShrink: 0}} />
              <div style={{flex: 1}}>
                <div style={{fontFamily: HEAD, fontWeight: 700, fontSize: 52, color: TEXT_DARK}}>{name}</div>
                <div style={{marginTop: 18, height: 22, width: 380 + i * 110, borderRadius: 11, background: BORDER_LIGHT}} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{position: "absolute", top: 1000, left: 110, right: 110, display: "flex", alignItems: "center", gap: 36, padding: "40px 0", opacity: interpolate(f, [70, 100], [0, 1], clamp)}}>
        <div style={{width: 110, height: 110, borderRadius: 55, background: ACCENT, flexShrink: 0}} />
        <div>
          <div style={{fontFamily: HEAD, fontWeight: 700, fontSize: 52, color: TEXT_DARK}}>Pesanan</div>
          <div style={{marginTop: 18, height: 22, width: 520, borderRadius: 11, background: ACCENT}} />
        </div>
      </div>
    </Frame>
  );
};

// Penutup: logo transparan di atas, bloom spring + mask-wipe dari kiri,
// garis oranye menyapu sebagai penanda wipe, lalu tagline blur-in di bawah logo.
const SceneCloseCta: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: f - 4, fps, config: {damping: 12, stiffness: 150, mass: 0.8}});
  const scale = interpolate(pop, [0, 1], [0.86, 1]);
  const wipe = interpolate(f, [4, 28], [100, 0], clamp); // persen yang masih tertutup dari kanan
  const edge = 100 - wipe; // posisi tepi wipe (persen dari kiri)
  const barOpacity = interpolate(f, [4, 8, 24, 30], [0, 1, 1, 0], clamp);
  const glow = interpolate(f, [24, 36, 60], [0, 0.35, 0.12], clamp);
  const LOGO_W = 640;
  const LOGO_TOP = 560;
  return (
    <Frame theme="dark">
      <div style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, background: `radial-gradient(circle at 50% ${LOGO_TOP + 110}px, rgba(255,90,31,${glow}) 0%, transparent 42%)`}} />
      <div style={{position: "absolute", top: LOGO_TOP, left: "50%", width: LOGO_W, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "50% 50%"}}>
        <div style={{position: "relative", width: "100%", clipPath: `inset(0 ${wipe}% 0 0)`}}>
          <Img src={staticFile("brand/logo-transparent-light.svg")} style={{width: "100%", display: "block"}} />
        </div>
        <div style={{position: "absolute", top: "18%", bottom: "18%", left: `${edge}%`, width: 4, background: ACCENT, opacity: barOpacity, transform: "translateX(-2px)"}} />
      </div>
      <div style={{position: "absolute", top: LOGO_TOP + 270, width: "100%", textAlign: "center", fontFamily: HEAD, fontWeight: 700, fontSize: 46, letterSpacing: 7, color: TEXT_LIGHT, ...blurIn(f, 40, 20)}}>
        ENGINEERED FOR INTELLIGENCE.
      </div>
    </Frame>
  );
};

const RENDERERS: Record<Scene["kind"], React.FC> = {
  hookClock: SceneHookClock,
  chatBadge: SceneChatBadge,
  bubbles: SceneBubbles,
  waitingSwap: SceneWaitingSwap,
  chatStack: SceneChatStack,
  closeCta: SceneCloseCta,
};

export const ReelComp: React.FC<{reel: Reel}> = ({reel}) => {
  let from = 0;
  return (
    <AbsoluteFill style={{background: DARK}}>
      {reel.bgm ? <Audio src={staticFile(reel.bgm)} volume={0.15} /> : null}
      {reel.scenes.map((scene, i) => {
        const dur = Math.round(scene.seconds * FPS);
        const start = from;
        from += dur;
        const Scn = RENDERERS[scene.kind];
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <Scn />
            <Audio src={staticFile(scene.audio)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
