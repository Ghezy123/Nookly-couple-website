export const N = 8;
export const COLORS = ['#ff7a8a', '#ffb98a', '#ffd978', '#b9a5fb', '#b7a8ad']; // 4 warna balok + 1 blok batu (id 5)
export const emptyGrid = () => Array.from({ length: N }, () => Array(N).fill(0));

export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const parse = (rows) => rows.map((s) => [...s].map((ch) => (ch === '#' ? 1 : 0)));
const rot = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse());
const key = (m) => m.map((r) => r.join('')).join('/');

const BASES = [
  ['#'], ['##'], ['###'], ['####'], ['#####'],         // 1x1 + garis 1x2..1x5 (+ vertikal)
  ['##', '##'], ['###', '###', '###'], ['###', '###'], // 2x2, 3x3, 2x3/3x2
  ['#.', '##'], ['#..', '#..', '###'],                // L kecil & besar (4 rotasi)
  ['###', '.#.'],                                     // T (4 rotasi)
  ['##.', '.##'], ['.##', '##.'],                      // Z / S
  ['#.', '.#'], ['#..', '.#.', '..#'],                // diagonal 2x2 / 3x3
];
export const SHAPES = [];
const seen = new Set();
BASES.forEach((rows, bi) => {
  let m = parse(rows);
  for (let k = 0; k < 4; k++) {
    const id = key(m);
    if (!seen.has(id)) { seen.add(id); SHAPES.push({ id, m, h: m.length, w: m[0].length, cells: m.flat().reduce((a, b) => a + b, 0), color: (bi % 4) + 1 }); }
    m = rot(m);
  }
});

export const fits = (g, s, r, c) =>
  s.m.every((row, i) => row.every((v, j) => !v || (r + i >= 0 && r + i < N && c + j >= 0 && c + j < N && !g[r + i][c + j])));
export const canFit = (g, s) => { for (let r = 0; r <= N - s.h; r++) for (let c = 0; c <= N - s.w; c++) if (fits(g, s, r, c)) return true; return false; };
export const canFitAny = (g, hand) => hand.some((s) => s && canFit(g, s));

// Fair RNG: deterministik dari seed; diulang (deterministik) sampai minimal 1 balok muat di papan.
export function genHand(grid, rng) {
  let hand;
  for (let t = 0; t < 40; t++) {
    hand = [0, 1, 2].map(() => SHAPES[(rng() * SHAPES.length) | 0]);
    if (hand.some((s) => canFit(grid, s))) break;
  }
  return hand;
}

function stamp(g, s, r, c) {
  const ng = g.map((row) => [...row]);
  s.m.forEach((row, i) => row.forEach((v, j) => { if (v) ng[r + i][c + j] = s.color; }));
  return ng;
}
function fullLines(g) {
  const rows = [], cols = [];
  for (let i = 0; i < N; i++) {
    if (g[i].every(Boolean)) rows.push(i);
    if (g.every((row) => row[i])) cols.push(i);
  }
  return { rows, cols };
}
export const linesFor = (g, s, r, c) => fullLines(stamp(g, s, r, c));

export function applyMove(g, s, r, c) {
  const ng = stamp(g, s, r, c);
  const { rows, cols } = fullLines(ng);
  const cleared = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
    if (ng[i][j] && (rows.includes(i) || cols.includes(j))) cleared.push({ r: i, c: j, v: ng[i][j] });
  cleared.forEach(({ r: i, c: j }) => (ng[i][j] = 0));
  return { grid: ng, lines: rows.length + cols.length, cleared };
}

// 10/kotak + bonus eksponensial garis + bonus combo. Streak putus setelah 3 penempatan tanpa clear.
export function scoreMove(cells, lines, streak, miss) {
  let gain = cells * 10;
  if (lines > 0) {
    streak += 1; miss = 0;
    gain += 100 * (2 ** lines - 1);
    if (streak >= 2) gain += 100 * (streak - 1);
  } else if (++miss >= 3) streak = 0;
  const lineLv = lines >= 4 ? 3 : lines === 3 ? 2 : lines === 2 ? 1 : 0;
  const level = lines > 0 ? Math.max(lineLv, streak >= 2 ? streak - 1 : 0) : 0;
  return { gain, streak, miss, level };
}

export function addJunk(grid, n) {
  const ng = grid.map((r) => [...r]);
  const empty = [];
  ng.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  for (let k = 0; k < n && empty.length; k++) { const [r, c] = empty.splice((Math.random() * empty.length) | 0, 1)[0]; ng[r][c] = 5; }
  return ng;
}
