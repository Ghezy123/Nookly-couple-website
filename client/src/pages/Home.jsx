import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Images, MessageCircleHeart } from 'lucide-react';
import DuoMoodWidget from '../components/DuoMoodWidget.jsx';
import InviteCard from '../shell/InviteCard.jsx';

const greet = () => { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam'; };
const SHORTCUTS = [
  ['stories', 'Cerita', 'Curhat atau bagikan unek-unek', MessageCircleHeart],
  ['memories', 'Kenangan', 'Simpan momen kecil berdua', Images],
  ['game', 'Main bareng', 'Battle blok 1v1 atau solo', Gamepad2],
];
const TIPS = [
  'Ganti mood-mu di sini, karakter kalian akan saling bereaksi.',
  'Cerita dan kenangan baru default-nya Keep Private. Bagikan kapan pun kamu siap.',
  'Warna latar bisa diganti lewat tombol roda gigi di pojok kanan atas.',
];

export default function Home({ info, onChangeMood, go }) {
  const [tips, setTips] = useState(() => { try { return localStorage.getItem('hub-tips-hidden') !== '1'; } catch { return true; } });
  const hideTips = () => { setTips(false); try { localStorage.setItem('hub-tips-hidden', '1'); } catch { /* ignore */ } };
  return (
    <div className="max-w-2xl mx-auto p-4 pb-8 space-y-4">
      <div>
        <h2 className="font-display text-3xl font-bold">{greet()}, {info.user.name}!</h2>
        <p className="opacity-70">Mau ngapain bareng hari ini?</p>
      </div>
      <InviteCard info={info} />
      <DuoMoodWidget me={info.user} partner={info.partner} onChangeMood={onChangeMood} />
      <div className="grid sm:grid-cols-3 gap-3">
        {SHORTCUTS.map(([k, title, cap, Icon], i) => (
          <motion.button key={k} className="card p-4 text-left" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} whileHover={{ y: -4 }} whileTap={{ scale: 0.96 }} onClick={() => go(k)}>
            <span className="inline-flex w-11 h-11 rounded-2xl items-center justify-center text-accent" style={{ background: 'var(--accent-soft)' }}><Icon size={22} /></span>
            <div className="font-display text-lg font-semibold mt-2">{title}</div>
            <div className="text-sm opacity-70">{cap}</div>
          </motion.button>
        ))}
      </div>
      {tips && (
        <div className="card p-4">
          <div className="font-display font-semibold mb-1">Tips singkat</div>
          <ul className="text-sm space-y-1 opacity-85 list-disc pl-5">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
          <button className="btn-soft mt-3" onClick={hideTips}>Oke, paham</button>
        </div>)}
    </div>
  );
}
