// Battle 1v1 real-time (Socket.io)
export function attachBattle(io) {
  const rooms = new Map();
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => {
    let c;
    do {
      c = Array.from({ length: 5 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join('');
    } while (rooms.has(c));
    return c;
  };
  const snap = (r) => ({
    code: r.code,
    hostId: r.hostId,
    mode: r.mode,
    duration: r.duration || 120000,
    garbage: r.garbage,
    inMatch: r.inMatch,
    players: r.players.map(({ id, name }) => ({ id, name })),
  });
  const push = (r) => io.to(r.code).emit('room_update', snap(r));
  const cleanName = (n) => String(n || 'Player').trim().slice(0, 14) || 'Player';

  function endMatch(r, winnerId, reason) {
    if (!r.inMatch) return;
    clearTimeout(r.timer);
    r.timer = null;
    r.inMatch = false;
    io.to(r.code).emit('match_end', { winnerId, reason, scores: r.scores });
    push(r);
  }

  function leave(s) {
    const code = s.data?.code;
    const r = rooms.get(code);
    if (!r) return;
    s.leave(code);
    if (s.data) s.data.code = null;
    r.players = r.players.filter((p) => p.id !== s.id);
    if (r.players.length === 0) {
      clearTimeout(r.timer);
      rooms.delete(code);
      return;
    }
    if (r.inMatch) endMatch(r, r.players[0].id, 'Lawan keluar dari room');
    if (r.hostId === s.id) r.hostId = r.players[0].id;
    push(r);
  }

  io.on('connection', (s) => {
    s.on('create_room', ({ name }, cb) => {
      leave(s);
      const code = newCode();
      const r = {
        code,
        hostId: s.id,
        players: [{ id: s.id, name: cleanName(name) }],
        mode: 'survival',
        duration: 120000,
        garbage: false,
        inMatch: false,
        scores: {},
        gameOver: {},
        timer: null,
      };
      rooms.set(code, r);
      s.join(code);
      s.data = s.data || {};
      s.data.code = code;
      cb?.({ ok: true, code });
      push(r);
    });

    s.on('join_room', ({ code, name }, cb) => {
      const r = rooms.get(String(code || '').trim().toUpperCase());
      if (!r) return cb?.({ ok: false, error: 'Room tidak ditemukan' });
      if (r.players.length >= 2) return cb?.({ ok: false, error: 'Room sudah penuh' });
      if (r.inMatch) return cb?.({ ok: false, error: 'Match sedang berjalan' });
      leave(s);
      r.players.push({ id: s.id, name: cleanName(name) });
      s.join(r.code);
      s.data = s.data || {};
      s.data.code = r.code;
      cb?.({ ok: true, code: r.code });
      push(r);
    });

    s.on('set_options', ({ mode, duration, garbage }) => {
      const r = rooms.get(s.data?.code);
      if (!r || r.hostId !== s.id || r.inMatch) return;
      if (mode === 'survival' || mode === 'time') r.mode = mode;
      if (typeof duration === 'number' && [60000, 120000, 180000, 300000].includes(duration)) {
        r.duration = duration;
      }
      if (typeof garbage === 'boolean') r.garbage = !!garbage;
      push(r);
    });

    s.on('start_match', () => {
      const r = rooms.get(s.data?.code);
      if (!r || r.hostId !== s.id || r.inMatch || r.players.length < 2) return;
      r.inMatch = true;
      r.scores = {};
      r.gameOver = {};
      r.players.forEach((p) => {
        r.scores[p.id] = 0;
        r.gameOver[p.id] = false;
      });
      const duration = r.mode === 'time' ? (r.duration || 120000) : 0;
      io.to(r.code).emit('match_start', {
        seed: (Math.random() * 2 ** 31) | 0,
        mode: r.mode,
        garbage: r.garbage,
        duration,
        startDelay: 3000,
      });

      clearTimeout(r.timer);
      if (duration) {
        r.timer = setTimeout(() => {
          if (!r.inMatch) return;
          const [a, b] = r.players;
          if (!a || !b) return endMatch(r, a?.id || null, 'Waktu habis');
          const sa = r.scores[a.id] || 0;
          const sb = r.scores[b.id] || 0;
          const winnerId = sa === sb ? null : sa > sb ? a.id : b.id;
          const reason =
            sa === sb
              ? `Waktu habis! Skor imbang (${sa})`
              : `Waktu habis! Skor akhir ${Math.max(sa, sb)} vs ${Math.min(sa, sb)}`;
          endMatch(r, winnerId, reason);
        }, duration + 3000);
      }
      push(r);
    });

    s.on('state', (d) => {
      const r = rooms.get(s.data?.code);
      if (!r || !r.inMatch) return;
      const myScore = Number(d?.score) || 0;
      r.scores[s.id] = myScore;
      s.to(r.code).emit('opp_state', d);

      // Jika lawan sudah game over sebelumnya dan skor pemain sekarang sudah di atas skor lawan:
      const other = r.players.find((p) => p.id !== s.id);
      if (other && r.gameOver?.[other.id]) {
        const oppFinalScore = r.scores[other.id] || 0;
        if (myScore > oppFinalScore) {
          const myPlayer = r.players.find((p) => p.id === s.id);
          endMatch(
            r,
            s.id,
            `${myPlayer?.name || 'Pemain'} menang! Berhasil membalap skor lawan (${myScore} vs ${oppFinalScore})!`
          );
        }
      }
    });

    s.on('attack', ({ n }) => {
      const r = rooms.get(s.data?.code);
      if (!r || !r.inMatch || !r.garbage) return;
      s.to(r.code).emit('attack', { n: Math.max(1, Math.min(2, Number(n) || 1)) });
    });

    s.on('game_over', () => {
      const r = rooms.get(s.data?.code);
      if (!r || !r.inMatch) return;
      if (r.gameOver?.[s.id]) return; // Cegah double trigger

      r.gameOver[s.id] = true;
      const myScore = r.scores[s.id] || 0;
      const myPlayer = r.players.find((p) => p.id === s.id);
      const other = r.players.find((p) => p.id !== s.id);

      if (!other) {
        endMatch(r, null, 'Game Over');
        return;
      }

      const otherScore = r.scores[other.id] || 0;

      // Kasus 1: Lawan ternyata JUGA sudah game over sebelumnya
      if (r.gameOver[other.id]) {
        let winnerId = null;
        let reason = 'Kedua pemain Game Over';
        if (otherScore > myScore) {
          winnerId = other.id;
          reason = `Kedua pemain Game Over! ${other.name} unggul (${otherScore} vs ${myScore})`;
        } else if (myScore > otherScore) {
          winnerId = s.id;
          reason = `Kedua pemain Game Over! ${myPlayer?.name || 'Pemain'} unggul (${myScore} vs ${otherScore})`;
        } else {
          winnerId = null;
          reason = `Kedua pemain Game Over dengan skor sama (${myScore})!`;
        }
        endMatch(r, winnerId, reason);
        return;
      }

      // Kasus 2: Lawan masih hidup!
      // Cek apakah skor lawan yang masih hidup SUDAH di atas skor kita yang game over:
      if (otherScore > myScore) {
        // Auto win untuk lawan karena papan kita penuh dan skor lawan sudah di atas kita!
        endMatch(
          r,
          other.id,
          `${other.name} menang! Papan lawan penuh dan skor sudah terlampaui (${otherScore} vs ${myScore})`
        );
        return;
      }

      // Kasus 3: Lawan masih hidup dan skornya masih <= skor kita.
      // Game terus berlanjut sampai lawan berhasil membalap skor kita atau lawan juga game over!
      io.to(r.code).emit('player_game_over', {
        id: s.id,
        name: myPlayer?.name || 'Lawan',
        score: myScore,
        targetScore: myScore + 1,
      });
    });

    s.on('time_up', () => {
      const r = rooms.get(s.data?.code);
      if (!r || !r.inMatch) return;
      const [a, b] = r.players;
      if (!a || !b) return endMatch(r, a?.id || null, 'Waktu habis');
      const sa = r.scores[a.id] || 0;
      const sb = r.scores[b.id] || 0;
      const winnerId = sa === sb ? null : sa > sb ? a.id : b.id;
      const reason =
        sa === sb
          ? `Waktu habis! Skor imbang (${sa})`
          : `Waktu habis! Skor akhir ${Math.max(sa, sb)} vs ${Math.min(sa, sb)}`;
      endMatch(r, winnerId, reason);
    });

    s.on('taunt', ({ emote, text }) => {
      const r = rooms.get(s.data?.code);
      if (!r || !r.inMatch) return;
      const sender = r.players.find((p) => p.id === s.id);
      io.to(r.code).emit('taunt', {
        senderId: s.id,
        senderName: sender?.name || 'Pemain',
        emote: String(emote || '😊').slice(0, 4),
        text: String(text || '').slice(0, 30),
      });
    });

    s.on('leave_room', () => leave(s));
    s.on('disconnect', () => leave(s));
  });
}
