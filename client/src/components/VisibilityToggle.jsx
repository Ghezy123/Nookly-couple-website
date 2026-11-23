import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Share2 } from 'lucide-react';

// Saklar Keep Private <-> Bagikan
export default function VisibilityToggle({ value, onChange, id = 'vis' }) {
  const opts = [['private', 'Keep Private', Lock, 'var(--accent2)'], ['shared', 'Bagikan', Share2, 'var(--accent)']];
  return (
    <div className="relative inline-flex rounded-full p-1 bg-chip" role="radiogroup" aria-label="Visibilitas cerita">
      {opts.map(([k, label, Icon, color]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => value !== k && onChange(k)}
          className="relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors" style={{ color: value === k ? '#fff' : 'inherit' }}>
          {value === k && <motion.span layoutId={`pill-${id}`} className="absolute inset-0 rounded-full -z-10" style={{ background: color }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={value === k ? 'on' : 'off'} initial={{ rotate: -30, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} exit={{ scale: 0.6 }} transition={{ duration: 0.15 }}><Icon size={15} /></motion.span>
          </AnimatePresence>
          {label}
        </button>
      ))}
    </div>
  );
}
