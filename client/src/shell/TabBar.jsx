import { motion } from 'framer-motion';
import { Gamepad2, Home, Images, MessageCircleHeart } from 'lucide-react';

export const TABS = [['home', 'Beranda', Home], ['stories', 'Cerita', MessageCircleHeart], ['memories', 'Kenangan', Images], ['game', 'Main', Gamepad2]];

export default function TabBar({ tab, onTab }) {
  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 card !rounded-full !p-1.5 flex gap-1 shadow-xl" aria-label="Menu utama">
      {TABS.map(([k, label, Icon]) => {
        const on = tab === k;
        return (
          <button key={k} onClick={() => onTab(k)} aria-label={label} aria-current={on ? 'page' : undefined} className="relative rounded-full px-3.5 py-2 font-bold text-sm">
            {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 420, damping: 30 }} />}
            <motion.span className="relative flex items-center gap-1.5" style={{ color: on ? '#fff' : undefined }} animate={on ? { y: [0, -4, 0] } : { y: 0 }} transition={{ duration: 0.35 }}>
              <Icon size={19} /><span className={on ? '' : 'hidden sm:inline'}>{label}</span>
            </motion.span>
          </button>
        );
      })}
    </nav>
  );
}
