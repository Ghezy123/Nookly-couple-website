import type {
  ScrapbookElement,
  PageBackground,
  ScrapbookPage,
  ScrapbookMeta,
  PhotoElement,
  LetterElement,
  TextElement,
  StickerElement,
  VoiceElement,
  LinkElement,
} from './scrapbookTypes';

export const PW = 600;
export const PH = 800;

export const FONTS: Record<string, { label: string; css: string }> = {
  sans: { label: 'Sans-Serif', css: '"Plus Jakarta Sans", sans-serif' },
  hand: { label: 'Tulisan Tangan', css: 'Caveat, cursive' },
  script: { label: 'Kaligrafi', css: 'Pacifico, cursive' },
  serif: { label: 'Serif Elegan', css: '"Playfair Display", serif' },
};

export const THEMES: Record<string, { label: string; bg: string; ink: string; accent: string }> = {
  rose: { label: 'Rose Gold', bg: '#ffeef1', ink: '#4f2b33', accent: '#d9657b' },
  sage: { label: 'Sage Mint', bg: '#eef6f0', ink: '#263b2c', accent: '#5c966c' },
  lilac: { label: 'Lilac Dream', bg: '#f4eeff', ink: '#342647', accent: '#8b6ac7' },
  sky: { label: 'Sky Blue', bg: '#eef6fc', ink: '#22384a', accent: '#4e92c9' },
  butter: { label: 'Warm Butter', bg: '#fff9e6', ink: '#45351a', accent: '#cca23d' },
  cream: { label: 'Classic Cream', bg: '#fbf4ea', ink: '#3d3028', accent: '#b57954' },
};

export const BUILTIN_STICKERS = [
  { id: 'heart', label: 'Hati', color: '#ff6b8b' },
  { id: 'star', label: 'Bintang', color: '#ffd24c' },
  { id: 'sparkle', label: 'Kilau', color: '#ffbe53' },
  { id: 'flower', label: 'Bunga', color: '#ff8fab' },
  { id: 'washi', label: 'Washi Tape', color: '#f4a6b8' },
  { id: 'pushpin', label: 'Pin Kertas', color: '#ea4335' },
  { id: 'ribbon', label: 'Pita', color: '#f07897' },
  { id: 'cloud', label: 'Awan', color: '#c4e0f9' },
  { id: 'moon', label: 'Bulan Sabit', color: '#ffd875' },
];

export const PATTERNS = [
  { v: 'none', l: 'Polos' },
  { v: 'paper', l: 'Kertas Antik' },
  { v: 'polka', l: 'Polka Dots' },
  { v: 'grid', l: 'Kotak-kotak' },
  { v: 'lined', l: 'Garis Buku' },
];

export const PAGE_FRAMES = [
  { v: 'none', l: 'Tanpa Bingkai' },
  { v: 'lace', l: 'Renda Manis' },
  { v: 'stitch', l: 'Jahitan Benang' },
];

export const FRAME_STYLES = [
  { v: 'polaroid', l: 'Polaroid Klasik' },
  { v: 'scalloped', l: 'Renda Bergelombang' },
  { v: 'soft', l: 'Sudut Lembut' },
  { v: 'clean', l: 'Minimalis Bersih' },
];

/* --- Image Cache --- */
const imgCache = new Map<string, HTMLImageElement>();

export function getImage(src?: string | null): HTMLImageElement | null {
  if (!src) return null;
  let img = imgCache.get(src);
  if (img && img.complete && img.naturalWidth > 0) return img;
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    imgCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/* --- Math & String Utilities --- */
export function seededRandom(seed: string | number) {
  let s = String(seed);
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function scallopPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  step = 10
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < w; i += step) ctx.quadraticCurveTo(x + i + step / 2, y - 4, x + i + step, y);
  for (let i = 0; i < h; i += step) ctx.quadraticCurveTo(x + w + 4, y + i + step / 2, x + w, y + i + step);
  for (let i = w; i > 0; i -= step) ctx.quadraticCurveTo(x + i - step / 2, y + h + 4, x + i - step, y + h);
  for (let i = h; i > 0; i -= step) ctx.quadraticCurveTo(x - 4, y + i - step / 2, x, y + i - step);
  ctx.closePath();
}

export function fitText(ctx: CanvasRenderingContext2D, s: string, maxW: number): string {
  if (!s || ctx.measureText(s).width <= maxW) return s || '';
  let l = 0,
    r = s.length,
    ans = '';
  while (l <= r) {
    const m = (l + r) >> 1;
    const sub = s.slice(0, m) + '…';
    if (ctx.measureText(sub).width <= maxW) {
      ans = sub;
      l = m + 1;
    } else {
      r = m - 1;
    }
  }
  return ans;
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) {
        cur = test;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur || !words.length) lines.push(cur);
  }
  return lines;
}

function drawImgCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const iw = img.naturalWidth || 1,
    ih = img.naturalHeight || 1;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s,
    sh = h / s;
  const sx = (iw - sw) / 2,
    sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawImgContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const iw = img.naturalWidth || 1,
    ih = img.naturalHeight || 1;
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s,
    dh = ih * s;
  const dx = x + (w - dw) / 2,
    dy = y + (h - dh) / 2;
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
}

/* --- Builtin Vector Stickers --- */
export function drawBuiltinSticker(
  ctx: CanvasRenderingContext2D,
  name: string,
  w: number,
  h: number,
  color = '#ff6b8b'
) {
  ctx.save();
  ctx.scale(w / 100, h / 100);
  ctx.translate(-50, -50);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const dark = 'rgba(0,0,0,.18)';

  switch (name) {
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 21 : 46;
        const a = ((-90 + i * 36) * Math.PI) / 180;
        ctx.lineTo(50 + r * Math.cos(a), 52 + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath();
      ctx.ellipse(42, 36, 8, 4, -0.6, 0, 7);
      ctx.fill();
      break;
    }
    case 'heart': {
      ctx.beginPath();
      ctx.moveTo(50, 88);
      ctx.bezierCurveTo(8, 58, 4, 26, 26, 14);
      ctx.bezierCurveTo(38, 8, 48, 16, 50, 26);
      ctx.bezierCurveTo(52, 16, 62, 8, 74, 14);
      ctx.bezierCurveTo(96, 26, 92, 58, 50, 88);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.beginPath();
      ctx.ellipse(31, 29, 7, 4, -0.7, 0, 7);
      ctx.fill();
      break;
    }
    case 'sparkle': {
      const sp = (cx: number, cy: number, s: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.beginPath();
        ctx.moveTo(0, -46);
        ctx.quadraticCurveTo(6, -6, 46, 0);
        ctx.quadraticCurveTo(6, 6, 0, 46);
        ctx.quadraticCurveTo(-6, 6, -46, 0);
        ctx.quadraticCurveTo(-6, -6, 0, -46);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.5 / s;
        ctx.stroke();
        ctx.restore();
      };
      sp(46, 54, 1);
      sp(80, 20, 0.38);
      sp(20, 82, 0.3);
      break;
    }
    case 'flower': {
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.translate(50, 50);
        ctx.rotate((i * Math.PI) / 3);
        ctx.beginPath();
        ctx.ellipse(0, -24, 13, 22, 0, 0, 7);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#f8d56b';
      ctx.beginPath();
      ctx.arc(50, 50, 13, 0, 7);
      ctx.fill();
      break;
    }
    case 'washi': {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i < 100; i += 10) ctx.lineTo(i % 20 === 0 ? 0 : 5, i);
      ctx.lineTo(0, 100);
      ctx.lineTo(100, 100);
      for (let i = 100; i > 0; i -= 10) ctx.lineTo(i % 20 === 0 ? 100 : 95, i);
      ctx.lineTo(100, 0);
      ctx.closePath();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.clip();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 7;
      for (let i = -100; i < 200; i += 22) {
        ctx.beginPath();
        ctx.moveTo(i, 100);
        ctx.lineTo(i + 100, 0);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'pushpin': {
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(58, 92, 16, 4, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = '#8a8a8a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(50, 60);
      ctx.lineTo(50, 94);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      rr(ctx, 34, 46, 32, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(50, 32, 24, 0, 7);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'ribbon': {
      ctx.fillStyle = color;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(46, 54);
      ctx.lineTo(30, 94);
      ctx.lineTo(42, 86);
      ctx.lineTo(52, 96);
      ctx.lineTo(54, 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(54, 54);
      ctx.lineTo(70, 94);
      ctx.lineTo(58, 86);
      ctx.lineTo(48, 96);
      ctx.lineTo(46, 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(50, 51, 14, 0, 7);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'moon': {
      ctx.beginPath();
      ctx.arc(50, 50, 42, 0, Math.PI * 2);
      ctx.arc(66, 40, 35, 0, Math.PI * 2, true);
      ctx.fillStyle = color;
      ctx.fill('evenodd');
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case 'cloud': {
      ctx.beginPath();
      ctx.arc(32, 58, 20, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(48, 40, 22, Math.PI, Math.PI * 1.9);
      ctx.arc(72, 52, 18, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,150,190,.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    default:
      ctx.fillStyle = color;
      ctx.fillRect(20, 20, 60, 60);
  }
  ctx.restore();
}

/* --- Element Drawing Functions --- */
function drawPhoto(ctx: CanvasRenderingContext2D, el: PhotoElement, blobs: Record<string, string>) {
  const w = el.w,
    h = el.h,
    x = -w / 2,
    y = -h / 2;
  const imgs = el.photos || [];
  const primarySrc = blobs[imgs[0]] || imgs[0];
  const im = getImage(primarySrc);
  const hasCap = !!(el.caption || el.date);

  if (imgs.length > 1) {
    ctx.save();
    ctx.rotate(0.07);
    ctx.shadowColor = 'rgba(60,40,30,.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fffdf8';
    rr(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.restore();
  }

  let box = { x: x + 9, y: y + 9, w: w - 18, h: h - 18 };
  let cap: { x: number; y: number; w: number; h: number } | null = null;
  let radius = 2;
  let textColor = '#5a4038';

  ctx.save();
  ctx.shadowColor = 'rgba(60,40,30,.28)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  switch (el.frame) {
    case 'polaroid': {
      ctx.fillStyle = '#fffdf8';
      rr(ctx, x, y, w, h, 3);
      ctx.fill();
      const p = w * 0.06;
      const ch = h * 0.19;
      box = { x: x + p, y: y + p, w: w - 2 * p, h: h - p - ch - p * 0.6 };
      cap = { x: x + p, y: box.y + box.h, w: w - 2 * p, h: ch + p * 0.6 };
      break;
    }
    case 'scalloped': {
      ctx.fillStyle = '#fff1f4';
      scallopPath(ctx, x + 7, y + 7, w - 14, h - 14, 9);
      ctx.fill();
      const p = w * 0.09;
      const ch = hasCap ? h * 0.14 : 0;
      box = { x: x + p, y: y + p, w: w - 2 * p, h: h - 2 * p - ch };
      cap = hasCap ? { x: x + p, y: box.y + box.h, w: box.w, h: ch } : null;
      radius = 6;
      break;
    }
    case 'soft': {
      ctx.fillStyle = '#fff';
      rr(ctx, x, y, w, h, 16);
      ctx.fill();
      box = { x, y, w, h };
      radius = 16;
      if (hasCap) {
        cap = { x, y: y + h * 0.82, w, h: h * 0.18 };
        textColor = '#fff';
      }
      break;
    }
    default: {
      ctx.fillStyle = '#fff';
      rr(ctx, x, y, w, h, 3);
      ctx.fill();
      const p = 8;
      const ch = hasCap ? h * 0.13 : 0;
      box = { x: x + p, y: y + p, w: w - 2 * p, h: h - 2 * p - ch };
      cap = hasCap ? { x: x + p, y: box.y + box.h, w: box.w, h: ch } : null;
    }
  }
  ctx.restore();

  // Gambar isi foto
  ctx.save();
  rr(ctx, box.x, box.y, box.w, box.h, radius);
  ctx.clip();
  if (im) {
    drawImgCover(ctx, im, box.x, box.y, box.w, box.h);
  } else {
    const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    g.addColorStop(0, '#f6e4d0');
    g.addColorStop(1, '#eecbd6');
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(90,64,56,.6)';
    ctx.font = `600 ${Math.max(12, w * 0.06)}px ${FONTS.sans.css}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷 foto', box.x + box.w / 2, box.y + box.h / 2);
  }
  ctx.restore();

  // Caption & Tanggal
  if (cap) {
    const fs = Math.max(14, Math.min(30, h * 0.075));
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fs}px ${FONTS.hand.css}`;
    const cy = cap.y + cap.h / 2;
    const dateW = el.date ? Math.min(cap.w * 0.42, 120) : 0;
    if (el.date) {
      ctx.font = `500 ${Math.max(9, Math.min(13, fs * 0.55))}px ${FONTS.sans.css}`;
      ctx.globalAlpha = 0.75;
      ctx.textAlign = 'right';
      ctx.fillText(fitText(ctx, el.date, dateW), cap.x + cap.w - 4, cy);
      ctx.globalAlpha = 1;
      ctx.font = `700 ${fs}px ${FONTS.hand.css}`;
    }
    ctx.textAlign = 'left';
    ctx.fillText(fitText(ctx, el.caption || '', cap.w - dateW - 12), cap.x + 6, cy);
  }
}

function drawLetter(ctx: CanvasRenderingContext2D, el: LetterElement) {
  const w = el.w,
    h = el.h,
    x = -w / 2,
    y = -h / 2;
  const th = THEMES[el.theme || 'rose'] || THEMES.rose;

  ctx.save();
  ctx.shadowColor = 'rgba(60,40,30,.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = th.bg;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = th.accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  rr(ctx, x + 8, y + 8, w - 16, h - 16, 7);
  ctx.stroke();
  ctx.restore();

  const pad = 20,
    maxW = w - pad * 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const f1 = Math.max(14, Math.min(26, h * 0.11));
  ctx.font = `700 ${f1}px ${FONTS.hand.css}`;
  ctx.fillStyle = th.accent;
  ctx.fillText(fitText(ctx, el.label || 'A little letter for you', maxW), x + pad, y + pad + f1 * 0.8);

  const f2 = Math.max(15, Math.min(28, h * 0.12));
  ctx.font = `700 ${f2}px ${FONTS.serif.css}`;
  ctx.fillStyle = th.ink;
  ctx.fillText(fitText(ctx, el.title || '', maxW), x + pad, y + pad + f1 + f2 * 0.9);

  const bs = Math.max(11, Math.min(14, h * 0.065));
  ctx.font = `500 ${bs}px ${FONTS.sans.css}`;
  ctx.fillStyle = th.ink;
  ctx.globalAlpha = 0.65;
  const by = y + pad + f1 + f2 + 20;
  const lines = wrapLines(ctx, el.body || '', maxW - 20);
  const maxL = Math.max(1, Math.floor((y + h - 20 - by) / (bs * 1.4)));
  lines.slice(0, maxL).forEach((l, i) => {
    ctx.fillText(i === maxL - 1 && lines.length > maxL ? fitText(ctx, l + ' …', maxW - 20) : l, x + pad, by + i * bs * 1.4);
  });
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(x + w - 24, y + h - 24);
  drawBuiltinSticker(ctx, 'heart', 18, 18, th.accent);
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement) {
  const fs = el.size || 24;
  ctx.font = `${el.weight || '400'} ${fs}px ${(FONTS[el.font] || FONTS.sans).css}`;
  ctx.fillStyle = el.color || '#333';
  ctx.textBaseline = 'top';
  ctx.textAlign = el.align || 'center';
  const pad = 4;
  const lines = wrapLines(ctx, el.text, el.w - pad * 2);
  const tx = el.align === 'left' ? -el.w / 2 + pad : el.align === 'right' ? el.w / 2 - pad : 0;
  lines.forEach((l, i) => {
    const ly = -el.h / 2 + pad + i * fs * 1.25;
    if (ly < el.h / 2) ctx.fillText(l, tx, ly);
  });
}

function drawSticker(
  ctx: CanvasRenderingContext2D,
  el: StickerElement,
  assets: { id: string; blobId: string }[],
  blobs: Record<string, string>
) {
  ctx.save();
  ctx.shadowColor = 'rgba(60,40,30,.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;

  if (el.kind === 'asset') {
    const a = assets.find((s) => s.id === el.assetId);
    const im = a ? getImage(blobs[a.blobId] || a.blobId) : null;
    if (im) {
      drawImgContain(ctx, im, -el.w / 2, -el.h / 2, el.w, el.h);
    } else {
      ctx.strokeStyle = '#d9657b';
      ctx.strokeRect(-el.w / 2, -el.h / 2, el.w, el.h);
    }
  } else {
    drawBuiltinSticker(ctx, el.name || 'heart', el.w, el.h, el.color || '#ff6b8b');
  }
  ctx.restore();
}

function drawVoice(ctx: CanvasRenderingContext2D, el: VoiceElement) {
  const w = el.w,
    h = el.h,
    x = -w / 2,
    y = -h / 2;
  const th = THEMES[el.theme || 'cream'] || THEMES.cream;

  ctx.save();
  ctx.shadowColor = 'rgba(60,40,30,.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = th.bg;
  rr(ctx, x, y, w, h, h * 0.28);
  ctx.fill();
  ctx.restore();

  const r = h * 0.3;
  const cx = x + h * 0.5;
  const cy = 0;
  ctx.fillStyle = th.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 7);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.25, cy - r * 0.42);
  ctx.lineTo(cx + r * 0.45, cy);
  ctx.lineTo(cx - r * 0.25, cy + r * 0.42);
  ctx.closePath();
  ctx.fill();

  const lx = x + h * 0.5 + r + 14;
  const rw = x + w - 16 - lx;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `700 ${Math.max(12, Math.min(17, h * 0.16))}px ${FONTS.sans.css}`;
  ctx.fillText(fitText(ctx, '🎙 ' + (el.title || 'Voice note'), rw - 40), lx, y + h * 0.28);

  const rnd = seededRandom(el.id);
  const n = Math.max(10, Math.floor(rw / 8));
  for (let i = 0; i < n; i++) {
    const bh = h * (0.12 + 0.35 * rnd());
    ctx.fillStyle = th.accent;
    ctx.globalAlpha = 0.6;
    rr(ctx, lx + i * (rw / n), h * 0.14 - bh / 2 + 4, Math.max(2, rw / n - 3), bh, 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLink(ctx: CanvasRenderingContext2D, el: LinkElement, blobs: Record<string, string>) {
  const w = el.w,
    h = el.h,
    x = -w / 2,
    y = -h / 2;
  const th = THEMES[el.theme || 'sky'] || THEMES.sky;

  ctx.save();
  ctx.shadowColor = 'rgba(60,40,30,.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = th.bg;
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.restore();

  const ts = h - 24,
    tx = x + 12,
    ty = y + 12;
  ctx.save();
  rr(ctx, tx, ty, ts, ts, 10);
  ctx.clip();
  const im = getImage(el.thumbBlobId ? blobs[el.thumbBlobId] || el.thumbBlobId : null);
  if (im) {
    drawImgCover(ctx, im, tx, ty, ts, ts);
  } else {
    ctx.fillStyle = '#4285f4';
    ctx.fillRect(tx, ty, ts, ts);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${ts * 0.35}px ${FONTS.sans.css}`;
    ctx.fillText('🔗', tx + ts / 2, ty + ts / 2);
  }
  ctx.restore();

  const lx = tx + ts + 14;
  const rw = x + w - 14 - lx;
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `700 ${Math.max(12, Math.min(18, h * 0.16))}px ${FONTS.sans.css}`;
  ctx.fillText(fitText(ctx, el.title || 'Tautan', rw), lx, y + 30);

  ctx.font = `500 ${Math.max(10, Math.min(13, h * 0.11))}px ${FONTS.sans.css}`;
  ctx.globalAlpha = 0.7;
  wrapLines(ctx, el.subtitle || '', rw)
    .slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, lx, y + 50 + i * 15));
  ctx.globalAlpha = 1;
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  el: ScrapbookElement,
  assets: { id: string; blobId: string }[],
  blobs: Record<string, string>
) {
  ctx.save();
  ctx.translate(el.x, el.y);
  ctx.rotate((el.rotation * Math.PI) / 180);
  ctx.globalAlpha = el.opacity ?? 1;

  switch (el.type) {
    case 'photo':
      drawPhoto(ctx, el as PhotoElement, blobs);
      break;
    case 'letter':
      drawLetter(ctx, el as LetterElement);
      break;
    case 'text':
      drawText(ctx, el as TextElement);
      break;
    case 'sticker':
      drawSticker(ctx, el as StickerElement, assets, blobs);
      break;
    case 'voice':
      drawVoice(ctx, el as VoiceElement);
      break;
    case 'link':
      drawLink(ctx, el as LinkElement, blobs);
      break;
  }

  ctx.restore();
}

/* --- Background, Patterns & Frames --- */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: PageBackground,
  blobs: Record<string, string>
) {
  ctx.save();
  if (bg.type === 'gradient' && bg.color2) {
    let g: CanvasGradient;
    if (bg.gradient === 'vertical') {
      g = ctx.createLinearGradient(0, 0, 0, PH);
    } else if (bg.gradient === 'radial') {
      g = ctx.createRadialGradient(PW / 2, PH / 2, 60, PW / 2, PH / 2, PH * 0.7);
    } else {
      g = ctx.createLinearGradient(0, 0, PW, PH);
    }
    g.addColorStop(0, bg.color);
    g.addColorStop(1, bg.color2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW, PH);
  } else if (bg.type === 'image' && bg.imageId) {
    const im = getImage(blobs[bg.imageId] || bg.imageId);
    if (im) {
      drawImgCover(ctx, im, 0, 0, PW, PH);
      if (bg.imageDim > 0) {
        ctx.fillStyle = `rgba(255,255,255,${bg.imageDim})`;
        ctx.fillRect(0, 0, PW, PH);
      }
    } else {
      ctx.fillStyle = bg.color || '#fbf3e4';
      ctx.fillRect(0, 0, PW, PH);
    }
  } else {
    ctx.fillStyle = bg.color || '#fbf3e4';
    ctx.fillRect(0, 0, PW, PH);
  }

  // Pola
  if (bg.pattern === 'polka') {
    ctx.fillStyle = bg.patternColor;
    ctx.globalAlpha = 0.55;
    for (let r = 0, y = 22; y < PH + 22; y += 38, r++) {
      for (let x = (r % 2 ? 22 : 0); x < PW + 44; x += 44) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (bg.pattern === 'grid') {
    ctx.strokeStyle = bg.patternColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    for (let x = 0; x <= PW; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PH);
      ctx.stroke();
    }
    for (let y = 0; y <= PH; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PW, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (bg.pattern === 'lined') {
    ctx.strokeStyle = bg.patternColor;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.2;
    for (let y = 96; y < PH; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PW, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (bg.pattern === 'paper') {
    const rnd = seededRandom('paper-tex');
    ctx.fillStyle = '#7a5a3a';
    for (let i = 0; i < 700; i++) {
      ctx.globalAlpha = 0.03 + rnd() * 0.05;
      ctx.fillRect(rnd() * PW, rnd() * PH, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  // Bingkai
  if (bg.frame === 'lace') {
    const c = bg.frameColor || '#fff';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, PW, 12);
    ctx.fillRect(0, PH - 12, PW, 12);
    ctx.fillRect(0, 0, 12, PH);
    ctx.fillRect(PW - 12, 0, 12, PH);
    for (let x = 12; x < PW; x += 22) {
      ctx.beginPath();
      ctx.arc(x, 12, 8, 0, 7);
      ctx.arc(x, PH - 12, 8, 0, 7);
      ctx.fill();
    }
    for (let y = 12; y < PH; y += 22) {
      ctx.beginPath();
      ctx.arc(12, y, 8, 0, 7);
      ctx.arc(PW - 12, y, 8, 0, 7);
      ctx.fill();
    }
  } else if (bg.frame === 'stitch') {
    ctx.strokeStyle = bg.frameColor || '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    rr(ctx, 16, 16, PW - 32, PH - 32, 8);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawPageToCanvas(
  ctx: CanvasRenderingContext2D,
  page: ScrapbookPage,
  side: 'left' | 'right',
  assets: { id: string; blobId: string }[],
  blobs: Record<string, string>
) {
  drawBackground(ctx, page.background, blobs);
  for (const el of page.elements) {
    drawElement(ctx, el, assets, blobs);
  }
  // Gutter shadow di lipatan buku tengah
  const g = ctx.createLinearGradient(side === 'right' ? 0 : PW - 80, 0, side === 'right' ? 80 : PW, 0);
  g.addColorStop(side === 'right' ? 0 : 1, 'rgba(0,0,0,0.18)');
  g.addColorStop(side === 'right' ? 1 : 0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(side === 'right' ? 0 : PW - 80, 0, 80, PH);
}

export function drawCoverToCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  meta: ScrapbookMeta,
  front: boolean,
  blobs?: Record<string, string>
) {
  ctx.save();

  // Jika ada foto background cover, gambar dulu sebelum overlay warna
  const coverImgSrc = front && meta.coverImageBlobId && blobs
    ? (blobs[meta.coverImageBlobId] || meta.coverImageBlobId)
    : null;
  const coverImg = coverImgSrc ? getImage(coverImgSrc) : null;

  if (coverImg) {
    drawImgCover(ctx, coverImg, 0, 0, w, h);
    // Overlay warna semi-transparan agar teks tetap terbaca
    ctx.fillStyle = meta.coverColor;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = meta.coverColor;
    ctx.fillRect(0, 0, w, h);

    // Efek tekstur kain (hanya jika tidak ada foto)
    const rnd = seededRandom('cloth');
    ctx.lineWidth = 1;
    for (let i = 0; i < 400; i++) {
      const x = rnd() * w,
        y = rnd() * h;
      ctx.globalAlpha = 0.04 + rnd() * 0.04;
      ctx.strokeStyle = i % 2 ? '#000' : '#fff';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rnd() * 20 - 10, y + 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Garis emas tepi sampul
  ctx.strokeStyle = meta.accent;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 7]);
  rr(ctx, 42, 26, w - 68, h - 52, 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const cx = w / 2;
  if (front) {
    const pw = w * 0.68,
      ph = h * 0.34,
      px = cx - pw / 2,
      py = h * 0.22;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#fff7e8';
    rr(ctx, px, py, pw, ph, 16);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = meta.coverColor;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    rr(ctx, px + 8, py + 8, pw - 16, ph - 16, 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#5a3a3a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${w * 0.075}px ${FONTS.serif.css}`;

    const lines = wrapLines(ctx, meta.title || 'Scrapbook', pw - 40).slice(0, 3);
    const lh = w * 0.09;
    const y0 = py + ph * 0.42 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lh));

    ctx.fillStyle = meta.coverColor;
    ctx.font = `${w * 0.056}px ${FONTS.script.css}`;
    ctx.fillText(fitText(ctx, meta.subtitle || '', pw - 40), cx, py + ph * 0.82);

    ctx.save();
    ctx.translate(cx, py - 4);
    drawBuiltinSticker(ctx, 'heart', 30, 30, meta.accent);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, h * 0.78);
    drawBuiltinSticker(ctx, 'flower', 64, 64, meta.accent);
    ctx.restore();

    ctx.fillStyle = meta.accent;
    ctx.font = `600 ${w * 0.028}px ${FONTS.sans.css}`;
    ctx.fillText('· ALBUM KENANGAN KITA ·', cx, h * 0.9);
  } else {
    ctx.save();
    ctx.translate(cx, h / 2);
    drawBuiltinSticker(ctx, 'heart', 80, 80, meta.accent);
    ctx.restore();
  }
  ctx.restore();
}

export function drawEndpaperToCanvas(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  ctx.fillStyle = '#f6e9d7';
  ctx.fillRect(0, 0, PW, PH);
  const rnd = seededRandom('endpaper');
  for (let i = 0; i < 50; i++) {
    const x = rnd() * PW,
      y = rnd() * PH,
      s = 8 + rnd() * 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * 6);
    ctx.globalAlpha = 0.55;
    drawBuiltinSticker(
      ctx,
      rnd() > 0.5 ? 'flower' : 'sparkle',
      s,
      s,
      ['#f2b5c4', '#f4d58a', '#b8d8c4', '#c9b8e8'][Math.floor(rnd() * 4)]
    );
    ctx.restore();
  }
  // Gutter
  const g = ctx.createLinearGradient(side === 'right' ? 0 : PW - 80, 0, side === 'right' ? 80 : PW, 0);
  g.addColorStop(side === 'right' ? 0 : 1, 'rgba(0,0,0,0.18)');
  g.addColorStop(side === 'right' ? 1 : 0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(side === 'right' ? 0 : PW - 80, 0, 80, PH);
}
