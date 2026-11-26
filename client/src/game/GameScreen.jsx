import { useEffect, useRef, useState } from 'react';
import { N, COLORS, emptyGrid, createStarterGrid, genHand, fits, canFitAny, linesFor, applyMove, scoreMove, addJunk } from './engine.js';
import * as sfx from './audio.js';

const LABELS = ['', 'GREAT!', 'AMAZING!', 'UNBELIEVABLE!'];
const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.ceil((ms % 60000) / 1000) % 60).padStart(2, '0')}`;
const col = (v) => COLORS[v - 1];

const TAUNT_OPTIONS = [
  { emote: '🔥', label: 'GG!' },
  { emote: '😎', label: 'Ez!' },
  { emote: '👏', label: 'Salut' },
  { emote: '😂', label: 'Wkwk' },
  { emote: '😜', label: 'Kejar!' },
  { emote: '😱', label: 'Waduh' },
  { emote: '😭', label: 'Apes' },
  { emote: '❤️', label: 'Mantap' },
];

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.2 + Math.random() * 2,
      color: ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f43f5e', '#fbbf24', '#06b6d4'][i % 8],
      size: 8 + Math.random() * 8,
      rotation: Math.random() * 360,
    }))
  ).current;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute -top-4 rounded-sm animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.55}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function useCount(target) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    let raf; const from = cur.current, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 500);
      cur.current = Math.round(from + (target - from) * (1 - (1 - k) ** 3)); setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Board({ grid, ghost, hl, hlColor, mini, gridRef }) {
  return (
    <div className={`shadow-xl ${mini ? 'p-1.5 rounded-xl' : 'p-2 rounded-2xl'}`} style={{ background: 'var(--board)' }}>
      <div ref={gridRef} className={`grid grid-cols-8 ${mini ? 'gap-px' : 'gap-[3px]'}`}>
        {grid.map((row, r) => row.map((v, c) => {
          const g = ghost?.get(`${r},${c}`);
          const lit = hl && (hl.rows.includes(r) || hl.cols.includes(c));
          if (g) return <div key={`${r}${c}`} className="cell blk opacity-60" style={{ '--c': col(g) }} />;
          if (v) return <div key={`${r}${c}`} className={`cell blk ${lit ? 'brightness-125 opacity-70' : ''}`} style={{ '--c': col(v) }} />;
          if (lit) return <div key={`${r}${c}`} className="cell blk opacity-35" style={{ '--c': col(hlColor) }} />;
          return <div key={`${r}${c}`} className="cell" />;
        }))}
      </div>
    </div>
  );
}

function PieceView({ s, px }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.w}, ${px}px)`, gridAutoRows: `${px}px` }}>
      {s.m.flat().map((v, i) => <div key={i} className={v ? 'blk' : ''} style={v ? { '--c': col(s.color), margin: 0.5 } : {}} />)}
    </div>
  );
}

export default function Game({ seed, battle, onExit }) {
  const net = battle?.socket;
  const [g, setG] = useState(() => { const grid = createStarterGrid(6); return { grid, hand: genHand(grid, Math.random), score: 0, streak: 0, miss: 0, round: 0, over: false }; });
  const gr = useRef(g); gr.current = g;
  const [phase, setPhase] = useState(battle ? 'count' : 'play');
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(battle?.duration || 0);
  const [opp, setOpp] = useState(null);
  const [oppGameOver, setOppGameOver] = useState(null);
  const [result, setResult] = useState(null);
  const [fx, setFx] = useState([]);
  const [pops, setPops] = useState([]);
  const [shake, setShake] = useState(false);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const [sel, setSel] = useState(null);
  const [pt, setPt] = useState(null);
  const boardRef = useRef(null);
  const uid = useRef(0);
  const timeUpSent = useRef(false);
  const [best, setBest] = useState(() => { try { return +localStorage.getItem('bb-best') || 0; } catch { return 0; } });
  const shown = useCount(g.score);

  // Taunt & Emote state
  const [taunts, setTaunts] = useState([]);
  const [showEmotes, setShowEmotes] = useState(false);
  const [tauntCd, setTauntCd] = useState(0);

  const emit = (st, lines = 0) => net?.emit('state', { grid: st.grid, score: st.score, streak: st.streak, lines });

  // countdown 3-2-1 (battle)
  useEffect(() => {
    if (!battle) return;
    emit(gr.current);
    let n = 3; sfx.tick();
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(t); setPhase('play'); sfx.go(); emit(gr.current); } else { setCount(n); sfx.tick(); }
    }, 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  // time attack clock
  useEffect(() => {
    if (phase !== 'play' || !battle?.duration) return;
    timeUpSent.current = false;
    const end = performance.now() + battle.duration;
    const t = setInterval(() => {
      const rem = Math.max(0, end - performance.now());
      setLeft(rem);
      if (rem <= 0 && !timeUpSent.current) {
        timeUpSent.current = true;
        net?.emit('time_up');
      }
    }, 200);
    return () => clearInterval(t);
  }, [phase, battle?.duration]); // eslint-disable-line

  // Cooldown timer for taunts
  useEffect(() => {
    if (tauntCd <= 0) return;
    const t = setTimeout(() => setTauntCd((c) => Math.max(0, c - 0.2)), 200);
    return () => clearTimeout(t);
  }, [tauntCd]);

  // socket events
  useEffect(() => {
    if (!net) return;
    const onOpp = (d) => setOpp(d);
    const onAttack = ({ n }) => {
      const p = gr.current; if (p.over || phaseRef.current !== 'play') return;
      const grid = addJunk(p.grid, n);
      const over = !canFitAny(grid, p.hand);
      const np = { ...p, grid, over };
      setG(np); emit(np); sfx.nope();
      if (over) net.emit('game_over');
    };
    const onPlayerGameOver = (d) => {
      if (d.id !== net.id) {
        setOppGameOver(d);
      }
    };
    const onTaunt = (d) => {
      sfx.taunt();
      const tid = ++uid.current;
      setTaunts((ts) => [...ts, { ...d, uid: tid }]);
      setTimeout(() => setTaunts((ts) => ts.filter((x) => x.uid !== tid)), 2600);
    };
    const onEnd = (d) => {
      setResult(d); setPhase('ended');
      if (d.winnerId === net.id) sfx.win(); else sfx.lose();
    };

    net.on('opp_state', onOpp);
    net.on('attack', onAttack);
    net.on('player_game_over', onPlayerGameOver);
    net.on('taunt', onTaunt);
    net.on('match_end', onEnd);

    return () => {
      net.off('opp_state', onOpp);
      net.off('attack', onAttack);
      net.off('player_game_over', onPlayerGameOver);
      net.off('taunt', onTaunt);
      net.off('match_end', onEnd);
    };
  }, [net]); // eslint-disable-line

  const sendTaunt = (emote, label) => {
    if (tauntCd > 0 || !net) return;
    net.emit('taunt', { emote, text: label });
    setTauntCd(1.5);
    setShowEmotes(false);
  };

  const anchor = (s, x, y, lift) => {
    const rect = boardRef.current.getBoundingClientRect(); const cs = rect.width / N;
    return { r: Math.round((y - lift - s.h * cs / 2 - rect.top) / cs), c: Math.round((x - s.w * cs / 2 - rect.left) / cs) };
  };

  const place = (i, r, c) => {
    const p = gr.current;
    if (p.over || phaseRef.current !== 'play') return false;
    if (battle?.duration && left <= 0) return false;
    const s = p.hand[i];
    if (!s || !fits(p.grid, s, r, c)) return false;
    const res = applyMove(p.grid, s, r, c);
    const sc = scoreMove(s.cells, res.lines, p.streak, p.miss);
    let hand = p.hand.map((h, k) => (k === i ? null : h)); let round = p.round;
    if (hand.every((h) => !h)) { round += 1; hand = genHand(res.grid, Math.random); }
    const over = !canFitAny(res.grid, hand);
    const np = { grid: res.grid, hand, score: p.score + sc.gain, streak: sc.streak, miss: sc.miss, round, over };
    setG(np); setSel(null); sfx.place();

    if (res.lines) {
      setTimeout(() => sfx.chime(sc.level), 60);
      const parts = res.cleared.flatMap(({ r: pr, c: pc, v }) => Array.from({ length: 3 }, () => ({
        id: ++uid.current, x: ((pc + 0.5) / N) * 100, y: ((pr + 0.5) / N) * 100, color: col(v),
        dx: (Math.random() - 0.5) * 220, dy: (Math.random() - 0.7) * 220 })));
      const ids = parts.map((q) => q.id);
      setFx((f) => [...f, ...parts]); setTimeout(() => setFx((f) => f.filter((q) => !ids.includes(q.id))), 800);
      const pid = ++uid.current;
      setPops((q) => [...q, { id: pid, text: LABELS[Math.min(sc.level, 3)], sub: `+${sc.gain}`, streak: sc.streak, lv: sc.level }]);
      setTimeout(() => setPops((q) => q.filter((x) => x.id !== pid)), 1150);
      if (res.lines >= 3 || sc.level >= 2) { setShake(true); setTimeout(() => setShake(false), 420); }
    }
    if (net) {
      emit(np, res.lines);
      if (battle.garbage) {
        const n = res.lines >= 3 ? 2 : sc.streak >= 2 && res.lines > 0 ? 1 : 0;
        if (n) net.emit('attack', { n });
      }
      if (over) net.emit('game_over');
    } else if (over) {
      sfx.lose();
      if (np.score > best) { setBest(np.score); try { localStorage.setItem('bb-best', String(np.score)); } catch { /* ignore */ } }
    }
    return true;
  };

  useEffect(() => {
    const mv = (e) => {
      const d = dragRef.current; if (!d) return;
      const nd = { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6 };
      dragRef.current = nd; setDrag(nd);
    };
    const up = (e) => {
      const d = dragRef.current; if (!d) return;
      dragRef.current = null; setDrag(null);
      const s = gr.current.hand[d.i];
      if (d.moved && s) { const a = anchor(s, e.clientX, e.clientY, d.lift); if (!place(d.i, a.r, a.c)) sfx.nope(); }
      else if (s) setSel((v) => (v === d.i ? null : d.i));
    };
    const cancel = () => { dragRef.current = null; setDrag(null); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); };
  }, []); // eslint-disable-line

  const down = (e, i) => {
    if (!g.hand[i] || g.over || phase !== 'play') return;
    if (battle?.duration && left <= 0) return;
    sfx.pick();
    const d = { i, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, lift: e.pointerType === 'touch' ? 70 : 12 };
    dragRef.current = d; setDrag(d);
  };

  // preview (ghost + highlight)
  let ghost = null, hl = null, hlColor = 1;
  const act = drag?.moved ? drag : sel != null && pt ? { i: sel, x: pt.x, y: pt.y, lift: 0 } : null;
  if (act && g.hand[act.i] && boardRef.current) {
    const s = g.hand[act.i]; const a = anchor(s, act.x, act.y, act.lift);
    if (fits(g.grid, s, a.r, a.c)) {
      ghost = new Map();
      s.m.forEach((row, i) => row.forEach((v, j) => { if (v) ghost.set(`${a.r + i},${a.c + j}`, s.color); }));
      const L = linesFor(g.grid, s, a.r, a.c);
      if (L.rows.length || L.cols.length) { hl = L; hlColor = s.color; }
    }
  }

  const leave = () => { if (net && phase !== 'ended' && !g.over) net.emit('game_over'); onExit(); };
  const restart = () => { setG(() => { const grid = createStarterGrid(6); return { grid, hand: genHand(grid, Math.random), score: 0, streak: 0, miss: 0, round: 0, over: false }; }); };
  const iWon = result?.winnerId === net?.id;
  const isDraw = result && result.winnerId == null;

  return (
    <div className="min-h-full flex flex-col items-center px-3 py-3 select-none relative">
      {/* Header bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-2">
        <button className="btn-soft text-sm" onClick={leave}>✕ Keluar</button>
        
        <div className="flex items-center gap-2">
          {battle ? (
            <div className={`text-2xl font-bold tabular-nums px-3 py-1 rounded-2xl ${battle.duration && left <= 15000 ? 'bg-rose-500/20 text-rose-500 animate-pulse' : ''}`}>
              {battle.duration ? fmt(left) : 'Survival'}
            </div>
          ) : (
            <button
              type="button"
              className="text-2xl font-bold tabular-nums hover:opacity-75 transition cursor-pointer"
              title="Klik untuk reset rekor skor"
              onClick={() => {
                if (window.confirm('Reset rekor skor tertinggi ke 0?')) {
                  setBest(0);
                  try { localStorage.removeItem('bb-best'); } catch { /* ignore */ }
                }
              }}
            >
              Rekor {best}
            </button>
          )}
        </div>

        {/* Emote Button (Battle only) */}
        {battle ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmotes((s) => !s)}
              className="btn-soft text-xs sm:text-sm font-bold flex items-center gap-1 relative"
              title="Kirim Emot"
            >
              <span>💬</span>
              <span>Emot</span>
              {tauntCd > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {Math.ceil(tauntCd)}
                </span>
              )}
            </button>

            {showEmotes && (
              <div className="absolute right-0 top-full mt-2 w-56 p-2 card shadow-2xl z-50 rounded-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-semibold opacity-70 mb-1 px-1">Kirim Taunt / Emot:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TAUNT_OPTIONS.map((t) => (
                    <button
                      key={t.emote}
                      disabled={tauntCd > 0}
                      onClick={() => sendTaunt(t.emote, t.label)}
                      className="flex items-center gap-1.5 p-1.5 rounded-xl text-left text-xs chip hover:brightness-110 active:scale-95 transition disabled:opacity-40"
                    >
                      <span className="text-base">{t.emote}</span>
                      <span className="truncate font-semibold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Target score banner when opponent is Game Over */}
      {battle && oppGameOver && phase === 'play' && !g.over && (
        <div className="w-full max-w-md mb-2 px-3 py-1.5 rounded-2xl badge shadow-md flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-1.5 font-bold">
            <span>🎯</span>
            <span>Balap skor {oppGameOver.score} untuk menang!</span>
          </div>
          <div className="font-extrabold tabular-nums bg-white/20 px-2 py-0.5 rounded-lg text-xs">
            {g.score} / {oppGameOver.targetScore}
          </div>
        </div>
      )}

      {/* Main Boards Area */}
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-4 items-center lg:items-start justify-center relative">
        {/* Floating Taunts Popups */}
        <div className="absolute inset-x-0 top-2 pointer-events-none z-50 flex flex-col items-center gap-2">
          {taunts.map((t) => (
            <div
              key={t.uid}
              className="animate-float-bubble px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 border border-white/20"
              style={{ background: 'var(--panel)', backdropFilter: 'blur(10px)' }}
            >
              <span className="text-2xl">{t.emote}</span>
              <span className="text-xs font-bold">{t.text}</span>
            </div>
          ))}
        </div>

        {/* Player Board */}
        <div className={shake ? 'shake' : ''} style={{ width: 'min(92vw, 500px)' }}>
          <div className="flex items-end justify-between px-1 mb-2">
            <div>
              <div className="text-sm opacity-70">Skor</div>
              <div className="text-5xl font-bold tabular-nums leading-none">{shown}</div>
            </div>
            {g.streak >= 2 && <div className="text-xl font-bold px-3 py-1 rounded-xl badge shadow-sm">Combo x{g.streak}</div>}
          </div>

          <div
            className="relative"
            onPointerMove={(e) => setPt({ x: e.clientX, y: e.clientY })}
            onPointerLeave={() => setPt(null)}
            onClick={(e) => {
              if (sel != null && g.hand[sel] && boardRef.current) {
                const a = anchor(g.hand[sel], e.clientX, e.clientY, 0);
                if (!place(sel, a.r, a.c)) sfx.nope();
              }
            }}
          >
            <Board grid={g.grid} ghost={ghost} hl={hl} hlColor={hlColor} gridRef={boardRef} />
            <div className="absolute inset-2 pointer-events-none overflow-visible">
              {fx.map((q) => <div key={q.id} className="particle" style={{ left: `${q.x}%`, top: `${q.y}%`, background: q.color, '--dx': `${q.dx}px`, '--dy': `${q.dy}px` }} />)}
              {pops.map((q) => (
                <div key={q.id} className="rise">
                  {q.text && <div className="text-4xl font-bold text-yellow-300 drop-shadow">{q.text}</div>}
                  {q.streak >= 2 && <div className="text-2xl font-bold text-yellow-200">Combo x{q.streak}</div>}
                  <div className="text-2xl font-bold drop-shadow">{q.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Piece Hand */}
          <div className="flex mt-4 panel">
            {g.hand.map((s, i) => (
              <div
                key={i}
                className={`flex-1 h-28 flex items-center justify-center rounded-xl m-1 transition ${sel === i ? 'ring-2 ring-[var(--accent)] scale-105' : ''}`}
                style={{ touchAction: 'none', cursor: s ? 'grab' : 'default' }}
                onPointerDown={(e) => down(e, i)}
              >
                {s && <div style={{ opacity: drag?.moved && drag.i === i ? 0.25 : 1 }}><PieceView s={s} px={22} /></div>}
              </div>
            ))}
          </div>
          <p className="text-center text-xs opacity-60 mt-2">Seret balok ke papan, atau klik balok lalu klik papan.</p>
        </div>

        {/* Opponent Board (Battle only) */}
        {battle && (
          <div className="card p-3 lg:order-2 w-full max-w-[280px]" style={{ width: 'min(60vw, 260px)' }}>
            <div className="flex justify-between items-baseline mb-1">
              <div className="font-bold truncate flex items-center gap-1.5">
                <span>{battle.oppName}</span>
                {oppGameOver && <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-bold">KO</span>}
              </div>
              <div className="text-xl font-bold tabular-nums">{opp?.score ?? 0}</div>
            </div>
            <Board mini grid={opp?.grid ?? emptyGrid()} />
            <div className="h-7 mt-1.5 flex gap-2 text-sm">
              {opp?.streak >= 2 && <span className="px-2 rounded badge font-bold text-xs flex items-center">Combo x{opp.streak}</span>}
              {opp?.lines > 0 && <span className="px-2 rounded chip text-xs flex items-center">Hancur {opp.lines} garis</span>}
            </div>
            {battle.garbage && <div className="text-[11px] opacity-60 mt-1 leading-snug">Battle Garbage aktif: 3+ garis / combo mengirim blok batu.</div>}
          </div>
        )}
      </div>

      {/* Floating Dragging Piece */}
      {drag?.moved && boardRef.current && g.hand[drag.i] && (() => {
        const s = g.hand[drag.i]; const cs = boardRef.current.getBoundingClientRect().width / N;
        return <div style={{ position: 'fixed', left: drag.x - s.w * cs / 2, top: drag.y - drag.lift - s.h * cs / 2, pointerEvents: 'none', zIndex: 60 }}><PieceView s={s} px={cs} /></div>;
      })()}

      {/* Countdown Overlay */}
      {phase === 'count' && <Overlay><div className="text-9xl font-extrabold text-accent animate-pulse">{count}</div></Overlay>}

      {/* Solo Game Over Overlay */}
      {!battle && g.over && (
        <Overlay>
          <div className="text-4xl font-extrabold mb-1">Game Over</div>
          <div className="text-lg opacity-90 mb-4">Skor Akhir: <span className="font-bold text-accent">{g.score}</span></div>
          <div className="flex gap-2 justify-center">
            <button className="btn-warm px-5" onClick={restart}>Main Lagi</button>
            <button className="btn-soft px-5" onClick={onExit}>Menu</button>
          </div>
        </Overlay>
      )}

      {/* Battle: Player is Game Over, waiting for opponent to finish */}
      {battle && g.over && phase !== 'ended' && (
        <Overlay>
          <div className="text-3xl font-black mb-1 text-rose-400">Game Over</div>
          <div className="text-sm font-semibold opacity-80 mb-2">Skor: <span className="text-accent font-bold">{g.score}</span></div>
          
          <div className="p-3 my-2 rounded-2xl bg-black/20 text-center space-y-1.5 max-w-xs mx-auto">
            <div className="text-xs opacity-75 font-medium">
              {battle.oppName} mengejar skormu ({opp?.score ?? 0} / {g.score + 1})
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(((opp?.score ?? 0) / (g.score + 1)) * 100))}%` }}
              />
            </div>
          </div>

          <button className="btn-soft px-5 py-2 text-xs font-bold mt-2" onClick={leave}>
            ✕ Keluar
          </button>
        </Overlay>
      )}

      {/* Victory & End Match Celebration Screen */}
      {phase === 'ended' && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          {iWon && <Confetti />}

          <div className="card max-w-xs w-full p-6 text-center relative z-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
            {iWon ? (
              <div className="space-y-1">
                <div className="text-5xl animate-bounce">👑</div>
                <div className="text-4xl font-black text-amber-400 tracking-wider">
                  VICTORY
                </div>
              </div>
            ) : isDraw ? (
              <div className="space-y-1">
                <div className="text-5xl">🤝</div>
                <div className="text-4xl font-black text-yellow-300 tracking-wide">
                  SERI
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-5xl">👏</div>
                <div className="text-4xl font-black text-slate-200 tracking-wide">
                  DEFEAT
                </div>
              </div>
            )}

            <div className="text-xs opacity-70 mt-1 mb-3 font-medium">
              {result.reason}
            </div>

            {/* Comparative Scorecard */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-black/20 mb-4">
              <div className={`p-2 rounded-xl ${iWon ? 'badge' : 'chip'}`}>
                <div className="text-[10px] opacity-75 font-semibold">Kamu</div>
                <div className="text-2xl font-black tabular-nums">{g.score}</div>
              </div>
              <div className={`p-2 rounded-xl ${!iWon && !isDraw ? 'badge' : 'chip'}`}>
                <div className="text-[10px] opacity-75 font-semibold truncate">{battle.oppName}</div>
                <div className="text-2xl font-black tabular-nums">{opp?.score ?? 0}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {battle.isHost ? (
                <button
                  type="button"
                  className="btn-warm w-full py-2.5 text-sm font-bold shadow-md"
                  onClick={() => net.emit('start_match')}
                >
                  🔄 Main Lagi
                </button>
              ) : (
                <div className="text-xs opacity-70 py-1 text-center font-medium">
                  Menunggu host…
                </div>
              )}
              <button
                type="button"
                className="btn-soft w-full py-2 text-xs font-bold"
                onClick={onExit}
              >
                Kembali ke Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Overlay = ({ children }) => (
  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm text-center rounded-3xl p-4 animate-in fade-in duration-150">
    <div className="card px-6 py-6 max-w-sm w-full shadow-2xl border border-white/10" style={{ background: 'var(--surface)' }}>{children}</div>
  </div>
);
