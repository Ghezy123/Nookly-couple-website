export const N = 8;
export const COLORS = ['#ff7a8a', '#ffb98a', '#ffd978', '#b9a5fb', '#b7a8ad']; // 4 warna balok + 1 blok batu (id 5)
export const emptyGrid = () => Array.from({ length: N }, () => Array(N).fill(0));

// Starter grid dengan beberapa balok acak berwarna agar tidak kosongan (ala Block Blast)
export function createStarterGrid(count = 6) {
  const g = emptyGrid();
  let placed = 0;
  const rowCount = Array(N).fill(0);
  const colCount = Array(N).fill(0);
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      cells.push([r, c]);
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (const [r, c] of cells) {
    if (placed >= count) break;
    // Maksimal 2 balok per baris/kolom agar papan tetap lega dan mudah disusun
    if (rowCount[r] < 2 && colCount[c] < 2) {
      g[r][c] = (Math.floor(Math.random() * 4) + 1);
      rowCount[r]++;
      colCount[c]++;
      placed++;
    }
  }
  return g;
}

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

// Cek apakah kumpulan balok memiliki setidaknya 1 rangkaian penempatan yang valid (solvable sequence)
// dengan memperhitungkan pemecahan baris/kolom (line clear) yang membuka ruang baru
export function isHandSolvable(grid, hand) {
  if (!hand || hand.length === 0) return true;
  if (hand.length === 1) return canFit(grid, hand[0]);

  for (let i = 0; i < hand.length; i++) {
    const s = hand[i];
    if (!canFit(grid, s)) continue;

    const rest = hand.filter((_, idx) => idx !== i);
    const clearingMoves = [];
    const regularMoves = [];

    for (let r = 0; r <= N - s.h; r++) {
      for (let c = 0; c <= N - s.w; c++) {
        if (fits(grid, s, r, c)) {
          const lines = linesFor(grid, s, r, c);
          if (lines.rows.length || lines.cols.length) {
            clearingMoves.push([r, c]);
          } else {
            regularMoves.push([r, c]);
          }
        }
      }
    }

    // Uji langkah: dahulukan langkah pemecah garis, lalu coba beberapa langkah biasa
    const movesToTest = clearingMoves.length > 0 ? clearingMoves : regularMoves.slice(0, 5);

    for (const [r, c] of movesToTest) {
      const nextGrid = applyMove(grid, s, r, c).grid;
      if (isHandSolvable(nextGrid, rest)) {
        return true;
      }
    }
  }
  return false;
}

// Balok berukuran kecil/sedang (<= 4 kotak)
const SMALL_SHAPES = SHAPES.filter((s) => s.cells <= 4);

// Cari balok yang langsung bisa meledakkan baris/kolom pada papan saat ini
function findClearingShapes(grid) {
  const helpful = [];
  for (const s of SHAPES) {
    for (let r = 0; r <= N - s.h; r++) {
      for (let c = 0; c <= N - s.w; c++) {
        if (fits(grid, s, r, c)) {
          const lines = linesFor(grid, s, r, c);
          if (lines.rows.length || lines.cols.length) {
            helpful.push(s);
            break;
          }
        }
      }
      if (helpful.includes(s)) break;
    }
  }
  return helpful;
}

// Generator Balok Pintar (Smart Solvable Generator ala Block Blast)
// Memastikan selalu ada jalur jalan keluar (solvable path),
// namun tidak membuat game terlalu mudah karena pemain tetap harus memikirkan urutan & penempatan terbaik.
export function genHand(grid, rng = Math.random) {
  // Hitung jumlah kotak terisi di papan
  let filled = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c]) filled++;
    }
  }
  const isCrowded = filled >= 28; // papan terisi > 43%

  // Tahap 1: Coba generate balok acak dan uji kelayakan (apakah ketiga-tiganya bisa ditaruh semua)
  for (let attempt = 0; attempt < 35; attempt++) {
    const pool = isCrowded && attempt > 6 ? SMALL_SHAPES : SHAPES;
    const candidate = [0, 1, 2].map(() => pool[(rng() * pool.length) | 0]);

    if (isHandSolvable(grid, candidate)) {
      return candidate;
    }
  }

  // Tahap 2: Jika papan sangat sesak / buntu, sertakan balok pembuka combo/pemecah garis
  const clearing = findClearingShapes(grid);
  const saviorPool = clearing.length > 0 ? clearing : SMALL_SHAPES;

  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = [
      saviorPool[(rng() * saviorPool.length) | 0],
      SMALL_SHAPES[(rng() * SMALL_SHAPES.length) | 0],
      SMALL_SHAPES[(rng() * SMALL_SHAPES.length) | 0],
    ];
    if (isHandSolvable(grid, candidate)) {
      return candidate;
    }
  }

  // Tahap 3: Fallback darurat (berikan balok kecil yang muat)
  const fittingSmall = SMALL_SHAPES.filter((s) => canFit(grid, s));
  if (fittingSmall.length > 0) {
    return [0, 1, 2].map(() => fittingSmall[(rng() * fittingSmall.length) | 0]);
  }

  // Jika papan sudah benar-benar penuh total
  return [0, 1, 2].map(() => SHAPES[(rng() * SHAPES.length) | 0]);
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
