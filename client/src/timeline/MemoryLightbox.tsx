import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props { images: string[]; index: number | null; title: string; onIndex: (i: number) => void; onClose: () => void }

export default function MemoryLightbox({ images, index, title, onIndex, onClose }: Props) {
  const open = index !== null;
  const go = useCallback((d: number) => { if (index !== null) onIndex((index + d + images.length) % images.length); }, [index, images.length, onIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [open, go, onClose]);

  return (
    <AnimatePresence>
      {open && index !== null && (
        <motion.div className="fixed inset-0 z-[60] flex flex-col bg-black/90" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label={`Galeri foto: ${title}`} onClick={onClose}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="font-display font-semibold truncate pr-4">{title}</div>
            <div className="flex items-center gap-3"><span className="text-sm opacity-80">{index + 1} / {images.length}</span>
              <button className="rounded-full p-2 bg-white/15 hover:bg-white/25" aria-label="Tutup galeri" onClick={onClose}><X size={20} /></button></div>
          </div>
          <div className="relative flex-1 flex items-center justify-center min-h-0 px-2">
            {images.length > 1 && <button className="absolute left-2 z-10 rounded-full p-3 bg-white/15 hover:bg-white/25 text-white" aria-label="Foto sebelumnya" onClick={(e) => { e.stopPropagation(); go(-1); }}><ChevronLeft /></button>}
            <AnimatePresence mode="wait" initial={false}>
              <motion.img key={index} src={images[index]} alt={`${title} - foto ${index + 1}`} className="max-h-full max-w-full object-contain rounded-xl select-none"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
                drag={images.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
                onDragEnd={(_, info) => { if (info.offset.x < -80) go(1); else if (info.offset.x > 80) go(-1); }} onClick={(e) => e.stopPropagation()} />
            </AnimatePresence>
            {images.length > 1 && <button className="absolute right-2 z-10 rounded-full p-3 bg-white/15 hover:bg-white/25 text-white" aria-label="Foto berikutnya" onClick={(e) => { e.stopPropagation(); go(1); }}><ChevronRight /></button>}
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-2 p-4 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => <button key={i} aria-label={`Lihat foto ${i + 1}`} onClick={() => onIndex(i)} className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden ring-2 transition ${i === index ? 'ring-[var(--accent)]' : 'ring-transparent opacity-60'}`}><img src={src} alt="" className="w-full h-full object-cover" /></button>)}
            </div>)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
