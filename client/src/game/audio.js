let ctx;
const ac = () => { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
function tone(f, t0, d, type = 'sine', v = 0.15, slideTo) {
  try {
    const a = ac(), t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
  } catch { /* audio unavailable */ }
}
export const pick = () => tone(520, 0, 0.08, 'triangle', 0.12, 800);
export const place = () => { tone(320, 0, 0.14, 'sine', 0.22, 110); tone(900, 0, 0.04, 'square', 0.04); };
export const nope = () => tone(170, 0, 0.16, 'sawtooth', 0.07, 90);
export const tick = () => tone(660, 0, 0.1, 'square', 0.06);
export const go = () => { tone(880, 0, 0.25, 'square', 0.08); tone(1320, 0.05, 0.3, 'triangle', 0.1); };
const SCALE = [0, 2, 4, 7, 9, 12, 14];
export const chime = (lv = 0) => {
  const n = Math.min(3 + lv, 7);
  for (let i = 0; i < n; i++) tone(523 * 2 ** ((SCALE[i] + lv) / 12), i * 0.065, 0.3, 'triangle', 0.14);
};
export const win = () => {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((f, i) => tone(f, i * 0.11, 0.4, 'triangle', 0.18));
  setTimeout(() => {
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.08, 0.6, 'sine', 0.2));
  }, 700);
};
export const lose = () => [440, 392, 349, 262].forEach((f, i) => tone(f, i * 0.22, 0.5, 'sawtooth', 0.09));
export const taunt = () => {
  tone(587, 0, 0.07, 'sine', 0.15, 880);
  tone(880, 0.07, 0.14, 'triangle', 0.15, 1174);
};
