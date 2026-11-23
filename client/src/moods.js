export const MOODS = {
  happy: { label: 'Happy', color: '#dd5870' },
  chill: { label: 'Santai', color: '#dd5870' },
  love: { label: 'Kangen', color: '#dd5870' },
  sleepy: { label: 'Capek', color: '#dd5870' },
  sad: { label: 'Sedih', color: '#dd5870' },
  angry: { label: 'Kesel', color: '#dd5870' },
};
export const MOOD_ORDER = Object.keys(MOODS);
export const CATEGORIES = ['Curhat', 'Hari Ini', 'Lagi Kesel', 'Random', 'Appreciation'];
const NEEDY = ['sad', 'sleepy', 'angry'];
export const isNeedy = (m) => NEEDY.includes(m);

// Hubungan antar dua mood -> menentukan animasi di DuoMoodWidget
export function relation(me, partner) {
  if (me === partner) return { kind: 'same' };
  const a = isNeedy(me), b = isNeedy(partner);
  if (a && b) return { kind: 'together' };
  if (!a && !b) return { kind: 'sweet' };
  const giver = a ? 'partner' : 'me';
  const gm = a ? partner : me;
  return { kind: 'support', giver, gesture: gm === 'love' ? 'hug' : 'cheer' };
}
export const timeAgo = (ms) => {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};
