import { motion } from 'framer-motion';
import { Lock, Pencil, Trash2, Users } from 'lucide-react';
import { catOf } from './categories';
import { canDelete, canEdit, canToggleVisibility } from './permissions';
import type { Memory, UserId, UsersConfig } from './types';

interface Props {
  memory: Memory; me: UserId; users: UsersConfig; side: 'left' | 'right';
  onEdit: (m: Memory) => void; onDelete: (m: Memory) => void; onToggle: (m: Memory) => void; onOpenImage: (m: Memory, i: number) => void;
}
export const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

export default function TimelineCard({ memory: m, me, users, side, onEdit, onDelete, onToggle, onOpenImage }: Props) {
  const cat = catOf(m.category); const Icon = cat.icon;
  const author = users[m.createdBy]; const shared = m.visibility === 'shared';
  const thumbs = m.images.slice(0, 3); const extra = m.images.length - 3;

  return (
    <li className={`relative pl-12 md:pl-0 md:w-1/2 ${side === 'left' ? 'md:pr-10' : 'md:ml-auto md:pl-10'}`}>
      <span className={`absolute top-6 left-[9px] md:left-auto ${side === 'left' ? 'md:-right-[7px]' : 'md:-left-[7px]'} w-[15px] h-[15px] rounded-full border-[3px] border-[var(--bg-solid)]`} style={{ background: author.color }} aria-hidden />
      <motion.article layout initial={{ opacity: 0, y: 24, x: side === 'left' ? -16 : 16 }} whileInView={{ opacity: 1, y: 0, x: 0 }} viewport={{ once: true, margin: '-40px' }}
        exit={{ opacity: 0, scale: 0.94 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }} whileHover={{ y: -3 }}
        className={`card p-4 ${m.visibility === 'private' ? 'card-private' : ''}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold">{formatDate(m.eventDate)}</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: cat.color }}><Icon size={12} />{cat.label}</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white ml-auto" style={{ background: shared ? 'var(--accent)' : 'var(--accent2)' }}>
            {shared ? <Users size={12} /> : <Lock size={12} />}{shared ? 'Dibagikan' : 'Private'}</span>
        </div>
        <h3 className="font-display text-xl font-semibold mt-2 break-words">{m.title}</h3>
        {m.description && <p className="mt-1 opacity-85 whitespace-pre-wrap break-words leading-relaxed">{m.description}</p>}

        {m.images.length === 1 && (
          <button className="mt-3 block w-full rounded-2xl overflow-hidden aspect-[4/3]" aria-label="Buka foto" onClick={() => onOpenImage(m, 0)}>
            <img src={m.images[0]} alt={m.title} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition duration-500" /></button>)}
        {m.images.length > 1 && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {thumbs.map((src, i) => (
              <button key={i} className="relative aspect-square rounded-xl overflow-hidden" aria-label={`Buka foto ${i + 1}`} onClick={() => onOpenImage(m, i)}>
                <img src={src} alt={`${m.title} ${i + 1}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                {i === 2 && extra > 0 && <span className="absolute inset-0 bg-black/55 text-white font-bold text-xl flex items-center justify-center">+{extra}</span>}
              </button>))}
          </div>)}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-80">
            <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold" style={{ background: author.color }}>{author.name[0]}</span>
            Ditambahkan {m.createdBy === me ? 'oleh kamu' : `oleh ${author.name}`}</span>
          <div className="flex gap-1.5">
            {canToggleVisibility(m, me) && <button className="btn-soft !px-2.5 !py-1.5 text-sm" onClick={() => onToggle(m)}>{shared ? <><Lock size={14} />Jadikan private</> : <><Users size={14} />Bagikan</>}</button>}
            {canEdit(m, me) && <button className="btn-soft !px-2.5 !py-1.5" aria-label="Edit momen" onClick={() => onEdit(m)}><Pencil size={14} /></button>}
            {canDelete(m, me) && <button className="btn-soft !px-2.5 !py-1.5" aria-label="Hapus momen" onClick={() => onDelete(m)}><Trash2 size={14} /></button>}
          </div>
        </div>
      </motion.article>
    </li>
  );
}
