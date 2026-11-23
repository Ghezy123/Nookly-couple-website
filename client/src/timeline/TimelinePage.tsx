import { Fragment, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Plus, BookOpen, Clock } from 'lucide-react';
import MemoryFormModal from './MemoryFormModal';
import MemoryLightbox from './MemoryLightbox';
import TimelineCard from './TimelineCard';
import { CATEGORIES } from './categories';
import { defaultService } from './mockMemories';
import type { MemoryService } from './memoryService';
import { canView } from './permissions';
import type { Category, Memory, UserId, UsersConfig } from './types';
import { useMemories } from './useMemories';
import { ScrapbookView } from './ScrapbookView';

const DEFAULT_USERS: UsersConfig = { A: { name: 'User A', color: 'var(--accent)' }, B: { name: 'User B', color: 'var(--accent2)' } };
type VisFilter = 'all' | 'shared' | 'private';

export interface TimelinePageProps {
  service?: MemoryService;       // ganti dengan implementasi backend saat integrasi
  users?: Partial<UsersConfig>;  // nama/warna dua pengguna
  currentUser?: UserId;
  pollMs?: number;               // polling data pasangan (ms); 0 = mati          // jika diisi (dari auth app utama), switcher pengujian disembunyikan
}

const monthLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

export default function TimelinePage({ service = defaultService, users: usersProp, currentUser, pollMs = 0 }: TimelinePageProps) {
  const users: UsersConfig = { A: { ...DEFAULT_USERS.A, ...usersProp?.A }, B: { ...DEFAULT_USERS.B, ...usersProp?.B } };
  const { memories, loading, error, clearError, add, update, remove } = useMemories(service, pollMs);
  const [switchUser, setSwitchUser] = useState<UserId>('A');
  const me = currentUser ?? switchUser;
  const [viewMode, setViewMode] = useState<'timeline' | 'scrapbook'>('timeline');
  const [newestFirst, setNewestFirst] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [vis, setVis] = useState<VisFilter>('all');
  const [form, setForm] = useState<{ open: boolean; memory: Memory | null }>({ open: false, memory: null });
  const [box, setBox] = useState<{ memory: Memory; index: number } | null>(null);

  const list = useMemo(() => {
    const dir = newestFirst ? -1 : 1;
    return memories
      .filter((m) => canView(m, me) && (!cats.length || cats.includes(m.category)) && (vis === 'all' || m.visibility === vis))
      .sort((a, b) => dir * (a.eventDate.localeCompare(b.eventDate) || a.createdAt - b.createdAt));
  }, [memories, me, cats, vis, newestFirst]);

  const toggleCat = (c: Category) => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const confirmDelete = (m: Memory) => { if (window.confirm(`Hapus momen "${m.title}"?`)) void remove(m.id); };
  const toggleVis = (m: Memory) => void update(m.id, { visibility: m.visibility === 'shared' ? 'private' : 'shared' });
  const liveBox = box ? memories.find((m) => m.id === box.memory.id) : undefined;

  return (
    <div>
      <div>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold">Kenangan Kita</h1>
              <p className="opacity-70">{list.length} momen · {list.reduce((n, m) => n + m.images.length, 0)} foto</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!currentUser && (
                <div className="flex rounded-2xl p-1 bg-chip" role="group" aria-label="Pengguna aktif (mode pengujian)">
                  {(['A', 'B'] as const).map((u) => (
                    <button key={u} aria-pressed={me === u} onClick={() => setSwitchUser(u)} className="relative rounded-xl px-3 py-1.5 text-sm font-bold">
                      {me === u && <motion.span layoutId="user-pill" className="absolute inset-0 rounded-xl -z-0" style={{ background: users[u].color }} />}
                      <span className="relative" style={{ color: me === u ? '#fff' : undefined }}>{users[u].name}</span>
                    </button>))}
                </div>)}
              {viewMode === 'timeline' && (
                <button className="btn-warm" onClick={() => setForm({ open: true, memory: null })}><Plus size={18} />Tambah momen</button>
              )}
            </div>
          </header>

          {/* Dual-Mode Selector: Linimasa vs Buku Kenangan 3D */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <div className="flex rounded-2xl p-1 bg-chip" role="tablist">
              <button
                onClick={() => setViewMode('timeline')}
                className={`relative rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 transition ${
                  viewMode === 'timeline' ? 'bg-[var(--surface)] text-accent shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Clock size={16} /> Linimasa
              </button>
              <button
                onClick={() => setViewMode('scrapbook')}
                className={`relative rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 transition ${
                  viewMode === 'scrapbook' ? 'bg-[var(--surface)] text-accent shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <BookOpen size={16} /> Buku Kenangan 3D
              </button>
            </div>
            {viewMode === 'scrapbook' && (
              <p className="text-xs opacity-60">💡 Klik sampul atau seret untuk memiringkan buku 3D</p>
            )}
          </div>

          {viewMode === 'scrapbook' ? (
            <ScrapbookView
              currentUser={me}
              memories={memories}
              onAddMemoryToTimeline={(input) => void add(input, me)}
            />
          ) : (
            <>
              <section className="card p-4 space-y-3" aria-label="Filter dan urutan">
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn-soft" onClick={() => setNewestFirst(!newestFirst)}>
                    {newestFirst ? <ArrowDownWideNarrow size={16} /> : <ArrowUpNarrowWide size={16} />}{newestFirst ? 'Terbaru ke terlama' : 'Terlama ke terbaru'}</button>
                  <div className="flex gap-1.5 ml-auto" role="group" aria-label="Filter visibilitas">
                    {([['all', 'Semua'], ['shared', 'Dibagikan'], ['private', 'Private']] as const).map(([k, l]) => <button key={k} className={`chip ${vis === k ? 'chip-on' : ''}`} onClick={() => setVis(k)}>{l}</button>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
                  {CATEGORIES.map((c) => <button key={c.id} className={`chip ${cats.includes(c.id) ? 'chip-on' : ''}`} aria-pressed={cats.includes(c.id)} onClick={() => toggleCat(c.id)}><c.icon size={14} />{c.label}</button>)}
                  {cats.length > 0 && <button className="chip" onClick={() => setCats([])}>Reset</button>}
                </div>
              </section>

              {loading ? <p className="text-center opacity-60 py-12">Memuat kenangan…</p> : list.length === 0 ? (
                <div className="text-center py-16 opacity-70"><div className="font-display text-xl font-semibold mb-1">Belum ada momen di sini</div>Coba ubah filter, atau tambahkan kenangan pertama kalian.</div>
              ) : (
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-4 md:left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#ffb199] via-[#ff6f91] to-[#cdbcff] opacity-70" aria-hidden />
                  <ol className="relative space-y-6">
                    <AnimatePresence initial={false}>
                      {list.map((m, i) => (
                        <Fragment key={m.id}>
                          {(i === 0 || monthLabel(list[i - 1].eventDate) !== monthLabel(m.eventDate)) && (
                            <li className="relative pl-12 md:pl-0 md:text-center pt-2" aria-label={monthLabel(m.eventDate)}>
                              <span className="inline-block rounded-full px-4 py-1 text-sm font-extrabold bg-[var(--surface)] border border-[var(--border)] shadow capitalize md:relative md:z-10">{monthLabel(m.eventDate)}</span>
                            </li>)}
                          <TimelineCard memory={m} me={me} users={users} side={i % 2 === 0 ? 'left' : 'right'}
                            onEdit={(x) => setForm({ open: true, memory: x })} onDelete={confirmDelete} onToggle={toggleVis} onOpenImage={(x, idx) => setBox({ memory: x, index: idx })} />
                        </Fragment>))}
                    </AnimatePresence>
                  </ol>
                </div>)}
            </>
          )}
        </div>

        <AnimatePresence>
          {form.open && <MemoryFormModal key={form.memory?.id ?? 'new'} initial={form.memory} onClose={() => setForm({ open: false, memory: null })}
            onSubmit={(input) => (form.memory ? update(form.memory.id, input) : add(input, me))} />}
          {error && <motion.div key="err" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" onClick={clearError}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-4 py-2 bg-accent text-white font-semibold shadow-lg">{error}</motion.div>}
        </AnimatePresence>
        <MemoryLightbox images={liveBox?.images ?? []} index={liveBox && box ? Math.min(box.index, Math.max(liveBox.images.length - 1, 0)) : null} title={liveBox?.title ?? ''}
          onIndex={(i) => box && setBox({ ...box, index: i })} onClose={() => setBox(null)} />
      </div>
    </div>
  );
}
