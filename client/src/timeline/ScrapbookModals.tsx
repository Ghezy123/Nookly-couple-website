import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { LetterElement, PhotoElement, LinkElement } from './scrapbookTypes';
import { THEMES } from './scrapbookRenderer';
import type { SharedMediaItem } from './scrapbookMediaService';

interface LetterModalProps {
  letter: LetterElement | null;
  onClose: () => void;
}

export function LetterModal({ letter, onClose }: LetterModalProps) {
  if (!letter) return null;
  const th = THEMES[letter.theme || 'rose'] || THEMES.rose;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20"
          style={{ background: th.bg, color: th.ink }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 transition"
            aria-label="Tutup surat"
          >
            <X size={20} />
          </button>

          <div className="text-sm font-bold tracking-wider uppercase mb-1" style={{ color: th.accent }}>
            {letter.label || 'A little note for you'}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            {letter.title || 'Tentang Kita'}
          </h2>
          <div className="text-xs font-semibold opacity-70 mb-5">
            Dari {letter.from || 'Aku'} → {letter.to || 'Kamu'}
            {letter.date ? ` · ${letter.date}` : ''}
          </div>

          <div className="whitespace-pre-wrap leading-relaxed text-base opacity-90 font-medium max-h-[60vh] overflow-y-auto pr-2">
            {letter.body || '(Surat ini masih kosong...)'}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface PhotoLightboxProps {
  photo: PhotoElement | null;
  blobs: Record<string, string>;
  onClose: () => void;
}

export function PhotoLightboxModal({ photo, blobs, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = React.useState(0);
  if (!photo) return null;
  const imgs = photo.photos.map((id) => blobs[id] || id).filter(Boolean);
  if (!imgs.length) return null;

  const curImg = imgs[index % imgs.length];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition z-10"
          aria-label="Tutup foto"
        >
          <X size={24} />
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-4xl max-h-[75vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={curImg}
            alt={photo.caption || 'Foto Scrapbook'}
            className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain"
          />

          {imgs.length > 1 && (
            <>
              <button
                onClick={() => setIndex((i) => (i - 1 + imgs.length) % imgs.length)}
                className="absolute left-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setIndex((i) => (i + 1) % imgs.length)}
                className="absolute right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </motion.div>

        {(photo.caption || photo.date) && (
          <div className="mt-4 text-center text-white" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-lg">{photo.caption}</p>
            {photo.date && <p className="text-xs text-white/70">{photo.date}</p>}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}

interface LinkModalProps {
  link: LinkElement | null;
  blobs: Record<string, string>;
  onClose: () => void;
}

export function LinkPreviewModal({ link, blobs, onClose }: LinkModalProps) {
  if (!link) return null;
  const th = THEMES[link.theme || 'sky'] || THEMES.sky;
  const thumb = link.thumbBlobId ? blobs[link.thumbBlobId] || link.thumbBlobId : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative max-w-md w-full rounded-3xl p-6 shadow-2xl border border-white/20 text-center"
          style={{ background: th.bg, color: th.ink }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 transition"
          >
            <X size={20} />
          </button>

          {thumb && (
            <img src={thumb} alt="" className="w-24 h-24 object-cover rounded-2xl mx-auto mb-4 shadow" />
          )}

          <h3 className="font-display text-xl font-bold mb-1">{link.title || 'Tautan'}</h3>
          {link.subtitle && <p className="text-sm opacity-80 mb-4">{link.subtitle}</p>}

          <p className="text-xs font-mono break-all opacity-60 mb-5 px-3 py-1.5 rounded-xl bg-black/5">
            {link.url || 'Tidak ada URL'}
          </p>

          {link.url && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-warm inline-flex items-center gap-2"
            >
              Buka Tautan <ExternalLink size={16} />
            </a>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface MediaPickerProps {
  open: boolean;
  items: SharedMediaItem[];
  onSelect: (item: SharedMediaItem) => void;
  onUploadNew?: (file: File) => void;
  onClose: () => void;
}

export function SharedMediaPickerModal({ open, items, onSelect, onUploadNew, onClose }: MediaPickerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [sourceFilter, setSourceFilter] = React.useState<'all' | 'linimasa' | 'scrapbook'>('all');

  // Reset filter setiap kali modal dibuka
  React.useEffect(() => { if (open) setSourceFilter('all'); }, [open]);

  if (!open) return null;

  const filtered = sourceFilter === 'all' ? items : items.filter((it) => it.source === sourceFilter);
  const countLinimasa = items.filter((it) => it.source === 'linimasa').length;
  const countScrapbook = items.filter((it) => it.source === 'scrapbook').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col rounded-3xl border border-[var(--border)]"
          style={{ backgroundColor: 'var(--surface, #ffffff)', color: 'var(--fg, #1a1a1a)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
            <div>
              <h3 className="font-display text-xl font-bold">Pustaka Foto Kami</h3>
              <p className="text-xs opacity-70">
                {items.length} foto · {countLinimasa} dari Linimasa · {countScrapbook} dari Scrapbook
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-chip transition">
              <X size={20} />
            </button>
          </div>

          {/* Source filter tabs */}
          <div className="flex gap-1 p-1 bg-chip rounded-2xl mb-3 shrink-0">
            {([
              { id: 'all', label: `Semua (${items.length})` },
              { id: 'linimasa', label: `📅 Linimasa (${countLinimasa})` },
              { id: 'scrapbook', label: `📖 Scrapbook (${countScrapbook})` },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setSourceFilter(t.id)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
                  sourceFilter === t.id
                    ? 'bg-[var(--surface)] text-accent shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mb-3 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-warm w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              📁 Unggah Foto Baru dari Perangkat
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && onUploadNew) {
                  onUploadNew(f);
                  onClose();
                }
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
            {filtered.length === 0 ? (
              <div className="col-span-full py-10 text-center opacity-60 text-xs">
                {items.length === 0
                  ? 'Belum ada foto tersimpan. Klik tombol di atas untuk mengunggah foto baru!'
                  : 'Tidak ada foto dari sumber ini.'}
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-[var(--border)] bg-chip hover:scale-[1.02] active:scale-95 transition shadow-sm"
                >
                  <img src={item.url} alt={item.title || ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end text-left text-white">
                    <p className="text-xs font-bold truncate">{item.title || 'Foto Kenangan'}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] opacity-75">
                        {item.source === 'linimasa' ? '📅 Linimasa' : '📖 Scrapbook'}
                      </span>
                      {item.date && <span className="text-[10px] opacity-60">· {item.date}</span>}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-accent text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                    <Check size={12} />
                  </div>
                  {/* Source badge always visible */}
                  <div
                    className="absolute bottom-0 left-0 right-0 py-1 px-2 text-[9px] font-bold text-white truncate"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
                  >
                    {item.title || 'Foto'}
                    <span className="ml-1 opacity-70">· {item.source === 'linimasa' ? 'Linimasa' : 'Scrapbook'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
