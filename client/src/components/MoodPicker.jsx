import { motion } from 'framer-motion';
import AnimatedMoodAvatar from './AnimatedMoodAvatar.jsx';
import { MOODS, MOOD_ORDER } from '../moods.js';

export default function MoodPicker({ value, onChange, tone = 'peach', size = 44, allowClear = false, label = true }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pilih mood">
      {MOOD_ORDER.map((m) => {
        const on = value === m;
        return (
          <motion.button key={m} type="button" role="radio" aria-checked={on} whileTap={{ scale: 0.9 }} whileHover={{ y: -2 }}
            onClick={() => onChange(allowClear && on ? null : m)}
            className="flex flex-col items-center rounded-2xl px-2 pt-1.5 pb-1 transition"
            style={{ background: on ? `${MOODS[m].color}33` : 'transparent', boxShadow: on ? `inset 0 0 0 2px ${MOODS[m].color}` : 'inset 0 0 0 1px var(--border)' }}>
            <AnimatedMoodAvatar mood={m} tone={tone} size={size} still={!on} />
            {label && <span className="text-xs font-bold mt-0.5">{MOODS[m].label}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
