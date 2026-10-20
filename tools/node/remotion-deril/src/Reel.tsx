/**
 * Remotion template — rebuilt dari analisis langsung 8 ref TikTok baru (20 Okt 2026)
 *
 * Style utama yang diambil dari refs:
 * - Ref 5 (Kang Mamatz): dark #0D0D0D + glow blob + numbered steps + browser mockup
 * - Ref 6 (DIBUAT 100% PAKAI KODE): dark + pill tag + compare cards + bottom subtitle plain
 * - Ref 8 (BALAS KOMENTAR): light grey + kinetic word highlight + ghost quote
 * - Ref 1 (Tutorial AI): cream #F5EDE0 + LANGKAH X + browser mockup
 *
 * JANGAN edit file ini untuk ganti konten. Edit: src/data/reels-content.json
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import type {Reel, Scene} from "./types";

// ── Themes ────────────────────────────────────────────────────────────────────
const T = {
  dark: {
    bg:      "#0D0D0D",
    card:    "#1A1A1A",
    cardBorder: "rgba(255,255,255,0.08)",
    accent:  "#E87040",
    text:    "#FFFFFF",
    textDim: "rgba(255,255,255,0.55)",
    sub:     "rgba(255,255,255,0.75)",
    font:    "'Space Grotesk', sans-serif",
    fontBody: "'Inter', sans-serif",
    glowA:   "#E87040",
    glowB:   "#C0392B",
  },
  cream: {
    bg:      "#F5EDE0",
    card:    "#FFFFFF",
    cardBorder: "rgba(0,0,0,0.08)",
    accent:  "#C94F2A",
    text:    "#1A1A1A",
    textDim: "rgba(26,26,26,0.5)",
    sub:     "#4A3728",
    font:    "'Space Grotesk', sans-serif",
    fontBody: "'Inter', sans-serif",
    glowA:   "#E87040",
    glowB:   "#F5C4A8",
  },
};

// ── Spring helpers ─────────────────────────────────────────────────────────────
function useSpring(delay = 0, cfg = {damping: 160, stiffness: 140}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: cfg});
}

const FadeUp: React.FC<{delay?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({delay = 0, children, style}) => {
  const p = useSpring(delay, {damping: 200, stiffness: 100});
  return (
    <div style={{opacity: p, transform: `translateY(${(1 - p) * 40}px)`, ...style}}>
      {children}
    </div>
  );
};

const SlideIn: React.FC<{delay?: number; from?: "left"|"right"|"bottom"; children: React.ReactNode; style?: React.CSSProperties}> = ({delay = 0, from = "bottom", children, style}) => {
  const p = useSpring(delay, {damping: 180, stiffness: 120});
  const dx = from === "left" ? -1 : from === "right" ? 1 : 0;
  const dy = from === "bottom" ? 1 : 0;
  return (
    <div style={{
      opacity: p,
      transform: `translate(${dx * (1 - p) * 80}px, ${dy * (1 - p) * 60}px)`,
      ...style,
    }}>
      {children}
    </div>
  );
};

// ── Glow blob background (Ref 5 / 6 style) ────────────────────────────────────
const GlowBlob: React.FC<{color: string; x?: string; y?: string; size?: number; opacity?: number}> = ({
  color, x = "50%", y = "20%", size = 500, opacity = 0.35
}) => (
  <div style={{
    position: "absolute", left: x, top: y,
    width: size, height: size,
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background: color,
    filter: `blur(${size * 0.35}px)`,
    opacity,
    zIndex: 0,
    pointerEvents: "none",
  }} />
);

// ── Pill tag (✳ KUNCINYA style from Ref 6) ─────────────────────────────────────
const TagPill: React.FC<{label: string; accent: string; delay?: number}> = ({label, accent, delay = 0}) => (
  <FadeUp delay={delay}>
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "10px 20px",
      background: `${accent}22`,
      border: `1.5px solid ${accent}55`,
      borderRadius: 100,
      fontSize: 28, fontWeight: 700, letterSpacing: "0.08em",
      color: accent,
      fontFamily: "'Space Grotesk', sans-serif",
      textTransform: "uppercase",
    }}>
      <span style={{fontSize: 22}}>✳</span> {label}
    </div>
  </FadeUp>
);

// ── Kinetic word highlight (word in box, Ref 8 style) ─────────────────────────
const KineticText: React.FC<{
  text: string; highlight?: string;
  color: string; accent: string;
  size?: number; delay?: number;
}> = ({text, highlight, color, accent, size = 96, delay = 0}) => {
  const parts = highlight ? text.split(highlight) : [text];
  return (
    <FadeUp delay={delay}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
        fontSize: size, lineHeight: 1.1, color,
        letterSpacing: "-0.02em",
      }}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span style={{
                color: accent,
                border: `3px solid ${accent}`,
                borderRadius: 8,
                padding: "2px 12px",
                marginInline: 4,
                display: "inline-block",
                lineHeight: 1.15,
              }}>
                {highlight}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </FadeUp>
  );
};

// ── Browser window mockup (Ref 1 / 5 style) ───────────────────────────────────
const BrowserMock: React.FC<{
  url?: string; content: React.ReactNode; delay?: number;
  bg?: string; borderColor?: string;
}> = ({url = "claude.ai/chat", content, delay = 8, bg = "#FAFAFA", borderColor = "rgba(0,0,0,0.1)"}) => (
  <SlideIn delay={delay} from="bottom">
    <div style={{
      background: bg, borderRadius: 20,
      border: `1px solid ${borderColor}`,
      boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      overflow: "hidden",
    }}>
      <div style={{
        background: "rgba(0,0,0,0.05)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <div style={{width: 12, height: 12, borderRadius: "50%", background: "#FF5F57"}} />
        <div style={{width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E"}} />
        <div style={{width: 12, height: 12, borderRadius: "50%", background: "#28C840"}} />
        <div style={{flex: 1, background: "rgba(0,0,0,0.07)", borderRadius: 6, padding: "4px 12px", textAlign: "center", fontSize: 22, color: "rgba(0,0,0,0.45)", fontFamily: "'Inter', sans-serif"}}>
          {url}
        </div>
      </div>
      <div style={{padding: "24px 28px"}}>
        {content}
      </div>
    </div>
  </SlideIn>
);

// ── Compare cards (Ref 6 style — 2 dark cards with icon + label) ───────────────
const CompareCards: React.FC<{
  left: {icon?: string; label: string; sub?: string; crossed?: boolean; color?: string};
  right: {icon?: string; label: string; sub?: string; color?: string};
  cardBg: string; cardBorder: string; text: string; accent: string;
}> = ({left, right, cardBg, cardBorder, text, accent}) => (
  <div style={{display: "flex", gap: 20}}>
    {[{...left, idx: 0}, {...right, idx: 1}].map((c, i) => (
      <SlideIn key={i} delay={8 + i * 10} from={i === 0 ? "left" : "right"} style={{flex: 1}}>
        <div style={{
          background: c.color ? `${c.color}22` : cardBg,
          border: `2px solid ${c.color ? c.color + "55" : cardBorder}`,
          borderRadius: 20,
          padding: "36px 24px",
          minHeight: 260,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center",
          position: "relative",
        }}>
          {c.crossed && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{width: "85%", height: 4, background: "#E84B3A", transform: "rotate(-18deg)", borderRadius: 2, opacity: 0.9}} />
            </div>
          )}
          {c.icon && (
            <div style={{fontSize: 64, marginBottom: 16}}>{c.icon}</div>
          )}
          <div style={{fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 52, color: c.color ?? text, lineHeight: 1.1}}>{c.label}</div>
          {c.sub && (
            <div style={{fontSize: 32, color: "rgba(255,255,255,0.5)", marginTop: 10, fontFamily: "'Inter', sans-serif"}}>{c.sub}</div>
          )}
        </div>
      </SlideIn>
    ))}
  </div>
);

// ── Bottom subtitle — plain centered text (NOT a black bar) ────────────────────
const BottomSub: React.FC<{text: string; accent: string; highlightWord?: string}> = ({text, accent, highlightWord}) => {
  const parts = highlightWord ? text.split(highlightWord) : [text];
  return (
    <div style={{
      position: "absolute", bottom: 60, left: 40, right: 40, zIndex: 10,
      textAlign: "center",
    }}>
      <div style={{fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 40, color: "#FFFFFF", lineHeight: 1.3, textShadow: "0 2px 16px rgba(0,0,0,0.7)"}}>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {p}
            {i < parts.length - 1 && (
              <span style={{color: accent, borderBottom: `3px solid ${accent}`}}>{highlightWord}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── Frame counter (Ref 6 style) ────────────────────────────────────────────────
const FrameCounter: React.FC<{color: string}> = ({color}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", top: 32, right: 36, zIndex: 10,
      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
      fontSize: 22, letterSpacing: "0.1em", color: `${color}99`,
    }}>
      FRAME {String(frame).padStart(4, "0")}
    </div>
  );
};

// ── WA chat bubble ─────────────────────────────────────────────────────────────
const WaBubble: React.FC<{text: string; mine?: boolean; delay?: number}> = ({text, mine = false, delay = 0}) => (
  <SlideIn delay={delay} from={mine ? "right" : "left"} style={{alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", marginBottom: 12}}>
    <div style={{
      background: mine ? "#005C4B" : "#262D31",
      color: "#fff", padding: "14px 20px",
      borderRadius: mine ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
      fontSize: 38, lineHeight: 1.4,
      fontFamily: "'Inter', sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    }}>
      {text}
    </div>
  </SlideIn>
);

// ── BGM helper ────────────────────────────────────────────────────────────────
const Bgm: React.FC<{src: string; totalFrames: number}> = ({src, totalFrames}) => {
  const frame = useCurrentFrame();
  const fadeFrames = 20;
  const vol = interpolate(
    frame,
    [0, fadeFrames, totalFrames - fadeFrames, totalFrames],
    [0, 0.13, 0.13, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  return <Audio src={staticFile(src)} volume={vol} />;
};

// ── SCENE RENDERERS ────────────────────────────────────────────────────────────

const SceneHook: React.FC<{s: Scene; si: number; st: number}> = ({s}) => {
  const th = (s.theme ?? "dark") as keyof typeof T;
  const t = T[th];
  const lines = s.lines ?? [];
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {th === "dark" && <>
        <GlowBlob color={t.glowA} x="70%" y="15%" size={400} opacity={0.4} />
        <GlowBlob color={t.glowB} x="20%" y="85%" size={300} opacity={0.25} />
      </>}
      {th === "cream" && (
        <div style={{position: "absolute", inset: 0, background: `radial-gradient(ellipse at 70% 30%, ${t.glowB}60 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, ${t.glowA}20 0%, transparent 50%), ${t.bg}`}} />
      )}
      <FrameCounter color={t.accent} />
      <div style={{position: "absolute", top: "18%", left: 40, right: 40, zIndex: 5}}>
        {s.tag && (
          <div style={{marginBottom: 24}}>
            <TagPill label={s.tag} accent={t.accent} delay={0} />
          </div>
        )}
        {lines.map((line, i) => (
          <KineticText
            key={i}
            text={line}
            highlight={s.highlightWord && i === (s.accent ?? 0) ? s.highlightWord : undefined}
            color={i === (s.accent ?? 0) ? t.accent : t.text}
            accent={t.accent}
            size={i === 0 ? 88 : 100}
            delay={i * 8}
          />
        ))}
      </div>
      {s.vo && <BottomSub text={s.vo.split(".")[0] + "."} accent={t.accent} />}
    </AbsoluteFill>
  );
};

const SceneChat: React.FC<{s: Scene; si: number; st: number}> = ({s}) => {
  const th = (s.theme ?? "dark") as keyof typeof T;
  const t = T[th];
  const bubbles = s.bubbles ?? [];
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const counterStart = 12 + bubbles.length * 14;
  const shown = s.counter
    ? Math.round(interpolate(frame, [counterStart, counterStart + 50], [0, s.counter.value], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}))
    : 0;
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {th === "dark" && <GlowBlob color={t.glowA} x="80%" y="10%" size={350} opacity={0.3} />}
      <FrameCounter color={t.accent} />
      <div style={{position: "absolute", top: "8%", left: 40, right: 40, zIndex: 5}}>
        {s.tag && <div style={{marginBottom: 16}}><TagPill label={s.tag} accent={t.accent} /></div>}
        {s.title && (
          <FadeUp>
            <div style={{fontFamily: t.font, fontWeight: 700, fontSize: 44, color: t.textDim, marginBottom: 20}}>{s.title}</div>
          </FadeUp>
        )}
        <div style={{display: "flex", flexDirection: "column"}}>
          {bubbles.map((b, i) => <WaBubble key={i} text={b} mine={i % 2 !== 0} delay={8 + i * 14} />)}
        </div>
        {s.counter && (
          <FadeUp delay={counterStart} style={{marginTop: 20}}>
            <div style={{background: t.accent, borderRadius: 16, padding: "20px 28px", display: "flex", alignItems: "center", gap: 20}}>
              <div style={{fontFamily: t.font, fontWeight: 900, fontSize: 120, color: "#fff", lineHeight: 1}}>{shown}</div>
              <div style={{fontFamily: t.font, fontWeight: 700, fontSize: 36, color: "rgba(255,255,255,0.85)", lineHeight: 1.2}}>{s.counter.label}</div>
            </div>
          </FadeUp>
        )}
      </div>
      {s.vo && <BottomSub text={s.vo.split(".")[0] + "."} accent={t.accent} />}
    </AbsoluteFill>
  );
};

const SceneStat: React.FC<{s: Scene; si: number; st: number}> = ({s}) => {
  const th = (s.theme ?? "dark") as keyof typeof T;
  const t = T[th];
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {th === "dark" && <>
        <GlowBlob color={t.glowA} x="50%" y="50%" size={600} opacity={0.2} />
      </>}
      <FrameCounter color={t.accent} />
      <div style={{position: "absolute", top: "10%", left: 40, right: 40, zIndex: 5}}>
        {s.tag && <div style={{marginBottom: 28}}><TagPill label={s.tag} accent={t.accent} /></div>}
        <FadeUp delay={4}>
          <div style={{fontFamily: t.font, fontWeight: 900, fontSize: 240, lineHeight: 0.85, color: t.accent, letterSpacing: "-0.04em"}}>
            {s.value}
          </div>
        </FadeUp>
        <FadeUp delay={12}>
          <div style={{fontFamily: t.font, fontWeight: 700, fontSize: 72, color: t.text, lineHeight: 1.2, marginTop: 12}}>
            {s.unit}
          </div>
        </FadeUp>
      </div>
      {s.vo && <BottomSub text={s.vo.split(",")[0]} accent={t.accent} />}
    </AbsoluteFill>
  );
};

const SceneStep: React.FC<{s: Scene; si: number; st: number}> = ({s}) => {
  const th = (s.theme ?? "dark") as keyof typeof T;
  const t = T[th];
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {th === "dark" && <GlowBlob color={t.glowA} x="75%" y="15%" size={380} opacity={0.35} />}
      {th === "cream" && (
        <div style={{position: "absolute", inset: 0, background: `radial-gradient(ellipse at 70% 20%, ${t.glowB}55 0%, transparent 55%), ${t.bg}`}} />
      )}
      <FrameCounter color={t.accent} />
      <div style={{position: "absolute", top: "12%", left: 40, right: 40, zIndex: 5}}>
        <FadeUp delay={0}>
          <div style={{display: "flex", alignItems: "center", gap: 16, marginBottom: 28}}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: t.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: t.font, fontWeight: 900, fontSize: 36, color: "#fff",
            }}>
              {s.stepNum ?? (s.si + 1)}
            </div>
            <div style={{fontFamily: t.font, fontWeight: 600, fontSize: 32, color: t.textDim, letterSpacing: "0.06em", textTransform: "uppercase"}}>{s.stepLabel}</div>
          </div>
        </FadeUp>
        <FadeUp delay={8}>
          <div style={{fontFamily: t.font, fontWeight: 700, fontSize: 80, lineHeight: 1.1, color: t.text}}>
            {s.title}
          </div>
        </FadeUp>
        {s.browser && (
          <div style={{marginTop: 32}}>
            <BrowserMock
              url={s.browser.url}
              bg={t.card}
              borderColor={t.cardBorder}
              delay={16}
              content={
                <div style={{fontFamily: "'Inter', sans-serif", fontSize: 34, color: th === "dark" ? "#1A1A1A" : t.text, lineHeight: 1.5}}>
                  {s.browser.content}
                </div>
              }
            />
          </div>
        )}
      </div>
      {s.vo && <BottomSub text={s.vo.split(".")[0] + "."} accent={t.accent} />}
    </AbsoluteFill>
  );
};

const SceneCompare: React.FC<{s: Scene; si: number; st: number}> = ({s}) => {
  const th = (s.theme ?? "dark") as keyof typeof T;
  const t = T[th];
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {th === "dark" && <GlowBlob color={t.glowA} x="50%" y="20%" size={400} opacity={0.25} />}
      <FrameCounter color={t.accent} />
      <div style={{position: "absolute", top: "12%", left: 40, right: 40, zIndex: 5}}>
        {s.tag && <div style={{marginBottom: 20}}><TagPill label={s.tag} accent={t.accent} /></div>}
        {s.title && (
          <FadeUp>
            <div style={{fontFamily: t.font, fontWeight: 700, fontSize: 60, color: t.text, marginBottom: 36, lineHeight: 1.1}}>{s.title}</div>
          </FadeUp>
        )}
        {s.compare && (
          <CompareCards
            left={s.compare.left}
            right={s.compare.right}
            cardBg={t.card}
            cardBorder={t.cardBorder}
            text={t.text}
            accent={t.accent}
          />
        )}
      </div>
      {s.vo && <BottomSub text={s.vo.split(".")[0] + "."} accent={t.accent} />}
    </AbsoluteFill>
  );
};

const SceneLedger: React.FC<{s: Scene; si: number; st: number}> = ({s}) => {
  const th = (s.theme ?? "dark") as keyof typeof T;
  const t = T[th];
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {th === "dark" && <GlowBlob color={t.glowA} x="80%" y="10%" size={300} opacity={0.25} />}
      <FrameCounter color={t.accent} />
      <div style={{position: "absolute", top: "10%", left: 40, right: 40, zIndex: 5}}>
        {s.tag && <div style={{marginBottom: 16}}><TagPill label={s.tag} accent={t.accent} /></div>}
        {s.title && (
          <FadeUp>
            <div style={{fontFamily: t.font, fontWeight: 700, fontSize: 44, color: t.textDim, marginBottom: 24}}>{s.title}</div>
          </FadeUp>
        )}
        <FadeUp delay={4}>
          <div style={{display: "flex", fontSize: 28, color: t.textDim, fontWeight: 700, paddingBottom: 14, borderBottom: `2px solid ${t.cardBorder}`, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: t.font}}>
            <div style={{flex: 2}}>Barang</div>
            <div style={{flex: 1, textAlign: "right"}}>Catatan</div>
            <div style={{flex: 1, textAlign: "right"}}>Fisik</div>
          </div>
        </FadeUp>
        {(s.rows ?? []).map((r, i) => {
          const diff = r.book !== r.shelf;
          return (
            <FadeUp key={i} delay={8 + i * 8}>
              <div style={{
                display: "flex", padding: "18px 0",
                borderBottom: `1px solid ${t.cardBorder}`,
                fontFamily: t.fontBody, fontSize: 38,
                background: diff ? `${t.accent}11` : "transparent",
                paddingInline: diff ? 12 : 0,
                borderRadius: diff ? 8 : 0,
              }}>
                <div style={{flex: 2, color: t.text}}>{r.item}</div>
                <div style={{flex: 1, textAlign: "right", color: diff ? t.accent : t.text, fontWeight: diff ? 700 : 400}}>{r.book}</div>
                <div style={{flex: 1, textAlign: "right", color: diff ? "#E84B3A" : t.text, fontWeight: diff ? 700 : 400}}>{r.shelf}</div>
              </div>
            </FadeUp>
          );
        })}
      </div>
      {s.vo && <BottomSub text={s.vo.split(".")[0] + "."} accent={t.accent} />}
    </AbsoluteFill>
  );
};

const SceneCta: React.FC<{s: Scene; si: number; st: number}> = ({s}) => {
  const th = (s.theme ?? "dark") as keyof typeof T;
  const t = T[th];
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {th === "dark" && <>
        <GlowBlob color={t.glowA} x="30%" y="40%" size={500} opacity={0.22} />
        <GlowBlob color={t.glowB} x="70%" y="70%" size={350} opacity={0.18} />
      </>}
      {th === "cream" && (
        <div style={{position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${t.glowB}50 0%, transparent 65%), ${t.bg}`}} />
      )}
      <FrameCounter color={t.accent} />
      <div style={{
        position: "absolute", inset: 0, zIndex: 5,
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "flex-start",
        padding: "0 48px",
      }}>
        {s.tag && <div style={{marginBottom: 28}}><TagPill label={s.tag} accent={t.accent} delay={0} /></div>}
        <FadeUp delay={6}>
          <div style={{fontFamily: t.font, fontWeight: 900, fontSize: 100, color: t.text, lineHeight: 1.05, letterSpacing: "-0.02em"}}>
            {s.text}
          </div>
        </FadeUp>
        {s.sub && (
          <FadeUp delay={16} style={{marginTop: 24}}>
            <div style={{fontFamily: t.fontBody, fontSize: 46, color: t.textDim, lineHeight: 1.45, maxWidth: 560}}>
              {s.sub}
            </div>
          </FadeUp>
        )}
        <FadeUp delay={24} style={{marginTop: 40}}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "20px 36px",
            background: t.accent, borderRadius: 60,
            fontFamily: t.font, fontWeight: 700, fontSize: 40, color: "#fff",
            boxShadow: `0 8px 32px ${t.accent}55`,
          }}>
            💬 Tulis di komentar
          </div>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene dispatcher ───────────────────────────────────────────────────────────
const RENDERERS: Record<string, React.FC<{s: Scene; si: number; st: number}>> = {
  hook:    SceneHook,
  chat:    SceneChat,
  stat:    SceneStat,
  step:    SceneStep,
  compare: SceneCompare,
  ledger:  SceneLedger,
  cta:     SceneCta,
};

// ── Root composition ───────────────────────────────────────────────────────────
export const ReelComp: React.FC<{reel: Reel}> = ({reel}) => {
  const {fps} = useVideoConfig();
  let offset = 0;

  const totalFrames = reel.scenes.reduce((a, s) => a + Math.round(s.seconds * fps), 0);

  return (
    <AbsoluteFill>
      {reel.bgm && <Bgm src={reel.bgm} totalFrames={totalFrames} />}

      {reel.scenes.map((s, i) => {
        const dur = Math.round(s.seconds * fps);
        const from = offset;
        offset += dur;
        const Renderer = RENDERERS[s.kind] ?? SceneHook;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Renderer s={s} si={i} st={reel.scenes.length} />
            {s.audio && <Audio src={staticFile(s.audio)} volume={1} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
