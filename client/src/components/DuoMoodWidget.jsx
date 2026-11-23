import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import AnimatedMoodAvatar from './AnimatedMoodAvatar.jsx';
import MoodPicker from './MoodPicker.jsx';
import { MOODS, relation } from '../moods.js';

const HeartIcon = ({ size = 16, color = '#ff5f87' }) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20"><path d="M0 5 C-9 -2 -7 -9 0 -4 C7 -9 9 -2 0 5Z" fill={color} /></svg>
);
const PILL = { same: 'Same Vibe', sweet: 'Vibe Manis', together: 'Saling Temenin', hug: 'Pelukan', cheer: 'Semangat!' };

function Bridge({ rel, reduce }) {
  const { kind, giver, gesture } = rel;
  const glow = kind === 'same' || kind === 'sweet';
  const pill = kind === 'support' ? PILL[gesture] : PILL[kind];
  const fromLeft = giver === 'me';
  return (
    <div className="relative flex-1 h-24 min-w-[70px] self-center">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible"
        style={glow ? { filter: 'drop-shadow(0 0 6px rgba(255,120,120,.75))' } : undefined} aria-hidden>
        <defs><linearGradient id="bridgeGrad" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#ffb199" /><stop offset=".5" stopColor="#ff6f91" /><stop offset="1" stopColor="#cdbcff" /></linearGradient></defs>
        <motion.path d="M2 40 Q50 4 98 40" fill="none" stroke={kind === 'idle' ? '#cdbcb5' : 'url(#bridgeGrad)'} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke"
          strokeDasharray={glow ? undefined : '1 10'}
          animate={reduce ? undefined : glow ? { opacity: [0.65, 1, 0.65] } : { strokeDashoffset: fromLeft || kind !== 'support' ? [0, -22] : [0, 22] }}
          transition={{ repeat: Infinity, duration: glow ? 1.6 : 1.1, ease: glow ? 'easeInOut' : 'linear' }} />
      </svg>
      {pill && kind !== 'idle' && (
        <motion.div key={pill} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: reduce ? 1 : [1, 1.08, 1], opacity: 1 }} transition={{ repeat: reduce ? 0 : Infinity, duration: 1.8 }}
          className="absolute left-1/2 -translate-x-1/2 -top-2 whitespace-nowrap text-[11px] font-extrabold rounded-full px-2.5 py-0.5 text-white bg-accent shadow">{pill}</motion.div>)}
      {!reduce && kind === 'support' && [0, 0.75, 1.5].map((d) => (
        <motion.div key={d} className="absolute" style={{ x: '-50%', y: '-50%' }} initial={{ opacity: 0 }}
          animate={{ left: fromLeft ? ['4%', '96%'] : ['96%', '4%'], top: ['67%', '37%', '67%'], opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2.3, delay: d, ease: 'easeInOut', times: [0, 0.5, 1] }}><HeartIcon size={18} /></motion.div>))}
      {!reduce && gesture === 'hug' && (
        <motion.div className="absolute left-1/2 top-[40%]" style={{ x: '-50%', y: '-50%' }} animate={{ scale: [0.6, 1.4, 0.6], rotate: [-8, 8, -8] }} transition={{ repeat: Infinity, duration: 1.4 }}><HeartIcon size={30} /></motion.div>)}
      {!reduce && (kind === 'same' || kind === 'sweet') && [18, 38, 62, 82].map((l, i) => (
        <motion.span key={l} className="absolute text-accent text-lg leading-none" style={{ left: `${l}%`, top: `${i % 2 ? 62 : 28}%` }} animate={{ scale: [0, 1.1, 0], rotate: [0, 120, 240] }} transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.4 }}>✦</motion.span>))}
      {!reduce && kind === 'together' && <motion.div className="absolute left-1/2 top-[38%]" style={{ x: '-50%', y: '-50%' }} animate={{ scale: [0.8, 1.15, 0.8] }} transition={{ repeat: Infinity, duration: 2 }}><HeartIcon size={20} color="#b9a5fb" /></motion.div>}
    </div>
  );
}

function lean(who, rel, reduce) {
  if (reduce) return { animate: {} };
  const d = who === 'me' ? 1 : -1;
  const base = { repeat: Infinity, ease: 'easeInOut' };
  switch (rel.kind) {
    case 'same': return { animate: { x: [0, 8 * d, 0], rotate: [0, 4 * d, 0] }, transition: { ...base, duration: 2.2 } };
    case 'together': return { animate: { x: [0, 8 * d, 0], rotate: [0, 3 * d, 0] }, transition: { ...base, duration: 2.6 } };
    case 'support': {
      const give = rel.giver === who;
      const dist = give ? 26 : rel.gesture === 'hug' ? 20 : 6;
      return { animate: { x: [0, dist * d, dist * d, 0], rotate: [0, (give ? 7 : 2) * d, (give ? 7 : 2) * d, 0] }, transition: { ...base, duration: 3.2, times: [0, 0.3, 0.7, 1] } };
    }
    default: return { animate: {} };
  }
}

export default function DuoMoodWidget({ me, partner, onChangeMood }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const mm = me.mood, pm = partner?.mood;
  const rel = mm && pm ? relation(mm, pm) : { kind: 'idle' };
  const pName = partner?.name || 'Pasangan';

  let caption = 'Menunggu mood kalian terhubung…';
  if (!partner) caption = 'Menunggu pasanganmu bergabung dengan kode undangan.';
  else if (rel.kind === 'same') caption = `Kalian lagi sama-sama ${MOODS[mm].label.toLowerCase()}.`;
  else if (rel.kind === 'support') {
    const [g, r] = rel.giver === 'me' ? ['Kamu', pName] : [pName, 'kamu'];
    caption = `${g} lagi ${rel.gesture === 'hug' ? 'meluk' : 'nyemangatin'} ${r}.`;
  } else if (rel.kind === 'together') caption = 'Sama-sama lagi berat. Saling temenin pelan-pelan ya.';
  else if (rel.kind === 'sweet') caption = 'Dua-duanya lagi hangat, manis banget.';
  else if (partner && !pm) caption = `${pName} belum mengisi mood.`;

  const Side = ({ who, name, mood, tone, dim }) => (
    <motion.div className="flex flex-col items-center w-[30%] max-w-[150px] min-w-[84px]" {...lean(who, rel, reduce)} style={{ opacity: dim ? 0.5 : 1 }}>
      <AnimatedMoodAvatar mood={mood || 'chill'} tone={tone} size="100%" still={!partner && who === 'partner'} />
      <div className="mt-1 text-center">
        <div className="font-display font-semibold truncate max-w-[110px]">{name}</div>
        <div className="text-xs font-bold rounded-full px-2 py-0.5 inline-block" style={{ background: mood ? `${MOODS[mood].color}33` : 'rgba(0,0,0,.06)' }}>{mood ? MOODS[mood].label : 'belum diisi'}</div>
      </div>
    </motion.div>
  );

  return (
    <section className="card overflow-visible" aria-label="Mood kalian berdua">
      <div className="flex items-end justify-between gap-1 pt-4 px-2">
        <Side who="me" name="Kamu" mood={mm} tone="peach" dim={!mm} />
        <Bridge rel={rel} reduce={reduce} />
        <Side who="partner" name={pName} mood={pm} tone="lilac" dim={!pm} />
      </div>
      <AnimatePresence mode="wait"><motion.p key={caption} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mt-3 font-semibold px-4">{caption}</motion.p></AnimatePresence>
      <div className="mt-3 pb-4 text-center">
        <button className="btn-soft" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Tutup' : 'Ganti mood-ku'}</button>
      </div>
      <AnimatePresence initial={false}>
        {open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="px-4 pb-5 flex justify-center"><MoodPicker value={mm} onChange={(m) => m && onChangeMood(m)} size={52} /></div>
        </motion.div>}
      </AnimatePresence>
    </section>
  );
}
