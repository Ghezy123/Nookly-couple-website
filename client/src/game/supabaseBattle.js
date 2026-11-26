// Adapter Socket.io over Supabase Realtime Broadcast & Presence
// Memungkinkan Game Battle 1v1 berjalan 100% di Supabase tanpa server Node.js terpisah!

export function createSupabaseSocket(supabase) {
  const myId = 'u_' + Math.random().toString(36).slice(2, 9);
  const listeners = new Map();
  let currentChannel = null;
  let currentRoom = null;
  let matchTimer = null;
  let connected = true;

  const trigger = (event, data) => {
    const handlers = listeners.get(event) || [];
    handlers.forEach((h) => {
      try {
        h(data);
      } catch (e) {
        console.error('Socket listener error:', e);
      }
    });
  };

  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () =>
    Array.from({ length: 5 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join('');

  const endMatchAsHost = (winnerId, reason) => {
    if (!currentRoom || !currentRoom.inMatch) return;
    if (matchTimer) {
      clearTimeout(matchTimer);
      matchTimer = null;
    }
    currentRoom.inMatch = false;
    const endData = {
      winnerId,
      reason,
      scores: currentRoom.scores || {},
    };
    currentChannel?.send({
      type: 'broadcast',
      event: 'match_end',
      payload: endData,
    });
    trigger('match_end', endData);
  };

  const handleGameOverAsHost = (playerId) => {
    if (!currentRoom || !currentRoom.inMatch) return;
    currentRoom.gameOver = currentRoom.gameOver || {};
    if (currentRoom.gameOver[playerId]) return;

    currentRoom.gameOver[playerId] = true;
    const myScore = currentRoom.scores[playerId] || 0;
    const myPlayer = currentRoom.players.find((p) => p.id === playerId);
    const other = currentRoom.players.find((p) => p.id !== playerId);

    if (!other) {
      endMatchAsHost(null, 'Game Over');
      return;
    }

    const otherScore = currentRoom.scores[other.id] || 0;

    // Kasus 1: Kedua pemain sudah game over
    if (currentRoom.gameOver[other.id]) {
      let winnerId = null;
      let reason = 'Kedua pemain Game Over';
      if (otherScore > myScore) {
        winnerId = other.id;
        reason = `Kedua pemain Game Over! ${other.name} unggul (${otherScore} vs ${myScore})`;
      } else if (myScore > otherScore) {
        winnerId = playerId;
        reason = `Kedua pemain Game Over! ${myPlayer?.name || 'Pemain'} unggul (${myScore} vs ${otherScore})`;
      } else {
        winnerId = null;
        reason = `Kedua pemain Game Over dengan skor sama (${myScore})!`;
      }
      endMatchAsHost(winnerId, reason);
      return;
    }

    // Kasus 2: Lawan masih hidup & skor lawan SUDAH di atas pemain yg game over
    if (otherScore > myScore) {
      endMatchAsHost(
        other.id,
        `${other.name} menang! Papan lawan penuh dan skor sudah terlampaui (${otherScore} vs ${myScore})`
      );
      return;
    }

    // Kasus 3: Lawan masih hidup dan skornya masih <= skor pemain yg game over
    const pgoData = {
      id: playerId,
      name: myPlayer?.name || 'Lawan',
      score: myScore,
      targetScore: myScore + 1,
    };
    currentChannel?.send({
      type: 'broadcast',
      event: 'player_game_over',
      payload: pgoData,
    });
    trigger('player_game_over', pgoData);
  };

  const socket = {
    id: myId,
    connected,

    on: (event, handler) => {
      const arr = listeners.get(event) || [];
      arr.push(handler);
      listeners.set(event, arr);
    },

    off: (event, handler) => {
      const arr = listeners.get(event) || [];
      listeners.set(
        event,
        arr.filter((h) => h !== handler)
      );
    },

    emit: (event, payload, cb) => {
      // 1. CREATE ROOM (Host)
      if (event === 'create_room') {
        const code = newCode();
        const room = {
          code,
          hostId: myId,
          players: [{ id: myId, name: payload.name || 'Player' }],
          mode: 'survival',
          duration: 120000,
          garbage: false,
          inMatch: false,
          scores: { [myId]: 0 },
          gameOver: { [myId]: false },
        };
        currentRoom = room;

        if (currentChannel) supabase.removeChannel(currentChannel);
        currentChannel = supabase.channel(`battle-${code}`, {
          config: { broadcast: { self: false } },
        });

        currentChannel
          .on('broadcast', { event: 'join_request' }, ({ payload: p }) => {
            if (currentRoom.players.length < 2 && !currentRoom.inMatch) {
              currentRoom.players.push({ id: p.id, name: p.name });
              currentRoom.scores[p.id] = 0;
              currentRoom.gameOver[p.id] = false;
              currentChannel.send({
                type: 'broadcast',
                event: 'room_update',
                payload: currentRoom,
              });
              trigger('room_update', currentRoom);
            }
          })
          .on('broadcast', { event: 'state' }, ({ payload: p }) => {
            if (currentRoom?.inMatch && p?.id) {
              const newScore = Number(p.score) || 0;
              currentRoom.scores[p.id] = newScore;

              // Cek apakah lawan dari player p sudah game over dan sekarang skor p membalapnya
              const other = currentRoom.players.find((pl) => pl.id !== p.id);
              if (other && currentRoom.gameOver?.[other.id]) {
                const oppFinal = currentRoom.scores[other.id] || 0;
                if (newScore > oppFinal) {
                  const pName = currentRoom.players.find((pl) => pl.id === p.id)?.name || 'Pemain';
                  endMatchAsHost(
                    p.id,
                    `${pName} menang! Berhasil membalap skor lawan (${newScore} vs ${oppFinal})!`
                  );
                }
              }
            }
            trigger('opp_state', p);
          })
          .on('broadcast', { event: 'attack' }, ({ payload: p }) => trigger('attack', p))
          .on('broadcast', { event: 'game_over' }, ({ payload: p }) => {
            handleGameOverAsHost(p.id);
          })
          .on('broadcast', { event: 'time_up' }, () => {
            if (currentRoom?.inMatch) {
              const [a, b] = currentRoom.players;
              const sa = currentRoom.scores[a?.id] || 0;
              const sb = currentRoom.scores[b?.id] || 0;
              const winnerId = sa === sb ? null : sa > sb ? a?.id : b?.id;
              const reason =
                sa === sb
                  ? `Waktu habis! Skor imbang (${sa})`
                  : `Waktu habis! Skor akhir ${Math.max(sa, sb)} vs ${Math.min(sa, sb)}`;
              endMatchAsHost(winnerId, reason);
            }
          })
          .on('broadcast', { event: 'taunt' }, ({ payload: p }) => {
            trigger('taunt', p);
          })
          .on('broadcast', { event: 'player_leave' }, ({ payload: p }) => {
            if (currentRoom) {
              currentRoom.players = currentRoom.players.filter((pl) => pl.id !== p.id);
              if (currentRoom.inMatch) {
                endMatchAsHost(myId, 'Lawan keluar dari room');
              }
              trigger('room_update', currentRoom);
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              cb?.({ ok: true, code });
              trigger('room_update', currentRoom);
            }
          });
      }

      // 2. JOIN ROOM (Guest)
      else if (event === 'join_room') {
        const code = String(payload.code || '').trim().toUpperCase();
        if (!code) return cb?.({ ok: false, error: 'Kode room wajib diisi' });

        if (currentChannel) supabase.removeChannel(currentChannel);
        currentChannel = supabase.channel(`battle-${code}`, {
          config: { broadcast: { self: false } },
        });

        currentChannel
          .on('broadcast', { event: 'room_update' }, ({ payload: r }) => {
            currentRoom = r;
            trigger('room_update', r);
          })
          .on('broadcast', { event: 'match_start' }, ({ payload: m }) => {
            if (currentRoom) currentRoom.inMatch = true;
            trigger('match_start', m);
          })
          .on('broadcast', { event: 'match_end' }, ({ payload: e }) => {
            if (currentRoom) currentRoom.inMatch = false;
            trigger('match_end', e);
          })
          .on('broadcast', { event: 'player_game_over' }, ({ payload: p }) => {
            trigger('player_game_over', p);
          })
          .on('broadcast', { event: 'state' }, ({ payload: p }) => {
            if (currentRoom?.scores && p?.id) {
              currentRoom.scores[p.id] = Number(p.score) || 0;
            }
            trigger('opp_state', p);
          })
          .on('broadcast', { event: 'attack' }, ({ payload: p }) => trigger('attack', p))
          .on('broadcast', { event: 'taunt' }, ({ payload: p }) => trigger('taunt', p))
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              currentChannel.send({
                type: 'broadcast',
                event: 'join_request',
                payload: { id: myId, name: payload.name },
              });
              cb?.({ ok: true, code });
            }
          });
      }

      // 3. SET OPTIONS (Host)
      else if (event === 'set_options') {
        if (currentRoom && currentRoom.hostId === myId) {
          if (payload.mode) currentRoom.mode = payload.mode;
          if (typeof payload.duration === 'number') currentRoom.duration = payload.duration;
          if (typeof payload.garbage === 'boolean') currentRoom.garbage = payload.garbage;
          currentChannel?.send({
            type: 'broadcast',
            event: 'room_update',
            payload: currentRoom,
          });
          trigger('room_update', currentRoom);
        }
      }

      // 4. START MATCH (Host)
      else if (event === 'start_match') {
        if (currentRoom && currentRoom.hostId === myId) {
          currentRoom.inMatch = true;
          currentRoom.scores = {};
          currentRoom.gameOver = {};
          currentRoom.players.forEach((p) => {
            currentRoom.scores[p.id] = 0;
            currentRoom.gameOver[p.id] = false;
          });
          const duration = currentRoom.mode === 'time' ? (currentRoom.duration || 120000) : 0;
          const matchData = {
            seed: (Math.random() * 2 ** 31) | 0,
            mode: currentRoom.mode,
            duration,
            garbage: currentRoom.garbage,
            startDelay: 3000,
          };

          if (matchTimer) clearTimeout(matchTimer);
          if (duration) {
            matchTimer = setTimeout(() => {
              if (currentRoom?.inMatch) {
                const [a, b] = currentRoom.players;
                const sa = currentRoom.scores[a?.id] || 0;
                const sb = currentRoom.scores[b?.id] || 0;
                const winnerId = sa === sb ? null : sa > sb ? a?.id : b?.id;
                const reason =
                  sa === sb
                    ? `Waktu habis! Skor imbang (${sa})`
                    : `Waktu habis! Skor akhir ${Math.max(sa, sb)} vs ${Math.min(sa, sb)}`;
                endMatchAsHost(winnerId, reason);
              }
            }, duration + 3000);
          }

          currentChannel?.send({
            type: 'broadcast',
            event: 'match_start',
            payload: matchData,
          });
          trigger('match_start', matchData);
        }
      }

      // 5. IN GAME (State, Attack, Game Over, Time Up, Taunt)
      else if (event === 'state') {
        if (currentRoom?.scores) {
          currentRoom.scores[myId] = Number(payload?.score) || 0;
        }
        currentChannel?.send({
          type: 'broadcast',
          event: 'state',
          payload: { ...payload, id: myId },
        });

        // Jika host yang mengirim state:
        if (currentRoom && currentRoom.hostId === myId && currentRoom.inMatch) {
          const myScore = Number(payload?.score) || 0;
          const other = currentRoom.players.find((pl) => pl.id !== myId);
          if (other && currentRoom.gameOver?.[other.id]) {
            const oppFinal = currentRoom.scores[other.id] || 0;
            if (myScore > oppFinal) {
              const myName = currentRoom.players.find((pl) => pl.id === myId)?.name || 'Host';
              endMatchAsHost(
                myId,
                `${myName} menang! Berhasil membalap skor lawan (${myScore} vs ${oppFinal})!`
              );
            }
          }
        }
      } else if (event === 'attack' || event === 'garbage') {
        currentChannel?.send({
          type: 'broadcast',
          event: 'attack',
          payload,
        });
      } else if (event === 'game_over') {
        if (currentRoom && currentRoom.hostId === myId) {
          handleGameOverAsHost(myId);
        } else {
          currentChannel?.send({
            type: 'broadcast',
            event: 'game_over',
            payload: { id: myId },
          });
        }
      } else if (event === 'time_up') {
        if (currentRoom && currentRoom.hostId === myId) {
          if (currentRoom.inMatch) {
            const [a, b] = currentRoom.players;
            const sa = currentRoom.scores[a?.id] || 0;
            const sb = currentRoom.scores[b?.id] || 0;
            const winnerId = sa === sb ? null : sa > sb ? a?.id : b?.id;
            const reason =
              sa === sb
                ? `Waktu habis! Skor imbang (${sa})`
                : `Waktu habis! Skor akhir ${Math.max(sa, sb)} vs ${Math.min(sa, sb)}`;
            endMatchAsHost(winnerId, reason);
          }
        } else {
          currentChannel?.send({
            type: 'broadcast',
            event: 'time_up',
            payload: { id: myId },
          });
        }
      } else if (event === 'taunt') {
        currentChannel?.send({
          type: 'broadcast',
          event: 'taunt',
          payload,
        });
        trigger('taunt', payload);
      }

      // 6. LEAVE ROOM
      else if (event === 'leave_room') {
        if (matchTimer) {
          clearTimeout(matchTimer);
          matchTimer = null;
        }
        currentChannel?.send({
          type: 'broadcast',
          event: 'player_leave',
          payload: { id: myId },
        });
        if (currentChannel) {
          supabase.removeChannel(currentChannel);
          currentChannel = null;
        }
        currentRoom = null;
      }
    },
  };

  return socket;
}
