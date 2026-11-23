import { useState } from 'react';

const KEY = 'couple-hub-settings-v1';

// Preset gradasi ala Discord Nitro (Dark & Light/Pastel)
export const NITRO_PRESETS = [
  // Dark Nitro Gradients
  { id: 'midnight-chroma', name: 'Midnight Chroma', from: '#1a102f', to: '#0b2236', angle: 135, dark: true },
  { id: 'retro-storm', name: 'Retro Storm', from: '#231347', to: '#102742', angle: 135, dark: true },
  { id: 'neon-nights', name: 'Neon Nights', from: '#130924', to: '#3f1042', angle: 135, dark: true },
  { id: 'crimson-moon', name: 'Crimson Moon', from: '#351224', to: '#161329', angle: 135, dark: true },
  { id: 'under-the-sea', name: 'Under the Sea', from: '#081c28', to: '#0d3644', angle: 135, dark: true },
  { id: 'dark-sakura', name: 'Dark Sakura', from: '#281220', to: '#3e172e', angle: 135, dark: true },
  { id: 'emerald-abyss', name: 'Emerald Abyss', from: '#0b1d16', to: '#123023', angle: 135, dark: true },
  { id: 'onyx-nocturne', name: 'Onyx Nocturne', from: '#121217', to: '#1e1e28', angle: 135, dark: true },

  // Light / Pastel Gradients
  { id: 'sunset-peach', name: 'Sunset Peach', from: '#fff1e6', to: '#fedcd2', angle: 135, dark: false },
  { id: 'sakura-blossom', name: 'Sakura Blossom', from: '#fff0f5', to: '#fce4ec', angle: 135, dark: false },
  { id: 'lilac-dream', name: 'Lilac Dream', from: '#ece6ff', to: '#fcdcf4', angle: 135, dark: false },
  { id: 'fresh-mint', name: 'Fresh Mint', from: '#e7f9f1', to: '#d6f4ea', angle: 135, dark: false },
  { id: 'warm-cream', name: 'Warm Cream', from: '#fff8ee', to: '#ffe9d6', angle: 135, dark: false },
  { id: 'sky-blush', name: 'Sky & Blush', from: '#e8f0fe', to: '#fde8ef', angle: 135, dark: false },
];

export const SOLID_PRESETS = ['#fff3ea', '#ffe6ea', '#ece6ff', '#e4f3ec', '#fff6d6', '#ffffff', '#2b1f27', '#1c2340'];
export const PRESETS = SOLID_PRESETS;

export const DEFAULTS = {
  bg: '#fff1e6',
  bg2: '#fedcd2',
  angle: 135,
  presetId: 'sunset-peach',
  textMode: 'auto'
};

export const DARK_DEFAULT = {
  bg: '#1a102f',
  bg2: '#0b2236',
  angle: 135,
  presetId: 'midnight-chroma',
  textMode: 'auto'
};

export const normalizeHex = (v) => {
  let s = String(v || '').trim().replace(/^#?/, '#').toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + [...s.slice(1)].map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(s) ? s : null;
};

const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
const css = (c, a = 1) => (a === 1 ? `rgb(${c})` : `rgba(${c},${a})`);
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const WHITE = [255, 255, 255], BLACK = [0, 0, 0], PLUM = [74, 51, 64];

// Menghitung variabel CSS dari warna / gradasi latar
export function deriveTheme(s = {}) {
  const color1 = normalizeHex(s.bg) || DEFAULTS.bg;
  const isGradient = Boolean(s.bg2 && normalizeHex(s.bg2) && normalizeHex(s.bg2) !== color1);
  const color2 = isGradient ? normalizeHex(s.bg2) : color1;
  const angle = s.angle ?? 135;

  const B1 = toRgb(color1);
  const B2 = toRgb(color2);
  const Bmid = mix(B1, B2, 0.5);

  const stops = isGradient ? [B1, Bmid, B2] : [mix(B1, WHITE, 0.35), B1];
  const minRatio = (fg) => Math.min(...stops.map((st) => contrast(fg, st)));
  const best = () => [WHITE, PLUM, BLACK].reduce((m, c) => (minRatio(c) > minRatio(m) ? c : m), WHITE);

  let fg = best();
  if (s.textMode === 'light') fg = WHITE;
  if (s.textMode === 'dark') fg = PLUM;
  const dark = lum(fg) > 0.5;

  const bgCss = isGradient
    ? `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`
    : `linear-gradient(180deg, ${css(stops[0])} 0%, ${css(B1)} 100%)`;

  const solidB = isGradient ? Bmid : B1;

  return {
    ratio: minRatio(fg),
    dark,
    vars: {
      '--bg': bgCss,
      '--bg-solid': css(solidB),
      '--fg': css(fg),
      '--chip': css(fg, 0.1),
      '--border': css(fg, 0.14),
      '--panel': dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.72)',
      '--surface': css(dark ? mix(solidB, WHITE, 0.12) : mix(solidB, WHITE, 0.7)),
      '--board': css(mix(PLUM, solidB, 0.1)),
      '--accent': '#dd5870',
      '--accent2': '#7c6fd0',
      '--accent-soft': 'rgba(221,88,112,.16)',
      '--accent2-soft': 'rgba(124,111,208,.18)',
    },
  };
}

export function useSettings() {
  const [s, setS] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY));
      if (!stored) return DEFAULTS;
      // Bila sebelumnya mode gelap warna flat #2b1f27, upgrade mulus ke dark nitro gradient
      if (stored.bg === '#2b1f27' && !stored.bg2) {
        return { ...DARK_DEFAULT, ...stored, bg2: DARK_DEFAULT.bg2, angle: 135 };
      }
      return { ...DEFAULTS, ...stored };
    } catch {
      return DEFAULTS;
    }
  });

  const update = (p) => setS((prev) => {
    const n = { ...prev, ...p };
    try {
      localStorage.setItem(KEY, JSON.stringify(n));
    } catch { /* ignore */ }
    return n;
  });

  return [s, update, () => update(DEFAULTS)];
}
