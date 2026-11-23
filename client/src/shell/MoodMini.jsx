import { motion } from 'framer-motion';
import AnimatedMoodAvatar from '../components/AnimatedMoodAvatar.jsx';

// Dua karakter kecil di header: selalu terlihat di semua tab. Klik untuk ke Beranda.
export default function MoodMini({ me, partner, onClick }) {
  return (
    <button className="flex items-center -space-x-1" onClick={onClick} aria-label="Mood kalian berdua (buka Beranda)">
      <AnimatedMoodAvatar mood={me.mood || 'chill'} tone="peach" size={38} />
      <motion.span className="text-accent text-lg z-10 -mx-1" animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} aria-hidden>♥</motion.span>
      <AnimatedMoodAvatar mood={partner?.mood || 'chill'} tone="lilac" size={38} />
    </button>
  );
}
