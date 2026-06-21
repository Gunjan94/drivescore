// Design tokens + light/dark theming.
//
// Single source of truth = PALETTES below. applyTheme() writes them onto the
// document as CSS variables (consumed by Tailwind utilities + index.css) AND
// updates the live `theme` object (consumed by inline styles via getters), so
// both styling paths stay in sync from one place. Toggling theme + a React
// re-render is all it takes for the whole app to repaint.

export type Mode = "light" | "dark";

// 11 base colors per mode. Light is a clean, C-suite white surface; dark is the
// original deep-slate canvas.
const PALETTES: Record<Mode, Record<string, string>> = {
  dark: {
    ink: "#0B1220",
    panel: "#131C2E",
    panel2: "#1B2740",
    line: "#2A3850",
    text: "#E8EEFB",
    muted: "#8597B4",
    accent: "#2DD4BF",
    accent2: "#5EEAD4",
    good: "#34D399",
    warn: "#FBBF24",
    bad: "#F87171",
  },
  light: {
    ink: "#F3F6FC", // page canvas
    panel: "#FFFFFF", // card surface
    panel2: "#EEF3FB", // secondary surface
    line: "#D7E0EF", // borders
    text: "#0E1A30", // primary text (navy)
    muted: "#5B6B87", // secondary text
    accent: "#0D9488", // teal, darkened for contrast on white
    accent2: "#0F766E",
    good: "#059669",
    warn: "#B45309",
    bad: "#DC2626",
  },
};

// DriveScore band -> color, per mode.
const BANDS: Record<Mode, Record<string, string>> = {
  dark: { safe: "#34D399", moderate: "#FBBF24", "high-risk": "#F87171" },
  light: { safe: "#059669", moderate: "#B45309", "high-risk": "#DC2626" },
};

// Mode-specific extras that aren't part of the base palette (gradients, header
// blur, slider thumb, card shadow). Written as CSS vars too.
const EXTRAS: Record<Mode, Record<string, string>> = {
  dark: {
    "--bg-from": "#16233B",
    "--bg-to": "#0B1220",
    "--header-bg": "rgba(11,18,32,0.8)",
    "--thumb": "#E8EEFB",
    "--card-shadow": "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 28px rgba(0,0,0,0.35)",
  },
  light: {
    "--bg-from": "#FFFFFF",
    "--bg-to": "#E9F0FA",
    "--header-bg": "rgba(255,255,255,0.85)",
    "--thumb": "#FFFFFF",
    "--card-shadow": "0 1px 2px rgba(16,24,48,0.05), 0 10px 24px rgba(16,24,48,0.08)",
  },
};

const STORAGE_KEY = "ds-theme";
const DEFAULT_MODE: Mode = "light"; // brief: default to light

let _mode: Mode = readInitial();

function readInitial(): Mode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODE;
}

/** "#0B1220" -> "11 18 32" (space-separated channels for Tailwind alpha). */
function toRgbChannels(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Write the active palette onto <html> as CSS vars + data-theme attribute. */
export function applyTheme(mode: Mode): void {
  _mode = mode;
  const root = document.documentElement;
  const p = PALETTES[mode];
  for (const k in p) {
    root.style.setProperty(`--${k}`, p[k]); // hex — index.css + convenience
    root.style.setProperty(`--${k}-rgb`, toRgbChannels(p[k])); // channels — Tailwind
  }
  const ex = EXTRAS[mode];
  for (const k in ex) root.style.setProperty(k, ex[k]);
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export const getMode = (): Mode => _mode;
export const toggleMode = (): Mode => {
  const next: Mode = _mode === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
};

// Live token object. color/band are Proxies that read the CURRENT palette, so
// inline styles repaint on the next React render after a toggle.
export const theme = {
  color: new Proxy({} as Record<string, string>, {
    get: (_t, key: string) => PALETTES[_mode][key],
  }),
  band: new Proxy({} as Record<string, string>, {
    get: (_t, key: string) => BANDS[_mode][key],
  }),
  touch: { minTarget: 44, sliderThumb: 32 },
};

export function bandColor(band: string): string {
  return theme.band[band] ?? theme.color.muted;
}

export function scoreColor(score: number): string {
  if (score >= 80) return theme.color.good;
  if (score >= 60) return theme.color.warn;
  return theme.color.bad;
}

// Apply the initial theme immediately on module load so utilities/CSS vars are
// populated before first paint.
applyTheme(_mode);
