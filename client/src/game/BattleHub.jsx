import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { isSupabaseConfigured, supabase } from '../supabase.js';
import { createSupabaseSocket } from './supabaseBattle.js';
import Game from './GameScreen.jsx';

export default function BattleHub({ name: initialName = '' }) {
  const socketRef = useRef(null);
  if (!socketRef.current) {
    socketRef.current = isSupabaseConfigured
      ? createSupabaseSocket(supabase)
      : io(import.meta.env.VITE_SERVER_URL || undefined);
  }
  const socket = socketRef.current;
  const [screen, setScreen] = useState('menu');
  const [name, setName] = useState(initialName);
  const [codeIn, setCodeIn] = useState('');
  const [room, setRoom] = useState(null);
  const [err, setErr] = useState('');
  const [match, setMatch] = useState(null);
  const [online, setOnline] = useState(socket.connected);
  const [soloSeed, setSoloSeed] = useState(0);

  useEffect(() => {
    const onRoom = (r) => setRoom(r);
    const onStart = (m) => { setMatch(m); setScreen('battle'); };
    const on = () => setOnline(true), off = () => setOnline(false);
    socket.on('room_update', onRoom); socket.on('match_start', onStart); socket.on('connect', on); socket.on('disconnect', off);
    return () => { socket.off('room_update', onRoom); socket.off('match_start', onStart); socket.off('connect', on); socket.off('disconnect', off); };
  }, [socket]);

  const nick = () => { const n = name.trim() || 'Player'; try { localStorage.setItem('bb-name', n); } catch { /* ignore */ } return n; };
  const create = () => { setErr(''); socket.emit('create_room', { name: nick() }, (r) => (r.ok ? setScreen('room') : setErr(r.error))); };
  const join = () => { setErr(''); socket.emit('join_room', { code: codeIn, name: nick() }, (r) => (r.ok ? setScreen('room') : setErr(r.error))); };
  const exitRoom = () => { socket.emit('leave_room'); setRoom(null); setScreen('menu'); };

  const isHost = room?.hostId === socket.id;
  const setOpt = (o) => socket.emit('set_options', { mode: room.mode, garbage: room.garbage, ...o });

  let content;
  if (screen === 'solo') {
    content = <Game key={soloSeed} seed={soloSeed} onExit={() => setScreen('menu')} />;
  } else if (screen === 'battle' && match && room) {
    const opp = room.players.find((p) => p.id !== socket.id);
    content = <Game key={match.seed} seed={match.seed} onExit={() => setScreen('room')}
      battle={{ socket, duration: match.duration, garbage: match.garbage, oppName: opp?.name || 'Lawan', isHost }} />;
  } else {
    content = (
    <div className="min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-3rem)] flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-md shadow-2xl">
        <h1 className="text-4xl font-bold text-center mb-1">Block Blast <span style={{ color: 'var(--bb-accent)' }}>Battle</span></h1>
        <p className="text-center text-sm opacity-70 mb-5">{online ? 'Terhubung ke server' : 'Menghubungkan ke server…'}</p>

        {screen === 'menu' && (
          <div className="space-y-3">
            <input className="field" placeholder="Nickname" maxLength={14} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-warm w-full" onClick={() => { setSoloSeed((Math.random() * 2 ** 31) | 0); setScreen('solo'); }}>Main Solo</button>
            <button className="btn-warm w-full" disabled={!online} onClick={create}>Buat Room</button>
            <div className="flex gap-2">
              <input className="field uppercase tracking-widest" placeholder="Kode room" maxLength={6} value={codeIn} onChange={(e) => setCodeIn(e.target.value.toUpperCase())} />
              <button className="btn-warm" disabled={!online || codeIn.length < 4} onClick={join}>Gabung</button>
            </div>
            {err && <p className="text-center font-semibold">⚠ {err}</p>}
          </div>
        )}

        {screen === 'room' && room && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm opacity-70">Kode room (klik untuk menyalin)</div>
              <button className="text-5xl font-bold tracking-[.3em]" onClick={() => navigator.clipboard?.writeText(room.code)}>{room.code}</button>
            </div>
            <div className="space-y-1">
              {room.players.map((p) => <div key={p.id} className="flex justify-between chip rounded-lg px-3 py-2"><span>{p.name}{p.id === socket.id ? ' (kamu)' : ''}</span><span className="opacity-70">{p.id === room.hostId ? 'Host' : 'Pemain'}</span></div>)}
              {room.players.length < 2 && <div className="text-center opacity-70 py-2">Menunggu lawan bergabung…</div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[['survival', 'Survival'], ['time', 'Time Attack 2 mnt']].map(([k, l]) => (
                <button key={k} disabled={!isHost} onClick={() => setOpt({ mode: k })} className={`rounded-xl py-2 ${room.mode === k ? 'badge font-semibold' : 'chip'}`}>{l}</button>
              ))}
            </div>
            <label className="flex items-center justify-between chip rounded-xl px-3 py-2">
              <span>Battle Garbage (serangan blok batu)</span>
              <input type="checkbox" className="w-5 h-5" disabled={!isHost} checked={room.garbage} onChange={(e) => setOpt({ garbage: e.target.checked })} />
            </label>
            {isHost
              ? <button className="btn-warm w-full" disabled={room.players.length < 2} onClick={() => socket.emit('start_match')}>Mulai Match</button>
              : <p className="text-center opacity-70">Menunggu host memulai…</p>}
            <button className="btn-soft w-full" onClick={exitRoom}>Keluar Room</button>
          </div>
        )}
      </div>
    </div>
    );
  }

  return <div className="relative">{content}</div>;
}
