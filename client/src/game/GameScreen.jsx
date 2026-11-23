import { useEffect, useRef, useState } from 'react';
import { N, COLORS, emptyGrid, genHand, fits, canFitAny, linesFor, applyMove, scoreMove, addJunk, mulberry32 } from './engine.js';
import * as sfx from './audio.js';

const LABELS = ['', 'GREAT!', 'AMAZING!', 'UNBELIEVABLE!'];
const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.ceil((ms % 60000) / 1000) % 60).padStart(2, '0')}`;
const col = (v) => COLORS[v - 1];

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
  const [g, setG] = useState(() => { const grid = emptyGrid(); return { grid, hand: genHand(grid, mulberry32(seed >>> 0)), score: 0, streak: 0, miss: 0, round: 0, over: false }; });
  const gr = useRef(g); gr.current = g;
  const [phase, setPhase] = useState(battle ? 'count' : 'play');
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(battle?.duration || 0);
  const [opp, setOpp] = useState(null);
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
  const [best, setBest] = useState(() => { try { return +localStorage.getItem('bb-best') || 0; } catch { return 0; } });
  const shown = useCount(g.score);

  const emit = (st, lines = 0) => net?.emit('state', { grid: st.grid, score: st.score, streak: st.streak, lines });

  // countdown 3-2-1 (battle)
  useEffect(() => {
    if (!battle) return;
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
    const end = performance.now() + battle.duration;
    const t = setInterval(() => setLeft(Math.max(0, end - performance.now())), 200);
    return () => clearInterval(t);
  }, [phase]); // eslint-disable-line

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
    const onEnd = (d) => {
      setResult(d); setPhase('ended');
      if (d.winnerId === net.id) sfx.win(); else sfx.lose();
    };
    net.on('opp_state', onOpp); net.on('attack', onAttack); net.on('match_end', onEnd);
    return () => { net.off('opp_state', onOpp); net.off('attack', onAttack); net.off('match_end', onEnd); };
  }, []); // eslint-disable-line

  const anchor = (s, x, y, lift) => {
    const rect = boardRef.current.getBoundingClientRect(); const cs = rect.width / N;
    return { r: Math.round((y - lift - s.h * cs / 2 - rect.top) / cs), c: Math.round((x - s.w * cs / 2 - rect.left) / cs) };
  };

  const place = (i, r, c) => {
    const p = gr.current;
    if (p.over || phaseRef.current !== 'play') return false;
    const s = p.hand[i];
    if (!s || !fits(p.grid, s, r, c)) return false;
    const res = applyMove(p.grid, s, r, c);
    const sc = scoreMove(s.cells, res.lines, p.streak, p.miss);
    let hand = p.hand.map((h, k) => (k === i ? null : h)); let round = p.round;
    if (hand.every((h) => !h)) { round += 1; hand = genHand(res.grid, mulberry32(((seed >>> 0) + round * 7919) >>> 0)); }
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
  const restart = () => { setG(() => { const grid = emptyGrid(); return { grid, hand: genHand(grid, mulberry32((Math.random() * 2 ** 31) >>> 0)), score: 0, streak: 0, miss: 0, round: 0, over: false }; }); };
  const iWon = result?.winnerId === net?.id;

  return (
    <div className="min-h-full flex flex-col items-center px-3 py-3 select-none">
      <div className="w-full max-w-4xl flex items-center justify-between mb-2">
        <button className="btn-soft" onClick={leave}>✕ Keluar</button>
        <div className="text-2xl font-bold tabular-nums">
          {battle ? (
            battle.duration ? fmt(left) : 'Survival'
          ) : (
            <button
              type="button"
              className="hover:opacity-75 transition cursor-pointer"
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
        <div className="w-20" />
      </div>
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-4 items-center lg:items-start justify-center">
        <div className={shake ? 'shake' : ''} style={{ width: 'min(92vw, 500px)' }}>
          <div className="flex items-end justify-between px-1 mb-2">
            <div>
              <div className="text-sm opacity-70">Skor</div>
              <div className="text-5xl font-bold tabular-nums leading-none">{shown}</div>
            </div>
            {g.streak >= 2 && <div className="text-xl font-bold px-3 py-1 rounded-xl badge">Combo x{g.streak}</div>}
          </div>
          <div className="relative" onPointerMove={(e) => setPt({ x: e.clientX, y: e.clientY })} onPointerLeave={() => setPt(null)}
            onClick={(e) => { if (sel != null && g.hand[sel] && boardRef.current) { const a = anchor(g.hand[sel], e.clientX, e.clientY, 0); if (!place(sel, a.r, a.c)) sfx.nope(); } }}>
            <Board grid={g.grid} ghost={ghost} hl={hl} hlColor={hlColor} gridRef={boardRef} />
            <div className="absolute inset-2 pointer-events-none overflow-visible">
              {fx.map((q) => <div key={q.id} className="particle" style={{ left: `${q.x}%`, top: `${q.y}%`, background: q.color, '--dx': `${q.dx}px`, '--dy': `${q.dy}px` }} />)}
              {pops.map((q) => (
                <div key={q.id} className="rise">
                  {q.text && <div className="text-4xl font-bold text-yellow-300">{q.text}</div>}
                  {q.streak >= 2 && <div className="text-2xl font-bold text-yellow-200">Combo x{q.streak}</div>}
                  <div className="text-2xl font-bold">{q.sub}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex mt-4 panel">
            {g.hand.map((s, i) => (
              <div key={i} className={`flex-1 h-28 flex items-center justify-center rounded-xl m-1 ${sel === i ? 'ring-2 ring-[var(--accent)]' : ''}`}
                style={{ touchAction: 'none', cursor: s ? 'grab' : 'default' }} onPointerDown={(e) => down(e, i)}>
                {s && <div style={{ opacity: drag?.moved && drag.i === i ? 0.25 : 1 }}><PieceView s={s} px={22} /></div>}
              </div>
            ))}
          </div>
          <p className="text-center text-xs opacity-60 mt-2">Seret balok ke papan, atau klik balok lalu klik papan.</p>
        </div>

        {battle && (
          <div className="card p-3 lg:order-2" style={{ width: 'min(60vw, 260px)' }}>
            <div className="flex justify-between items-baseline mb-1">
              <div className="font-semibold truncate">{battle.oppName}</div>
              <div className="text-xl font-bold tabular-nums">{opp?.score ?? 0}</div>
            </div>
            <Board mini grid={opp?.grid ?? emptyGrid()} />
            <div className="h-7 mt-1 flex gap-2 text-sm">
              {opp?.streak >= 2 && <span className="px-2 rounded badge font-bold">Combo x{opp.streak}</span>}
              {opp?.lines > 0 && <span className="px-2 rounded chip">Hancur {opp.lines} garis</span>}
            </div>
            {battle.garbage && <div className="text-xs opacity-60">Battle Garbage aktif: 3+ garis / combo mengirim blok batu.</div>}
          </div>
        )}
      </div>

      {drag?.moved && boardRef.current && g.hand[drag.i] && (() => {
        const s = g.hand[drag.i]; const cs = boardRef.current.getBoundingClientRect().width / N;
        return <div style={{ position: 'fixed', left: drag.x - s.w * cs / 2, top: drag.y - drag.lift - s.h * cs / 2, pointerEvents: 'none', zIndex: 50 }}><PieceView s={s} px={cs} /></div>;
      })()}

      {phase === 'count' && <Overlay><div className="text-9xl font-bold">{count}</div></Overlay>}
      {!battle && g.over && (
        <Overlay>
          <div className="text-4xl font-bold mb-1">Game Over</div>
          <div className="mb-4">Skor {g.score}</div>
          <div className="flex gap-2 justify-center"><button className="btn-warm" onClick={restart}>Main lagi</button><button className="btn-soft" onClick={onExit}>Menu</button></div>
        </Overlay>
      )}
      {battle && g.over && phase !== 'ended' && <Overlay><div className="text-3xl font-bold">Game Over</div></Overlay>}
      {phase === 'ended' && result && (
        <Overlay>
          <div className={`text-5xl font-bold mb-1 ${result.winnerId == null ? '' : iWon ? 'text-accent' : 'opacity-80'}`}>
            {result.winnerId == null ? 'SERI' : iWon ? 'MENANG!' : 'KALAH'}
          </div>
          <div className="mb-1 opacity-80">{result.reason}</div>
          <div className="mb-4">Skor kamu {g.score} · {battle.oppName} {opp?.score ?? 0}</div>
          <div className="flex gap-2 justify-center">
            {battle.isHost ? <button className="btn-warm" onClick={() => net.emit('start_match')}>Rematch</button> : <span className="px-2 py-2 opacity-70">Menunggu host…</span>}
            <button className="btn-soft" onClick={onExit}>Kembali ke lobby</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

const Overlay = ({ children }) => (
  <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 text-center rounded-3xl">
    <div className="card px-8 py-6" style={{ background: 'var(--surface)' }}>{children}</div>
  </div>
);
