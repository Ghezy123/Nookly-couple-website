// Adapter Socket.io over Supabase Realtime Broadcast & Presence
// Memungkinkan Game Battle 1v1 berjalan 100% di Supabase tanpa server Node.js terpisah!

export function createSupabaseSocket(supabase) {
  const myId = 'u_' + Math.random().toString(36).slice(2, 9);
  const listeners = new Map();
  let currentChannel = null;
  let currentRoom = null;
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
          garbage: false,
          inMatch: false,
          scores: { [myId]: 0 },
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
              // Kirim room_update ke semua
              currentChannel.send({
                type: 'broadcast',
                event: 'room_update',
                payload: currentRoom,
              });
              trigger('room_update', currentRoom);
            }
          })
          .on('broadcast', { event: 'state' }, ({ payload: p }) => {
            if (currentRoom?.scores && p?.id) {
              currentRoom.scores[p.id] = Number(p.score) || 0;
            }
            trigger('opp_state', p);
          })
          .on('broadcast', { event: 'attack' }, ({ payload: p }) => trigger('attack', p))
          .on('broadcast', { event: 'game_over' }, ({ payload: p }) => {
            if (currentRoom?.inMatch) {
              currentRoom.inMatch = false;
              const winnerId = currentRoom.players.find((pl) => pl.id !== p.id)?.id;
              const endData = {
                winnerId,
                reason: `${p.name || 'Lawan'} kehabisan langkah`,
                scores: currentRoom.scores,
              };
              currentChannel.send({
                type: 'broadcast',
                event: 'match_end',
                payload: endData,
              });
              trigger('match_end', endData);
            }
          })
          .on('broadcast', { event: 'player_leave' }, ({ payload: p }) => {
            if (currentRoom) {
              currentRoom.players = currentRoom.players.filter((pl) => pl.id !== p.id);
              if (currentRoom.inMatch) {
                currentRoom.inMatch = false;
                const endData = {
                  winnerId: myId,
                  reason: 'Lawan keluar dari room',
                  scores: currentRoom.scores,
                };
                currentChannel.send({
                  type: 'broadcast',
                  event: 'match_end',
                  payload: endData,
                });
                trigger('match_end', endData);
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
          .on('broadcast', { event: 'state' }, ({ payload: p }) => {
            if (currentRoom?.scores && p?.id) {
              currentRoom.scores[p.id] = Number(p.score) || 0;
            }
            trigger('opp_state', p);
          })
          .on('broadcast', { event: 'attack' }, ({ payload: p }) => trigger('attack', p))
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Minta bergabung ke host
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
          const duration = currentRoom.mode === 'time' ? 120000 : 0;
          const matchData = {
            seed: (Math.random() * 2 ** 31) | 0,
            mode: currentRoom.mode,
            garbage: currentRoom.garbage,
            duration,
            startDelay: 3000,
          };
          currentChannel?.send({
            type: 'broadcast',
            event: 'match_start',
            payload: matchData,
          });
          trigger('match_start', matchData);
        }
      }

      // 5. IN GAME (State, Attack / Garbage, Game Over)
      else if (event === 'state') {
        if (currentRoom?.scores) {
          currentRoom.scores[myId] = Number(payload?.score) || 0;
        }
        currentChannel?.send({
          type: 'broadcast',
          event: 'state',
          payload: { ...payload, id: myId },
        });
      } else if (event === 'attack' || event === 'garbage') {
        currentChannel?.send({
          type: 'broadcast',
          event: 'attack',
          payload,
        });
      } else if (event === 'game_over') {
        currentChannel?.send({
          type: 'broadcast',
          event: 'game_over',
          payload: { id: myId },
        });
      }

      // 6. LEAVE ROOM
      else if (event === 'leave_room') {
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
