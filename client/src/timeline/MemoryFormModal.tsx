import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ImagePlus, Lock, Save, Share2, X } from 'lucide-react';
import { CATEGORIES } from './categories';
import { compressImage, MAX_PHOTOS } from './imageUtils';
import type { Category, Memory, MemoryInput, Visibility } from './types';

interface Props { initial: Memory | null; onClose: () => void; onSubmit: (input: MemoryInput) => Promise<boolean> }
const today = () => new Date().toISOString().slice(0, 10);

export default function MemoryFormModal({ initial, onClose, onSubmit }: Props) {
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? today());
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'other');
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'private');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);

  const addFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    const room = MAX_PHOTOS - images.length;
    if (!files.length) return;
    setErr(''); setSkippedFiles([]); setBusy(true);
    const added: string[] = [];
    const failed: string[] = [];
    for (const f of files.slice(0, Math.max(room, 0))) {
      try { added.push(await compressImage(f)); } catch { failed.push(f.name); }
    }
    if (files.length > room) setErr(`Maksimal ${MAX_PHOTOS} foto per momen.`);
    setImages((p) => [...p, ...added]);
    setBusy(false);
    if (failed.length) setSkippedFiles(failed);
  };

  const valid = title.trim().length > 0 && eventDate.length === 10;
  const submit = async () => {
    if (!valid || busy || saving) return;
    setSaving(true);
    const ok = await onSubmit({ eventDate, title: title.trim(), description: description.trim(), category, images, visibility });
    setSaving(false);
    if (ok) onClose(); else setErr('Gagal menyimpan. Penyimpanan mungkin penuh; coba kurangi foto.');
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label={initial ? 'Edit momen' : 'Tambah momen'} onMouseDown={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="card !bg-[var(--surface)] w-full sm:max-w-xl max-h-[92vh] overflow-y-auto p-5 space-y-4 rounded-b-none sm:rounded-b-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{initial ? 'Edit momen' : 'Momen baru'}</h2>
          <button className="btn-soft !p-2" aria-label="Tutup" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="grid sm:grid-cols-[170px_1fr] gap-3">
          <label className="block"><span className="text-sm font-bold opacity-70">Tanggal kejadian</span>
            <input type="date" className="field mt-1" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-bold opacity-70">Judul momen</span>
            <input className="field mt-1" autoFocus maxLength={80} placeholder="Mis. Nonton bareng sampai ketiduran" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        </div>
        <label className="block"><span className="text-sm font-bold opacity-70">Cerita singkat</span>
          <textarea className="field mt-1 min-h-[96px] resize-y" maxLength={1000} placeholder="Apa yang bikin momen ini seru atau berkesan?" value={description} onChange={(e) => setDescription(e.target.value)} /></label>

        <div>
          <div className="text-sm font-bold opacity-70 mb-1">Kategori</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => <button key={c.id} type="button" className={`chip ${category === c.id ? 'chip-on' : ''}`} onClick={() => setCategory(c.id)}><c.icon size={14} />{c.label}</button>)}
          </div>
        </div>

        <div>
          <div className="text-sm font-bold opacity-70 mb-1">Foto ({images.length}/{MAX_PHOTOS})</div>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}
            className={`rounded-2xl border-2 border-dashed p-3 transition ${drag ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)]'}`}>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((src, i) => (
                <motion.div key={src.slice(-40) + i} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={src} alt={`Pratinjau foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" aria-label={`Hapus foto ${i + 1}`} className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1" onClick={() => setImages(images.filter((_, k) => k !== i))}><X size={14} /></button>
                </motion.div>))}
              {images.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-bold bg-chip hover:brightness-95 disabled:opacity-60">
                  <ImagePlus size={22} />{busy ? 'Memproses…' : 'Tambah'}
                </button>)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }} />
            <p className="text-xs opacity-60 mt-2">Pilih satu atau beberapa foto, atau seret ke sini. Foto dikompres otomatis.</p>
          </div>

          {/* Error banner per file yang gagal */}
          {skippedFiles.length > 0 && (
            <div className="mt-2 rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-700">Beberapa foto tidak bisa dibaca</p>
                <ul className="text-xs text-amber-600 mt-0.5 space-y-0.5">
                  {skippedFiles.map((f) => <li key={f} className="truncate">· {f}</li>)}
                </ul>
                <p className="text-xs text-amber-600 mt-1 opacity-80">
                  Kemungkinan format kamera tidak didukung browser. Coba buka foto di aplikasi Foto lalu simpan ulang sebagai JPEG.
                </p>
              </div>
              <button type="button" onClick={() => setSkippedFiles([])} className="shrink-0 text-amber-500 hover:text-amber-700">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-bold opacity-70 mb-1">Visibilitas</div>
          <div className="grid grid-cols-2 gap-2">
            {([['private', 'Keep Private', Lock, 'Hanya kamu yang bisa lihat'], ['shared', 'Bagikan', Share2, 'Pasangan bisa lihat']] as const).map(([k, l, Icon, d]) => (
              <button key={k} type="button" onClick={() => setVisibility(k)} aria-pressed={visibility === k}
                className={`rounded-2xl p-3 text-left transition border-2 ${visibility === k ? (k === 'private' ? 'border-[var(--accent2)] bg-[var(--accent2-soft)]' : 'border-[var(--accent)] bg-[var(--accent-soft)]') : 'border-transparent bg-chip'}`}>
                <div className="font-bold flex items-center gap-1.5"><Icon size={15} />{l}</div><div className="text-xs opacity-70">{d}</div>
              </button>))}
          </div>
        </div>

        {err && <p className="text-accent font-bold text-sm" role="alert">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-soft" onClick={onClose}>Batal</button>
          <button className="btn-warm" disabled={!valid || busy || saving} onClick={submit}><Save size={16} />{saving ? 'Menyimpan…' : 'Simpan momen'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
