import { motion, useReducedMotion } from 'framer-motion';

export const TONES = {
  peach: { body: '#ffb199', shade: '#f4957c', ear: '#ff9f86' },
  lilac: { body: '#cdbcff', shade: '#ab97f2', ear: '#b9a5fb' },
};
const INK = '#4a3340', MOUTH = '#8a3548';
const HEART = 'M0 5 C-9 -2 -7 -9 0 -4 C7 -9 9 -2 0 5Z';
const STAR = 'M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6Z';
const C = { transformBox: 'fill-box', transformOrigin: 'center' };
const stroke = { fill: 'none', stroke: INK, strokeWidth: 3.2, strokeLinecap: 'round' };

const lp = (st, animate, transition = {}) => (st ? {} : { animate, transition: { repeat: Infinity, ease: 'easeInOut', ...transition } });

const Eye = ({ x, y = 62, r = 6.5, st, delay = 0 }) => (
  <motion.g style={C} {...lp(st, { scaleY: [1, 1, 1, 0.1, 1] }, { duration: 4, times: [0, 0.85, 0.9, 0.94, 1], delay })}>
    <circle cx={x} cy={y} r={r} fill={INK} />
    <circle cx={x + 2.2} cy={y - 2.4} r={2.3} fill="#fff" />
  </motion.g>
);
const Cheeks = ({ st, puff, strong }) => (
  <>
    {[35, 85].map((x) => puff
      ? <motion.circle key={x} cx={x} cy={74} r={9} fill="#ff8a80" opacity={0.8} style={C} {...lp(st, { scale: [1, 1.2, 1] }, { duration: 0.9 })} />
      : <ellipse key={x} cx={x} cy={75} rx={7} ry={4.5} fill="#ff8fa3" opacity={strong ? 0.85 : 0.5} />)}
  </>
);
// Partikel yang naik & memudar (hati, uap, zzz, tetes)
const Rise = ({ st, x, y, dx = 0, dy = -34, delay = 0, dur = 2.4, children }) => st ? null : (
  <motion.g initial={{ x, y, opacity: 0, scale: 0.4 }} animate={{ x: [x, x + dx], y: [y, y + dy], opacity: [0, 1, 0], scale: [0.4, 1, 0.8] }}
    transition={{ repeat: Infinity, duration: dur, delay, ease: 'easeOut' }}>{children}</motion.g>
);
const Twinkle = ({ st, x, y, delay = 0 }) => st ? null : (
  <g transform={`translate(${x} ${y})`}><motion.path d={STAR} fill="#ffd166" style={C} animate={{ scale: [0, 1, 0], rotate: [0, 90, 180] }} transition={{ repeat: Infinity, duration: 1.6, delay }} /></g>
);
const heart = (fill = '#ff6b8b') => <path d={HEART} fill={fill} />;

const BODY = {
  happy: (st) => lp(st, { y: [0, -16, 0], scaleY: [0.94, 1.04, 0.94], scaleX: [1.04, 0.98, 1.04] }, { duration: 0.8 }),
  sad: (st) => lp(st, { y: [2, 6, 2], rotate: [-2, 2, -2], scaleY: [0.98, 0.94, 0.98] }, { duration: 3.2 }),
  angry: (st) => lp(st, { x: [0, -1.6, 1.6, -1, 0] }, { duration: 0.4, ease: 'linear' }),
  sleepy: (st) => lp(st, { rotate: [0, 7, 0], y: [0, 3, 0] }, { duration: 4 }),
  love: (st) => lp(st, { scale: [1, 1.04, 1], rotate: [-2, 2, -2] }, { duration: 2.4 }),
  chill: (st) => lp(st, { scaleY: [1, 1.03, 1] }, { duration: 3 }),
};

function Face({ mood, st }) {
  switch (mood) {
    case 'happy': return (<>
      <Eye x={46} st={st} /><Eye x={74} st={st} delay={0.05} />
      <path d="M49 74 Q60 90 71 74 Z" fill={MOUTH} /><ellipse cx={60} cy={83} rx={5} ry={3} fill="#ff8fa3" />
      <Cheeks st={st} /></>);
    case 'sad': return (<>
      <Eye x={46} y={64} r={5.8} st={st} /><Eye x={74} y={64} r={5.8} st={st} />
      <path d="M38 58 L52 53 M82 58 L68 53" {...stroke} strokeWidth={2.6} />
      <path d="M52 82 Q60 74 68 82" {...stroke} />
      <Rise st={st} x={42} y={70} dy={22} dur={1.8}><path d="M0 -5 C4 0 4 4 0 4 C-4 4 -4 0 0 -5Z" fill="#8ec9ff" /></Rise>
      <Rise st={st} x={78} y={70} dy={22} dur={1.8} delay={0.9}><path d="M0 -5 C4 0 4 4 0 4 C-4 4 -4 0 0 -5Z" fill="#8ec9ff" /></Rise>
      <Cheeks st={st} /></>);
    case 'angry': return (<>
      <ellipse cx={60} cy={66} rx={40} ry={36} fill="#ff5a4f" opacity={0.16} />
      <Eye x={46} y={63} r={5.4} st={st} /><Eye x={74} y={63} r={5.4} st={st} />
      <path d="M37 52 L53 58 M83 52 L67 58" {...stroke} strokeWidth={3} />
      <path d="M52 82 Q56 78 60 82 Q64 86 68 82" {...stroke} />
      <Cheeks st={st} puff /></>);
    case 'sleepy': return (<>
      <path d="M40 63 Q46 69 52 63 M68 63 Q74 69 80 63" {...stroke} />
      <motion.ellipse cx={60} cy={80} rx={5} ry={6} fill={MOUTH} style={C} {...lp(st, { scale: [0.5, 1.15, 0.5] }, { duration: 4 })} />
      <Cheeks st={st} /></>);
    case 'love': return (<>
      {[46, 74].map((x) => (
        <g key={x} transform={`translate(${x} 62)`}>
          <motion.path d={HEART} fill="#ff4d79" style={C} {...lp(st, { scale: [1, 1.3, 1] }, { duration: 0.9 })} />
        </g>))}
      <path d="M53 76 Q60 83 67 76" {...stroke} /><Cheeks st={st} strong /></>);
    default: return (<>
      <Eye x={46} st={st} /><Eye x={74} st={st} delay={0.05} />
      <path d="M52 76 Q60 81 68 76" {...stroke} /><Cheeks st={st} /></>);
  }
}

function Extras({ mood, st }) {
  switch (mood) {
    case 'happy': return (<><Twinkle st={st} x={14} y={30} /><Twinkle st={st} x={106} y={26} delay={0.5} /><Twinkle st={st} x={104} y={62} delay={1} /></>);
    case 'sad': return (<>
      <motion.g {...lp(st, { x: [-3, 3, -3] }, { duration: 4 })}>
        <g fill="#b7c6e0"><circle cx={50} cy={14} r={7} /><circle cx={60} cy={9} r={9} /><circle cx={71} cy={14} r={7} /><rect x={50} y={14} width={21} height={7} rx={3} /></g>
      </motion.g>
      <Rise st={st} x={55} y={24} dy={12} dur={1.2}><ellipse rx={1.4} ry={2.6} fill="#8ec9ff" /></Rise>
      <Rise st={st} x={66} y={24} dy={12} dur={1.2} delay={0.6}><ellipse rx={1.4} ry={2.6} fill="#8ec9ff" /></Rise></>);
    case 'angry': return (<>
      <Rise st={st} x={20} y={42} dx={-6} dy={-30} dur={1.6}><circle r={6} fill="#fff" opacity={0.9} /></Rise>
      <Rise st={st} x={100} y={42} dx={6} dy={-30} dur={1.6} delay={0.8}><circle r={6} fill="#fff" opacity={0.9} /></Rise></>);
    case 'sleepy': return (<>
      {[[11, 0], [15, 1.1], [19, 2.2]].map(([fs, d]) => (
        <Rise key={fs} st={st} x={88} y={30} dx={14} dy={-24} dur={3.3} delay={d}><text fontSize={fs} fontWeight="800" fill="#8a7bd0">z</text></Rise>))}</>);
    case 'love': return (<>
      <Rise st={st} x={20} y={44} dx={-4} dy={-36} dur={2.6}>{heart()}</Rise>
      <Rise st={st} x={100} y={44} dx={5} dy={-36} dur={2.6} delay={0.8}>{heart('#ff9fb5')}</Rise>
      <Rise st={st} x={36} y={26} dx={-6} dy={-24} dur={2.6} delay={1.5}>{heart('#ff8aa5')}</Rise>
      <Rise st={st} x={84} y={24} dx={6} dy={-24} dur={2.6} delay={2}>{heart()}</Rise></>);
    default: return null;
  }
}

export default function AnimatedMoodAvatar({ mood = 'chill', tone = 'peach', size = 120, still = false, className = '' }) {
  const reduce = useReducedMotion();
  const st = still || reduce;
  const t = TONES[tone] || TONES.peach;
  const m = BODY[mood] ? mood : 'chill';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label={`Karakter dengan mood ${m}`} style={{ overflow: 'visible' }}>
      <motion.ellipse cx={60} cy={108} rx={28} ry={5} fill="#000" opacity={0.12} style={C} {...lp(st || m !== 'happy', { scaleX: [1, 0.8, 1] }, { duration: 0.8 })} />
      <motion.g style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }} {...BODY[m](st)}>
        <circle cx={30} cy={40} r={10} fill={t.ear} /><circle cx={90} cy={40} r={10} fill={t.ear} />
        <ellipse cx={42} cy={100} rx={11} ry={6} fill={t.shade} /><ellipse cx={78} cy={100} rx={11} ry={6} fill={t.shade} />
        <ellipse cx={21} cy={78} rx={7} ry={10} fill={t.shade} /><ellipse cx={99} cy={78} rx={7} ry={10} fill={t.shade} />
        <ellipse cx={60} cy={66} rx={40} ry={36} fill={t.body} />
        <ellipse cx={48} cy={48} rx={14} ry={7} fill="#fff" opacity={0.28} />
        <Face mood={m} st={st} />
      </motion.g>
      <Extras mood={m} st={st} />
    </svg>
  );
}
