export type SceneKind = "hook" | "chat" | "stat" | "step" | "compare" | "ledger" | "cta";

export interface Scene {
  kind:     SceneKind;
  vo:       string;       // teks VO — wajib
  audio:    string;       // path audio VO di public/
  seconds:  number;       // durasi scene
  theme?:   "dark" | "cream";   // default "dark"

  // universal
  tag?:     string;       // pill tag di atas (e.g. "KUNCINYA")
  title?:   string;

  // hook
  lines?:        string[];
  accent?:       number;       // index baris yang pakai accent color
  highlightWord?: string;      // kata yang diberi outline box

  // chat
  bubbles?:  string[];
  counter?:  {label: string; value: number};

  // stat
  value?:  string;
  unit?:   string;

  // step (Ref 5 style — numbered step)
  stepNum?:   number;
  stepLabel?: string;
  browser?:   {url?: string; content: string};  // browser mockup di dalam step

  // compare (Ref 6 style — 2 dark cards)
  compare?: {
    left:  {icon?: string; label: string; sub?: string; crossed?: boolean; color?: string};
    right: {icon?: string; label: string; sub?: string; color?: string};
  };

  // ledger
  rows?:  {item: string; book: number; shelf: number}[];

  // cta
  text?:  string;
  sub?:   string;

  // internal — diset oleh renderer
  si?:    number;
}

export interface Reel {
  id:     string;
  file:   string;
  bgm?:   string;   // path BGM di public/
  scenes: Scene[];
}
