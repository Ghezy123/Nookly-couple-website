// Battle 1v1 real-time (Socket.io)
export function attachBattle(io) {
const rooms = new Map();
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { let c; do { c = Array.from({ length: 5 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join(''); } while (rooms.has(c)); return c; };
const snap = (r) => ({ code: r.code, hostId: r.hostId, mode: r.mode, garbage: r.garbage, inMatch: r.inMatch, players: r.players.map(({ id, name }) => ({ id, name })) });
const push = (r) => io.to(r.code).emit('room_update', snap(r));
const cleanName = (n) => String(n || 'Player').trim().slice(0, 14) || 'Player';

function endMatch(r, winnerId, reason) {
  if (!r.inMatch) return;
  clearTimeout(r.timer);
  r.inMatch = false;
  io.to(r.code).emit('match_end', { winnerId, reason, scores: r.scores });
  push(r);
}

function leave(s) {
  const code = s.data.code; const r = rooms.get(code);
  if (!r) return;
  s.leave(code); s.data.code = null;
  r.players = r.players.filter((p) => p.id !== s.id);
  if (r.players.length === 0) { clearTimeout(r.timer); rooms.delete(code); return; }
  if (r.inMatch) endMatch(r, r.players[0].id, 'Lawan keluar dari room');
  if (r.hostId === s.id) r.hostId = r.players[0].id;
  push(r);
}

io.on('connection', (s) => {
  s.on('create_room', ({ name }, cb) => {
    leave(s);
    const code = newCode();
    const r = { code, hostId: s.id, players: [{ id: s.id, name: cleanName(name) }], mode: 'survival', garbage: false, inMatch: false, scores: {}, timer: null };
    rooms.set(code, r); s.join(code); s.data.code = code;
    cb?.({ ok: true, code }); push(r);
  });
  s.on('join_room', ({ code, name }, cb) => {
    const r = rooms.get(String(code || '').trim().toUpperCase());
    if (!r) return cb?.({ ok: false, error: 'Room tidak ditemukan' });
    if (r.players.length >= 2) return cb?.({ ok: false, error: 'Room sudah penuh' });
    if (r.inMatch) return cb?.({ ok: false, error: 'Match sedang berjalan' });
    leave(s);
    r.players.push({ id: s.id, name: cleanName(name) });
    s.join(r.code); s.data.code = r.code;
    cb?.({ ok: true, code: r.code }); push(r);
  });
  s.on('set_options', ({ mode, garbage }) => {
    const r = rooms.get(s.data.code);
    if (!r || r.hostId !== s.id || r.inMatch) return;
    if (mode === 'survival' || mode === 'time') r.mode = mode;
    r.garbage = !!garbage; push(r);
  });
  s.on('start_match', () => {
    const r = rooms.get(s.data.code);
    if (!r || r.hostId !== s.id || r.inMatch || r.players.length < 2) return;
    r.inMatch = true; r.scores = {}; r.players.forEach((p) => (r.scores[p.id] = 0));
    const duration = r.mode === 'time' ? 120000 : 0;
    io.to(r.code).emit('match_start', { seed: (Math.random() * 2 ** 31) | 0, mode: r.mode, garbage: r.garbage, duration, startDelay: 3000 });
    if (duration) {
      r.timer = setTimeout(() => {
        const [a, b] = r.players; const sa = r.scores[a.id] || 0, sb = r.scores[b.id] || 0;
        endMatch(r, sa === sb ? null : sa > sb ? a.id : b.id, 'Waktu habis');
      }, duration + 3000);
    }
    push(r);
  });
  s.on('state', (d) => {
    const r = rooms.get(s.data.code); if (!r || !r.inMatch) return;
    r.scores[s.id] = Number(d?.score) || 0;
    s.to(r.code).emit('opp_state', d);
  });
  s.on('attack', ({ n }) => {
    const r = rooms.get(s.data.code); if (!r || !r.inMatch || !r.garbage) return;
    s.to(r.code).emit('attack', { n: Math.max(1, Math.min(2, Number(n) || 1)) });
  });
  s.on('game_over', () => {
    const r = rooms.get(s.data.code); if (!r || !r.inMatch) return;
    const other = r.players.find((p) => p.id !== s.id);
    endMatch(r, other?.id ?? null, 'Papan penuh (Game Over)');
  });
  s.on('leave_room', () => leave(s));
  s.on('disconnect', () => leave(s));
});

}
