import React, { useRef } from 'react';
import {
  X,
  Plus,
  Sliders,
  Paintbrush,
  Image as ImageIcon,
  Mail,
  Type,
  Mic,
  Link as LinkIcon,
  Smile,
  Upload,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  BookmarkPlus,
  RotateCw,
} from 'lucide-react';
import type {
  ScrapbookElement,
  ScrapbookPage,
  ScrapbookState,
  UserId,
  PhotoElement,
  LetterElement,
  TextElement,
  StickerElement,
  VoiceElement,
  LinkElement,
  FrameStyle,
} from './scrapbookTypes';
import {
  FONTS,
  THEMES,
  BUILTIN_STICKERS,
  PATTERNS,
  PAGE_FRAMES,
  FRAME_STYLES,
} from './scrapbookRenderer';
import { compressImage } from './imageUtils';

interface EditorPanelProps {
  page: ScrapbookPage | null;
  side: 'left' | 'right';
  selectedId: string | null;
  state: ScrapbookState;
  currentUser: UserId;
  onClose: () => void;
  onSwitchSide: () => void;
  onAddElement: (
    type: ScrapbookElement['type'],
    extra?: Partial<ScrapbookElement>,
    newBlobs?: Record<string, string>
  ) => void;
  onUpdateElement: (el: ScrapbookElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (el: ScrapbookElement) => void;
  onReorderElement: (id: string, action: 'front' | 'back' | 'up' | 'down') => void;
  onUpdateBackground: (updateFn: (bg: ScrapbookPage['background']) => void) => void;
  onOpenMediaPool: (onPick: (url: string) => void) => void;
  onExportToLinimasa?: (el: ScrapbookElement) => void;
}

export function ScrapbookEditorPanel({
  page,
  side,
  selectedId,
  state,
  currentUser,
  onClose,
  onSwitchSide,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
  onUpdateBackground,
  onOpenMediaPool,
  onExportToLinimasa,
}: EditorPanelProps) {
  const [tab, setTab] = React.useState<'add' | 'props' | 'bg'>('add');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImgInputRef = useRef<HTMLInputElement>(null);

  const selectedEl = page?.elements.find((e) => e.id === selectedId) || null;

  // Auto-switch to properties tab when an element is selected
  React.useEffect(() => {
    if (selectedId) setTab('props');
  }, [selectedId]);

  if (!page) return null;

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    try {
      const compressed = await compressImage(files[0], 1280, 0.82);
      const blobId = `bl_${Date.now()}`;
      onAddElement(
        'photo',
        {
          photos: [blobId],
          frame: 'polaroid',
          caption: files[0].name.replace(/\.[^.]+$/, ''),
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        } as Partial<PhotoElement>,
        { [blobId]: compressed }
      );
    } catch (err: any) {
      alert('Gagal mengompres foto: ' + err.message);
    }
    e.target.value = '';
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    try {
      const compressed = await compressImage(files[0], 1280, 0.75);
      const blobId = `bl_bg_${Date.now()}`;
      state.blobs[blobId] = compressed;
      onUpdateBackground((bg) => {
        bg.type = 'image';
        bg.imageId = blobId;
      });
    } catch (err: any) {
      alert('Gagal mengunggah background: ' + err.message);
    }
    e.target.value = '';
  };

  return (
    <div
      className="fixed top-16 right-4 bottom-24 w-84 sm:w-96 p-4 sm:p-5 shadow-2xl z-30 flex flex-col rounded-3xl border border-[var(--border)] overflow-hidden font-display backdrop-blur-none"
      style={{ backgroundColor: 'var(--surface, #ffffff)', color: 'var(--fg, #1a1a1a)' }}
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div>
          <h2 className="font-bold text-lg">Edit Halaman ({side === 'left' ? 'Kiri' : 'Kanan'})</h2>
          <p className="text-xs opacity-70">Oleh User {currentUser}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSwitchSide}
            className="btn-soft text-xs px-2.5 py-1.5"
            title="Ganti ke halaman sebelah"
          >
            ⇄ {side === 'left' ? 'Kanan' : 'Kiri'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-chip transition">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-chip rounded-2xl my-3">
        {[
          { id: 'add', label: 'Tambah', icon: Plus },
          { id: 'props', label: 'Properti', icon: Sliders },
          { id: 'bg', label: 'Background', icon: Paintbrush },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition ${
              tab === t.id ? 'bg-[var(--surface)] text-accent shadow-sm' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
        {/* ================= TAB 1: TAMBAH ELEMEN ================= */}
        {tab === 'add' && (
          <div className="space-y-4">
            <div>
              <p className="font-bold opacity-60 mb-2 uppercase tracking-wider text-[10px]">
                Elemen Kenangan
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-2xl bg-chip hover:bg-[var(--surface)] border border-transparent hover:border-accent/40 transition flex flex-col items-center gap-1.5 font-bold"
                >
                  <ImageIcon size={20} className="text-accent" />
                  <span>Upload Foto</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadPhoto}
                  className="hidden"
                />

                <button
                  onClick={() =>
                    onOpenMediaPool((url) => {
                      const blobId = `bl_pool_${Date.now()}`;
                      onAddElement(
                        'photo',
                        {
                          photos: [blobId],
                          frame: 'polaroid',
                          caption: 'Kenangan Kita',
                        } as Partial<PhotoElement>,
                        { [blobId]: url }
                      );
                    })
                  }
                  className="p-3 rounded-2xl bg-chip hover:bg-[var(--surface)] border border-transparent hover:border-accent/40 transition flex flex-col items-center gap-1.5 font-bold"
                >
                  <span className="text-lg">📸</span>
                  <span>Pilih dari Galeri</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement('letter', {
                      from: `User ${currentUser}`,
                      to: currentUser === 'A' ? 'User B' : 'User A',
                      title: 'Surat untukmu',
                      body: 'Tulis pesan rahasia atau ungkapan manismu di sini...',
                      theme: 'rose',
                    } as Partial<LetterElement>)
                  }
                  className="p-3 rounded-2xl bg-chip hover:bg-[var(--surface)] border border-transparent hover:border-accent/40 transition flex flex-col items-center gap-1.5 font-bold"
                >
                  <Mail size={20} className="text-accent2" />
                  <span>Surat Cinta</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement('text', {
                      text: 'Tulis kenangan di sini...',
                      font: 'hand',
                      size: 32,
                      color: '#4a3b34',
                    } as Partial<TextElement>)
                  }
                  className="p-3 rounded-2xl bg-chip hover:bg-[var(--surface)] border border-transparent hover:border-accent/40 transition flex flex-col items-center gap-1.5 font-bold"
                >
                  <Type size={20} className="text-purple-400" />
                  <span>Teks / Tulisan</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement('voice', {
                      title: 'Catatan Suara',
                      duration: 10,
                      theme: 'lilac',
                    } as Partial<VoiceElement>)
                  }
                  className="p-3 rounded-2xl bg-chip hover:bg-[var(--surface)] border border-transparent hover:border-accent/40 transition flex flex-col items-center gap-1.5 font-bold"
                >
                  <Mic size={20} className="text-amber-500" />
                  <span>Voice Note</span>
                </button>

                <button
                  onClick={() =>
                    onAddElement('link', {
                      title: 'Lagu Favorit',
                      subtitle: 'Spotify / YouTube / Maps',
                      url: 'https://open.spotify.com/',
                      theme: 'sky',
                    } as Partial<LinkElement>)
                  }
                  className="p-3 rounded-2xl bg-chip hover:bg-[var(--surface)] border border-transparent hover:border-accent/40 transition flex flex-col items-center gap-1.5 font-bold"
                >
                  <LinkIcon size={20} className="text-blue-500" />
                  <span>Lagu / Link</span>
                </button>
              </div>
            </div>

            {/* Stiker Bawaan */}
            <div>
              <p className="font-bold opacity-60 mb-2 uppercase tracking-wider text-[10px]">
                Stiker & Hiasan
              </p>
              <div className="grid grid-cols-3 gap-2">
                {BUILTIN_STICKERS.map((stk) => (
                  <button
                    key={stk.id}
                    onClick={() =>
                      onAddElement('sticker', {
                        kind: 'builtin',
                        name: stk.id,
                        color: stk.color,
                        w: stk.id === 'washi' ? 180 : 100,
                        h: stk.id === 'washi' ? 46 : 100,
                      } as Partial<StickerElement>)
                    }
                    className="p-2 rounded-xl bg-chip hover:bg-[var(--surface)] transition flex flex-col items-center gap-1"
                  >
                    <span className="text-xl">
                      {stk.id === 'heart'
                        ? '💖'
                        : stk.id === 'star'
                        ? '⭐'
                        : stk.id === 'sparkle'
                        ? '✨'
                        : stk.id === 'flower'
                        ? '🌸'
                        : stk.id === 'washi'
                        ? '🎀'
                        : stk.id === 'pushpin'
                        ? '📌'
                        : stk.id === 'ribbon'
                        ? '🎗️'
                        : stk.id === 'moon'
                        ? '🌙'
                        : '☁️'}
                    </span>
                    <span className="text-[10px] truncate max-w-full">{stk.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PROPERTI ELEMEN ================= */}
        {tab === 'props' && (
          <div className="space-y-4">
            {!selectedEl ? (
              <div className="py-12 text-center opacity-60">
                <Smile size={32} className="mx-auto mb-2 opacity-50" />
                <p>Klik elemen di atas halaman untuk mengedit ukuran, warna, posisi, dan teks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Actions Layer & Edit */}
                <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-[var(--border)]">
                  <button
                    onClick={() => onReorderElement(selectedEl.id, 'front')}
                    className="btn-soft text-[10px] px-2 py-1"
                    title="Paling Depan"
                  >
                    <ChevronsUp size={12} /> Depan
                  </button>
                  <button
                    onClick={() => onReorderElement(selectedEl.id, 'up')}
                    className="btn-soft text-[10px] px-2 py-1"
                    title="Maju 1 Lapis"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => onReorderElement(selectedEl.id, 'down')}
                    className="btn-soft text-[10px] px-2 py-1"
                    title="Mundur 1 Lapis"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={() => onReorderElement(selectedEl.id, 'back')}
                    className="btn-soft text-[10px] px-2 py-1"
                    title="Paling Belakang"
                  >
                    <ChevronsDown size={12} /> Belakang
                  </button>
                  <button
                    onClick={() => onDuplicateElement(selectedEl)}
                    className="btn-soft text-[10px] px-2 py-1"
                    title="Duplikat Elemen"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteElement(selectedEl.id)}
                    className="btn-soft text-[10px] px-2 py-1 text-red-500 hover:bg-red-500/10"
                    title="Hapus Elemen (Del)"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Shortcut Cheat Sheet */}
                <div className="p-2.5 rounded-xl bg-accent/5 border border-accent/20 text-[10px] space-y-1">
                  <div className="font-bold text-accent flex items-center gap-1">
                    <span>⌨️ Shortcut Keyboard:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 opacity-80">
                    <div><kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">Ctrl+C</kbd> / <kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">V</kbd> Salin-Tempel</div>
                    <div><kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">Ctrl+D</kbd> Duplikat</div>
                    <div><kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">Del</kbd> Hapus Elemen</div>
                    <div><kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">Panah</kbd> Geser (Shift: 10px)</div>
                    <div><kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">Ctrl+Z</kbd> / <kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">Y</kbd> Undo / Redo</div>
                    <div><kbd className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded">Esc</kbd> Batal Pilih</div>
                  </div>
                </div>

                {/* 2-Way Sync to Linimasa */}
                {(selectedEl.type === 'photo' || selectedEl.type === 'letter') && onExportToLinimasa && (
                  <button
                    onClick={() => onExportToLinimasa(selectedEl)}
                    className="w-full btn-soft text-accent border border-accent/30 py-2 justify-center font-bold"
                  >
                    <BookmarkPlus size={14} /> Jadikan Momen di Linimasa
                  </button>
                )}

                {/* Ukuran & Rotasi */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="opacity-60 text-[10px] block mb-1">Lebar (px)</label>
                    <input
                      type="number"
                      value={selectedEl.w}
                      onChange={(e) => {
                        selectedEl.w = Math.max(20, parseInt(e.target.value) || 20);
                        onUpdateElement(selectedEl);
                      }}
                      className="field py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="opacity-60 text-[10px] block mb-1">Tinggi (px)</label>
                    <input
                      type="number"
                      value={selectedEl.h}
                      onChange={(e) => {
                        selectedEl.h = Math.max(20, parseInt(e.target.value) || 20);
                        onUpdateElement(selectedEl);
                      }}
                      className="field py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="opacity-60 text-[10px]">Rotasi: {selectedEl.rotation}°</label>
                    <button
                      onClick={() => {
                        selectedEl.rotation = 0;
                        onUpdateElement(selectedEl);
                      }}
                      className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
                    >
                      <RotateCw size={10} /> Reset
                    </button>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={selectedEl.rotation}
                    onChange={(e) => {
                      selectedEl.rotation = parseInt(e.target.value);
                      onUpdateElement(selectedEl);
                    }}
                    className="w-full accent-accent"
                  />
                </div>

                {/* Elemen Spesifik: FOTO */}
                {selectedEl.type === 'photo' && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <label className="opacity-60 text-[10px] block">Gaya Bingkai</label>
                    <select
                      value={(selectedEl as PhotoElement).frame}
                      onChange={(e) => {
                        (selectedEl as PhotoElement).frame = e.target.value as FrameStyle;
                        onUpdateElement(selectedEl);
                      }}
                      style={{ colorScheme: 'dark' }}
                      className="w-full rounded-xl px-3 py-2 bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)] outline-none text-xs font-semibold shadow-sm"
                    >
                      {FRAME_STYLES.map((f) => (
                        <option key={f.v} value={f.v} style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">
                          {f.l}
                        </option>
                      ))}
                    </select>

                    <label className="opacity-60 text-[10px] block">Caption Foto</label>
                    <input
                      type="text"
                      value={(selectedEl as PhotoElement).caption || ''}
                      onChange={(e) => {
                        (selectedEl as PhotoElement).caption = e.target.value;
                        onUpdateElement(selectedEl);
                      }}
                      placeholder="Tulis caption singkat..."
                      className="field py-1.5 text-xs bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)]"
                    />

                    <label className="opacity-60 text-[10px] block">Tanggal Momen</label>
                    <input
                      type="text"
                      value={(selectedEl as PhotoElement).date || ''}
                      onChange={(e) => {
                        (selectedEl as PhotoElement).date = e.target.value;
                        onUpdateElement(selectedEl);
                      }}
                      placeholder="Contoh: 12 Juli 2024"
                      className="field py-1.5 text-xs bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)]"
                    />
                  </div>
                )}

                {/* Elemen Spesifik: TEKS */}
                {selectedEl.type === 'text' && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <label className="opacity-60 text-[10px] block">Isi Teks</label>
                    <textarea
                      rows={3}
                      value={(selectedEl as TextElement).text}
                      onChange={(e) => {
                        (selectedEl as TextElement).text = e.target.value;
                        onUpdateElement(selectedEl);
                      }}
                      className="field py-1.5 text-xs resize-none bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)]"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="opacity-60 text-[10px] block mb-1">Gaya Font</label>
                        <select
                          value={(selectedEl as TextElement).font}
                          onChange={(e) => {
                            (selectedEl as TextElement).font = e.target.value as any;
                            onUpdateElement(selectedEl);
                          }}
                          style={{ colorScheme: 'dark' }}
                          className="w-full rounded-xl px-3 py-2 bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)] outline-none text-xs font-semibold shadow-sm"
                        >
                          {Object.entries(FONTS).map(([k, f]) => (
                            <option key={k} value={k} style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="opacity-60 text-[10px] block mb-1">Ukuran (px)</label>
                        <input
                          type="number"
                          value={(selectedEl as TextElement).size}
                          onChange={(e) => {
                            (selectedEl as TextElement).size = parseInt(e.target.value) || 20;
                            onUpdateElement(selectedEl);
                          }}
                          className="field py-1.5 text-xs font-mono bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="opacity-60 text-[10px]">Warna Teks:</label>
                      <input
                        type="color"
                        value={(selectedEl as TextElement).color}
                        onChange={(e) => {
                          (selectedEl as TextElement).color = e.target.value;
                          onUpdateElement(selectedEl);
                        }}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Elemen Spesifik: SURAT */}
                {selectedEl.type === 'letter' && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <label className="opacity-60 text-[10px] block">Judul Surat</label>
                    <input
                      type="text"
                      value={(selectedEl as LetterElement).title || ''}
                      onChange={(e) => {
                        (selectedEl as LetterElement).title = e.target.value;
                        onUpdateElement(selectedEl);
                      }}
                      className="field py-1.5 text-xs"
                    />

                    <label className="opacity-60 text-[10px] block">Isi Surat</label>
                    <textarea
                      rows={4}
                      value={(selectedEl as LetterElement).body || ''}
                      onChange={(e) => {
                        (selectedEl as LetterElement).body = e.target.value;
                        onUpdateElement(selectedEl);
                      }}
                      className="field py-1.5 text-xs resize-none"
                    />

                    <label className="opacity-60 text-[10px] block">Tema Warna Amplop</label>
                    <select
                      value={(selectedEl as LetterElement).theme || 'rose'}
                      onChange={(e) => {
                        (selectedEl as LetterElement).theme = e.target.value;
                        onUpdateElement(selectedEl);
                      }}
                      style={{ colorScheme: 'dark' }}
                      className="w-full rounded-xl px-3 py-2 bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)] outline-none text-xs font-semibold shadow-sm"
                    >
                      {Object.entries(THEMES).map(([k, t]) => (
                        <option key={k} value={k} style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: BACKGROUND HALAMAN ================= */}
        {tab === 'bg' && (
          <div className="space-y-4">
            <div>
              <label className="opacity-60 text-[10px] block mb-1">Tipe Background</label>
              <select
                value={page.background.type}
                onChange={(e) =>
                  onUpdateBackground((bg) => {
                    bg.type = e.target.value as any;
                  })
                }
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-xl px-3 py-2 bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)] outline-none text-xs font-semibold shadow-sm"
              >
                <option value="solid" style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">Warna Solid</option>
                <option value="gradient" style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">Gradasi Lembut</option>
                <option value="image" style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">Gambar Kustom</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="opacity-60 text-[10px] block mb-1">Warna Utama</label>
                <input
                  type="color"
                  value={page.background.color}
                  onChange={(e) =>
                    onUpdateBackground((bg) => {
                      bg.color = e.target.value;
                    })
                  }
                  className="w-10 h-8 rounded-lg border-0 cursor-pointer"
                />
              </div>

              {page.background.type === 'gradient' && (
                <div>
                  <label className="opacity-60 text-[10px] block mb-1">Warna Kedua</label>
                  <input
                    type="color"
                    value={page.background.color2 || '#ffeef1'}
                    onChange={(e) =>
                      onUpdateBackground((bg) => {
                        bg.color2 = e.target.value;
                      })
                    }
                    className="w-10 h-8 rounded-lg border-0 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {page.background.type === 'image' && (
              <div className="space-y-2">
                <button
                  onClick={() => bgImgInputRef.current?.click()}
                  className="btn-soft w-full py-2 justify-center text-xs"
                >
                  <Upload size={14} /> Unggah Gambar Background
                </button>
                <input
                  ref={bgImgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgImageUpload}
                  className="hidden"
                />
              </div>
            )}

            <div>
              <label className="opacity-60 text-[10px] block mb-1">Pola Kertas</label>
              <select
                value={page.background.pattern}
                onChange={(e) =>
                  onUpdateBackground((bg) => {
                    bg.pattern = e.target.value as any;
                  })
                }
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-xl px-3 py-2 bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)] outline-none text-xs font-semibold shadow-sm"
              >
                {PATTERNS.map((p) => (
                  <option key={p.v} value={p.v} style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">
                    {p.l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="opacity-60 text-[10px] block mb-1">Bingkai Tepi Halaman</label>
              <select
                value={page.background.frame}
                onChange={(e) =>
                  onUpdateBackground((bg) => {
                    bg.frame = e.target.value as any;
                  })
                }
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-xl px-3 py-2 bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)] outline-none text-xs font-semibold shadow-sm"
              >
                {PAGE_FRAMES.map((f) => (
                  <option key={f.v} value={f.v} style={{ backgroundColor: '#2b2426', color: '#ffffff' }} className="bg-[#2b2426] text-white py-1.5 font-medium">
                    {f.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
