import test from 'node:test';
import assert from 'node:assert/strict';
import { attachBattle } from './battle.js';

function createMockIo() {
  const connectionHandlers = [];
  const rooms = new Map(); // roomCode -> Set of serverSide sockets

  const io = {
    on(event, handler) {
      if (event === 'connection') connectionHandlers.push(handler);
    },
    to(roomCode) {
      return {
        emit(event, data) {
          const s = rooms.get(roomCode);
          if (s) {
            for (const socket of s) {
              socket._client._receive(event, data);
            }
          }
        },
      };
    },
  };

  attachBattle(io);

  function createClientSocket(id) {
    const listeners = new Map();
    const joinedRooms = new Set();

    const client = {
      id,
      data: {},
      on(ev, fn) {
        if (!listeners.has(ev)) listeners.set(ev, []);
        listeners.get(ev).push(fn);
      },
      off(ev, fn) {
        if (!listeners.has(ev)) return;
        listeners.set(ev, listeners.get(ev).filter((f) => f !== fn));
      },
      _receive(ev, data) {
        const fns = listeners.get(ev) || [];
        fns.forEach((f) => f(data));
      },
      _server: null,
    };

    const serverSide = {
      id,
      data: {},
      join(roomCode) {
        if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
        rooms.get(roomCode).add(serverSide);
        joinedRooms.add(roomCode);
      },
      leave(roomCode) {
        if (rooms.has(roomCode)) {
          rooms.get(roomCode).delete(serverSide);
        }
        joinedRooms.delete(roomCode);
      },
      to(roomCode) {
        return {
          emit(event, data) {
            const s = rooms.get(roomCode);
            if (s) {
              for (const socket of s) {
                if (socket.id !== id) {
                  socket._client._receive(event, data);
                }
              }
            }
          },
        };
      },
      _listeners: new Map(),
      on(ev, fn) {
        if (!this._listeners.has(ev)) this._listeners.set(ev, []);
        this._listeners.get(ev).push(fn);
      },
      _client: client,
    };

    client.emit = (ev, data, cb) => {
      const fns = serverSide._listeners.get(ev) || [];
      fns.forEach((f) => f(data, cb));
    };

    client._server = serverSide;

    connectionHandlers.forEach((h) => h(serverSide));

    return client;
  }

  return { createClientSocket };
}

test('Case 1: Flexible Duration and Option Setting', async () => {
  const { createClientSocket } = createMockIo();
  const host = createClientSocket('host1');
  const guest = createClientSocket('guest1');

  let roomCode = '';
  await new Promise((res) => {
    host.emit('create_room', { name: 'Ghezy' }, (r) => {
      roomCode = r.code;
      res();
    });
  });

  await new Promise((res) => {
    guest.emit('join_room', { code: roomCode, name: 'Alice' }, () => res());
  });

  let latestRoom = null;
  guest.on('room_update', (r) => {
    latestRoom = r;
  });

  // Host sets Time Attack mode with 3 minutes (180000ms)
  host.emit('set_options', { mode: 'time', duration: 180000, garbage: true });

  assert.equal(latestRoom.mode, 'time');
  assert.equal(latestRoom.duration, 180000);
  assert.equal(latestRoom.garbage, true);

  // Host starts match, match_start should include duration 180000
  let matchStartData = null;
  guest.on('match_start', (m) => {
    matchStartData = m;
  });

  host.emit('start_match');
  assert.ok(matchStartData);
  assert.equal(matchStartData.duration, 180000);
  assert.equal(matchStartData.mode, 'time');
});

test('Case 2A: Opponent game over, but alive player already has higher score -> Auto Win immediately', async () => {
  const { createClientSocket } = createMockIo();
  const host = createClientSocket('p1');
  const guest = createClientSocket('p2');

  let code = '';
  host.emit('create_room', { name: 'Player1' }, (r) => { code = r.code; });
  guest.emit('join_room', { code, name: 'Player2' });

  let matchEndData = null;
  host.on('match_end', (d) => { matchEndData = d; });
  guest.on('match_end', (d) => { matchEndData = d; });

  host.emit('start_match');

  // Player 1 has 1500 points, Player 2 has 2000 points
  host.emit('state', { score: 1500 });
  guest.emit('state', { score: 2000 });

  // Player 1 dies (Game Over)
  host.emit('game_over');

  // Since Player 2 already has 2000 > 1500, Player 2 MUST auto win immediately!
  assert.ok(matchEndData, 'Match should have ended immediately');
  assert.equal(matchEndData.winnerId, 'p2');
  assert.match(matchEndData.reason, /skor sudah terlampaui/i);
});

test('Case 2B & 2C: Opponent game over with higher score -> game continues until alive player overtakes score -> Auto Win', async () => {
  const { createClientSocket } = createMockIo();
  const host = createClientSocket('p1');
  const guest = createClientSocket('p2');

  let code = '';
  host.emit('create_room', { name: 'Player1' }, (r) => { code = r.code; });
  guest.emit('join_room', { code, name: 'Player2' });

  let playerGameOverData = null;
  let matchEndData = null;
  guest.on('player_game_over', (d) => { playerGameOverData = d; });
  guest.on('match_end', (d) => { matchEndData = d; });

  host.emit('start_match');

  // Player 1 scores 3000 points, Player 2 has 1200 points
  host.emit('state', { score: 3000 });
  guest.emit('state', { score: 1200 });

  // Player 1 gets Game Over
  host.emit('game_over');

  // Match should NOT end yet because Player 2 has 1200 <= 3000
  assert.equal(matchEndData, null, 'Match must NOT end yet because alive player is still trailing');
  assert.ok(playerGameOverData, 'player_game_over notification should be sent');
  assert.equal(playerGameOverData.score, 3000);
  assert.equal(playerGameOverData.targetScore, 3001);

  // Player 2 continues playing and reaches 2500 -> still not overtaken
  guest.emit('state', { score: 2500 });
  assert.equal(matchEndData, null, 'Match still not ended at 2500');

  // Player 2 clears lines and reaches 3050 (> 3000) -> MUST Auto Win immediately!
  guest.emit('state', { score: 3050 });
  assert.ok(matchEndData, 'Match must end immediately once Player 2 overtakes Player 1');
  assert.equal(matchEndData.winnerId, 'p2');
  assert.match(matchEndData.reason, /berhasil membalap skor lawan/i);
});

test('Case 2D: Opponent game over with higher score, alive player ALSO game overs before overtaking -> first player wins', async () => {
  const { createClientSocket } = createMockIo();
  const host = createClientSocket('p1');
  const guest = createClientSocket('p2');

  let code = '';
  host.emit('create_room', { name: 'Player1' }, (r) => { code = r.code; });
  guest.emit('join_room', { code, name: 'Player2' });

  let matchEndData = null;
  host.on('match_end', (d) => { matchEndData = d; });

  host.emit('start_match');

  // Player 1 has 4000 points, Player 2 has 1500 points
  host.emit('state', { score: 4000 });
  guest.emit('state', { score: 1500 });

  // Player 1 dies
  host.emit('game_over');
  assert.equal(matchEndData, null);

  // Player 2 gets up to 2800 points, then ALSO gets Game Over!
  guest.emit('state', { score: 2800 });
  guest.emit('game_over');

  // Both are now game over: Player 1 has 4000, Player 2 has 2800 -> Player 1 wins!
  assert.ok(matchEndData);
  assert.equal(matchEndData.winnerId, 'p1');
  assert.match(matchEndData.reason, /Player1 unggul/i);
});

test('Case 2E: Both players game over with equal score -> Draw (Seri)', async () => {
  const { createClientSocket } = createMockIo();
  const host = createClientSocket('p1');
  const guest = createClientSocket('p2');

  let code = '';
  host.emit('create_room', { name: 'Player1' }, (r) => { code = r.code; });
  guest.emit('join_room', { code, name: 'Player2' });

  let matchEndData = null;
  host.on('match_end', (d) => { matchEndData = d; });

  host.emit('start_match');

  // Both have 1000 points
  host.emit('state', { score: 1000 });
  guest.emit('state', { score: 1000 });

  host.emit('game_over');
  assert.equal(matchEndData, null);

  guest.emit('game_over');
  assert.ok(matchEndData);
  assert.equal(matchEndData.winnerId, null);
  assert.match(matchEndData.reason, /skor sama/i);
});

test('Case 3: Taunting / Emotes delivery', async () => {
  const { createClientSocket } = createMockIo();
  const host = createClientSocket('p1');
  const guest = createClientSocket('p2');

  let code = '';
  host.emit('create_room', { name: 'Player1' }, (r) => { code = r.code; });
  guest.emit('join_room', { code, name: 'Player2' });
  host.emit('start_match');

  let receivedTauntHost = null;
  let receivedTauntGuest = null;
  host.on('taunt', (t) => { receivedTauntHost = t; });
  guest.on('taunt', (t) => { receivedTauntGuest = t; });

  guest.emit('taunt', { emote: '🔥', text: 'Semangat!' });

  assert.ok(receivedTauntHost);
  assert.ok(receivedTauntGuest);
  assert.equal(receivedTauntHost.emote, '🔥');
  assert.equal(receivedTauntHost.text, 'Semangat!');
  assert.equal(receivedTauntHost.senderName, 'Player2');
});

test('Case 4: Time Up safety event triggers endMatch with highest score', async () => {
  const { createClientSocket } = createMockIo();
  const host = createClientSocket('p1');
  const guest = createClientSocket('p2');

  let code = '';
  host.emit('create_room', { name: 'Player1' }, (r) => { code = r.code; });
  guest.emit('join_room', { code, name: 'Player2' });
  host.emit('set_options', { mode: 'time', duration: 60000 });
  host.emit('start_match');

  host.emit('state', { score: 3200 });
  guest.emit('state', { score: 2800 });

  let matchEndData = null;
  host.on('match_end', (d) => { matchEndData = d; });

  host.emit('time_up');
  assert.ok(matchEndData);
  assert.equal(matchEndData.winnerId, 'p1');
  assert.match(matchEndData.reason, /Waktu habis/i);
});
