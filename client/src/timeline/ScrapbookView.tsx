import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Box,
  Undo2,
  Redo2,
  Edit3,
  Plus,
  BookOpen,
  Sparkles,
  Layers,
  ArrowLeft,
  Music,
  Palette,
  X,
  Upload,
} from 'lucide-react';
import type {
  ScrapbookState,
  ScrapbookPage,
  ScrapbookElement,
  UserId,
  PhotoElement,
  LetterElement,
  LinkElement,
} from './scrapbookTypes';
import { ScrapbookEngine } from './scrapbookEngine';
import { PW, PH } from './scrapbookRenderer';
import { createSeedScrapbook } from './scrapbookSeed';
import { ScrapbookOverlay } from './ScrapbookOverlay';
import { ScrapbookEditorPanel } from './ScrapbookEditorPanel';
import {
  LetterModal,
  PhotoLightboxModal,
  LinkPreviewModal,
  SharedMediaPickerModal,
} from './ScrapbookModals';
import type { Memory, MemoryInput } from './types';
import {
  getSharedMediaPool,
  exportScrapbookElementToMemoryInput,
} from './scrapbookMediaService';
import { compressImage } from './imageUtils';
import { api } from '../api';
import { supabase } from '../supabase';

interface ScrapbookViewProps {
  currentUser: UserId;
  memories: Memory[];
  onAddMemoryToTimeline?: (input: MemoryInput) => void;
}

const STORAGE_KEY = 'couplehub_scrapbook_state_v1';

export function ScrapbookView({
  currentUser,
  memories,
  onAddMemoryToTimeline,
}: ScrapbookViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ScrapbookEngine | null>(null);

  // Load state from localStorage or seed
  const [state, setState] = useState<ScrapbookState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Gagal memuat scrapbook dari localStorage', e);
    }
    return createSeedScrapbook();
  });

  const [turned, setTurned] = useState(state.ui?.turned || 0);
  const [mode3d, setMode3d] = useState(state.ui?.mode3d !== false);
  const [editing, setEditing] = useState(false);
  const [editSide, setEditSide] = useState<'left' | 'right'>('right');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCover, setEditingCover] = useState(false);
  const coverImgInputRef = useRef<HTMLInputElement>(null);

  // Status Sinkronisasi Realtime
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [partnerNotice, setPartnerNotice] = useState<string | null>(null);
  const saveTimeoutRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const isRemoteUpdateRef = useRef(false);

  // History stack for Undo / Redo
  const historyRef = useRef<string[]>([JSON.stringify(state)]);
  const historyIdxRef = useRef(0);
  const clipboardRef = useRef<ScrapbookElement | null>(null);

  // Active Modals
  const [activeLetter, setActiveLetter] = useState<LetterElement | null>(null);
  const [activePhoto, setActivePhoto] = useState<PhotoElement | null>(null);
  const [activeLink, setActiveLink] = useState<LinkElement | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const mediaPickCallbackRef = useRef<((url: string) => void) | null>(null);

  // Audio Context for synthetic tune / melody
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Muat Buku dari Supabase saat pertama kali dibuka
  useEffect(() => {
    let mounted = true;
    async function loadCloudBook() {
      try {
        const cloud = await api.getScrapbook();
        if (mounted && cloud && cloud.state) {
          setState(cloud.state);
          if (engineRef.current) {
            engineRef.current.updateState(cloud.state);
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud.state));
          } catch {}
          historyRef.current = [JSON.stringify(cloud.state)];
          historyIdxRef.current = 0;
          setSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Mode offline atau buku belum ada di cloud:', err);
        setSyncStatus('offline');
      }
    }
    loadCloudBook();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Realtime Listener: Langsung sinkronkan saat pasangan mengedit buku (Canva-style)
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel('nookly-scrapbook-collab', {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'book_change' }, ({ payload }) => {
        if (payload && payload.state) {
          if (payload.sender && currentUser && payload.sender === currentUser) return;
          isRemoteUpdateRef.current = true;
          setState(payload.state);
          if (engineRef.current) {
            engineRef.current.updateState(payload.state);
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.state));
          } catch {}
          setPartnerNotice(`✨ Buku diperbarui oleh pasangan!`);
          setTimeout(() => setPartnerNotice(null), 3500);
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 300);
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scrapbooks' },
        (payload: any) => {
          if (payload?.new?.state) {
            const newState = typeof payload.new.state === 'string'
              ? JSON.parse(payload.new.state)
              : payload.new.state;
            isRemoteUpdateRef.current = true;
            setState(newState);
            if (engineRef.current) {
              engineRef.current.updateState(newState);
            }
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
            } catch {}
            setPartnerNotice(`✨ Buku diperbarui oleh pasangan!`);
            setTimeout(() => setPartnerNotice(null), 3500);
            setTimeout(() => {
              isRemoteUpdateRef.current = false;
            }, 300);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase?.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUser]);

  // Save to localStorage + Debounced Save to Supabase Cloud + Realtime Broadcast
  const saveState = useCallback(
    (newState: ScrapbookState) => {
      setState(newState);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {
        console.warn('Quota penyimpanan penuh', e);
      }

      // Jangan broadcast balik jika update berasal dari pasangan
      if (isRemoteUpdateRef.current) return;

      // 1. Broadcast instan ke pasangan (sub-second Canva live feel)
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'book_change',
          payload: {
            sender: currentUser,
            state: newState,
            timestamp: Date.now(),
          },
        });
      }

      // 2. Debounced save ke Postgres Supabase
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSyncStatus('saving');

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await api.saveScrapbook(newState);
          setSyncStatus('synced');
        } catch (err) {
          console.warn('Gagal sinkron cloud:', err);
          setSyncStatus('offline');
        }
      }, 700);
    },
    [currentUser]
  );

  const pushHistory = useCallback(
    (newState: ScrapbookState) => {
      const s = JSON.stringify(newState);
      const cur = historyRef.current.slice(0, historyIdxRef.current + 1);
      cur.push(s);
      if (cur.length > 30) cur.shift();
      historyRef.current = cur;
      historyIdxRef.current = cur.length - 1;
      saveState(newState);
    },
    [saveState]
  );

  const handleUndo = () => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--;
      const restored = JSON.parse(historyRef.current[historyIdxRef.current]);
      setState(restored);
      engineRef.current?.updateState(restored);
    }
  };

  const handleRedo = () => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++;
      const restored = JSON.parse(historyRef.current[historyIdxRef.current]);
      setState(restored);
      engineRef.current?.updateState(restored);
    }
  };

  // Inisialisasi Three.js Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const eng = new ScrapbookEngine(containerRef.current, state, {
      onTurn: (t) => {
        setTurned(t);
        setState((prev) => ({
          ...prev,
          ui: { ...prev.ui, turned: t },
        }));
      },
    });

    engineRef.current = eng;
    eng.setTurned(state.ui?.turned || 0);
    eng.setMode3d(mode3d);

    return () => {
      eng.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update engine properties when state changes
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setMode3d(mode3d);
  }, [mode3d]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setEditing(editing, editSide);
  }, [editing, editSide]);

  // Click on 3D book canvas
  const handleStageClick = (e: React.MouseEvent) => {
    if (editing || !engineRef.current) return;
    const hit = engineRef.current.raycastPage(e.clientX, e.clientY);
    if (!hit) return;

    if (hit.cover) {
      if (hit.cover === 'front') engineRef.current.next();
      else engineRef.current.prev();
      return;
    }

    if (hit.pageIndex >= 0) {
      const page = state.pages[hit.pageIndex];
      if (page) {
        // Cari elemen yang kena klik
        const el = page.elements
          .slice()
          .reverse()
          .find((item) => {
            const rad = (-item.rotation * Math.PI) / 180;
            const cos = Math.cos(rad),
              sin = Math.sin(rad);
            const dx = hit.x - item.x,
              dy = hit.y - item.y;
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;
            return Math.abs(lx) <= item.w / 2 && Math.abs(ly) <= item.h / 2;
          });

        if (el) {
          if (el.type === 'letter') setActiveLetter(el as LetterElement);
          else if (el.type === 'photo') setActivePhoto(el as PhotoElement);
          else if (el.type === 'link') setActiveLink(el as LinkElement);
          else if (el.type === 'voice') {
            // Putar audio sintetis / file
            alert(`🎙 Memutar catatan suara: "${(el as any).title}"`);
          }
          return;
        }
      }

      // Klik tepi halaman untuk membalik
      if (hit.side === 'right' && hit.x > 500) {
        engineRef.current.next();
      } else if (hit.side === 'left' && hit.x < 100) {
        engineRef.current.prev();
      }
    }
  };

  // Pointer drag to orbit 3D view
  const dragRef = useRef<{ id: number; lx: number; ly: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editing) return;
    dragRef.current = { id: e.pointerId, lx: e.clientX, ly: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !mode3d || !engineRef.current || editing) return;
    const dx = e.clientX - dragRef.current.lx;
    const dy = e.clientY - dragRef.current.ly;
    if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
    engineRef.current.orbitBy(dx, dy);
    dragRef.current.lx = e.clientX;
    dragRef.current.ly = e.clientY;
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  // Target page for editor (reactive to turned & editSide)
  const L = Math.floor(state.pages.length / 2);
  const editPageIndex =
    editSide === 'right'
      ? turned >= 1 && turned <= L
        ? 2 * turned - 2
        : -1
      : turned >= 2 && turned - 1 <= L
      ? 2 * turned - 3
      : -1;
  const editPage = editPageIndex >= 0 && editPageIndex < state.pages.length ? state.pages[editPageIndex] : null;

  // Add Element to Page
  const handleAddElement = (
    type: ScrapbookElement['type'],
    extra: Partial<ScrapbookElement> = {},
    newBlobs?: Record<string, string>
  ) => {
    if (!editPage) return;
    const defaultSizes: Record<string, [number, number]> = {
      photo: [300, 360],
      letter: [360, 250],
      voice: [340, 70],
      link: [360, 120],
      text: [300, 80],
      sticker: [100, 100],
    };
    const [defW, defH] = defaultSizes[type] || [120, 120];

    const newEl: ScrapbookElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: 300,
      y: 400,
      w: extra.w || defW,
      h: extra.h || defH,
      rotation: extra.rotation ?? Math.round((Math.random() * 6 - 3) * 10) / 10,
      opacity: extra.opacity ?? 1,
      lock: extra.lock ?? true,
      createdBy: currentUser,
      updatedBy: currentUser,
      ...extra,
    } as any;

    const updatedPages = state.pages.map((p) =>
      p.id === editPage.id ? { ...p, elements: [...p.elements, newEl] } : p
    );
    const newState: ScrapbookState = {
      ...state,
      blobs: newBlobs ? { ...state.blobs, ...newBlobs } : state.blobs,
      pages: updatedPages,
    };
    pushHistory(newState);
    if (engineRef.current) {
      engineRef.current.setState(newState);
      engineRef.current.invalidatePage(editPage.id);
    }
    setSelectedId(newEl.id);
  };

  // Update Element (smooth live drag + persist on finish)
  const handleUpdateElement = (updatedEl: ScrapbookElement, isFinished = false) => {
    if (!editPage) return;
    const updatedPages = state.pages.map((p) =>
      p.id === editPage.id
        ? {
            ...p,
            elements: p.elements.map((e) => (e.id === updatedEl.id ? updatedEl : e)),
          }
        : p
    );
    const newState = { ...state, pages: updatedPages };
    if (isFinished) {
      pushHistory(newState);
    } else {
      setState(newState);
    }
    if (engineRef.current) {
      engineRef.current.setState(newState);
      engineRef.current.invalidatePage(editPage.id);
    }
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    if (!editPage) return;
    const updatedPages = state.pages.map((p) =>
      p.id === editPage.id
        ? {
            ...p,
            elements: p.elements.filter((e) => e.id !== id),
          }
        : p
    );
    const newState = { ...state, pages: updatedPages };
    pushHistory(newState);
    if (engineRef.current) {
      engineRef.current.setState(newState);
      engineRef.current.invalidatePage(editPage.id);
    }
    setSelectedId(null);
  };

  // Duplicate Element
  const handleDuplicateElement = (el: ScrapbookElement) => {
    if (!editPage) return;
    const dup: ScrapbookElement = {
      ...el,
      id: `el_${Date.now()}_dup`,
      x: el.x + 24,
      y: el.y + 24,
      createdBy: currentUser,
      updatedBy: currentUser,
    };
    const updatedPages = state.pages.map((p) =>
      p.id === editPage.id ? { ...p, elements: [...p.elements, dup] } : p
    );
    const newState = { ...state, pages: updatedPages };
    pushHistory(newState);
    if (engineRef.current) {
      engineRef.current.setState(newState);
      engineRef.current.invalidatePage(editPage.id);
    }
    setSelectedId(dup.id);
  };

  // Reorder Layer
  const handleReorderElement = (id: string, action: 'front' | 'back' | 'up' | 'down') => {
    if (!editPage) return;
    const els = [...editPage.elements];
    const idx = els.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const [target] = els.splice(idx, 1);
    const newIdx =
      action === 'front'
        ? els.length
        : action === 'back'
        ? 0
        : action === 'up'
        ? Math.min(els.length, idx + 1)
        : Math.max(0, idx - 1);
    els.splice(newIdx, 0, target);

    const updatedPages = state.pages.map((p) =>
      p.id === editPage.id ? { ...p, elements: els } : p
    );
    const newState = { ...state, pages: updatedPages };
    pushHistory(newState);
    if (engineRef.current) {
      engineRef.current.setState(newState);
      engineRef.current.invalidatePage(editPage.id);
    }
  };

  // Update Background
  const handleUpdateBackground = (updateFn: (bg: ScrapbookPage['background']) => void) => {
    if (!editPage) return;
    const bgCopy = { ...editPage.background };
    updateFn(bgCopy);
    const updatedPages = state.pages.map((p) =>
      p.id === editPage.id ? { ...p, background: bgCopy } : p
    );
    const newState = { ...state, pages: updatedPages };
    pushHistory(newState);
    if (engineRef.current) {
      engineRef.current.setState(newState);
      engineRef.current.invalidatePage(editPage.id);
    }
  };

  // Keyboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+D, Del/Backspace, Arrow Nudge, Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const tag = (activeEl?.tagName || '').toUpperCase();
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        activeEl?.isContentEditable
      ) {
        return; // Jangan ganggu saat mengetik input form
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z (tanpa shift)
      if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y atau Ctrl+Shift+Z
      if (
        (isCtrlOrCmd && e.key.toLowerCase() === 'y') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'z' && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Escape: Batal pilih elemen
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }

      const currentSelected = editPage?.elements.find((el) => el.id === selectedId);

      // Duplicate: Ctrl+D
      if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        if (currentSelected) {
          e.preventDefault();
          handleDuplicateElement(currentSelected);
        }
        return;
      }

      // Copy: Ctrl+C
      if (isCtrlOrCmd && e.key.toLowerCase() === 'c') {
        if (currentSelected) {
          e.preventDefault();
          clipboardRef.current = JSON.parse(JSON.stringify(currentSelected));
        }
        return;
      }

      // Paste: Ctrl+V
      if (isCtrlOrCmd && e.key.toLowerCase() === 'v') {
        if (clipboardRef.current && editPage) {
          e.preventDefault();
          const pasted: ScrapbookElement = {
            ...JSON.parse(JSON.stringify(clipboardRef.current)),
            id: `el_${Date.now()}_paste`,
            x: Math.min(PW - 40, clipboardRef.current.x + 20),
            y: Math.min(PH - 40, clipboardRef.current.y + 20),
            createdBy: currentUser,
            updatedBy: currentUser,
          };
          const updatedPages = state.pages.map((p) =>
            p.id === editPage.id ? { ...p, elements: [...p.elements, pasted] } : p
          );
          const newState = { ...state, pages: updatedPages };
          pushHistory(newState);
          if (engineRef.current) {
            engineRef.current.setState(newState);
            engineRef.current.invalidatePage(editPage.id);
          }
          setSelectedId(pasted.id);
          // Geser offset clipboard berikutnya agar jika paste berulang tersusun berundak rapi
          clipboardRef.current.x = pasted.x;
          clipboardRef.current.y = pasted.y;
        }
        return;
      }

      // Delete: Delete atau Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDeleteElement(selectedId);
        }
        return;
      }

      // Arrow Keys: Nudge geser presisi (Shift = 10px, Normal = 2px)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (currentSelected) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;

          const nudged: ScrapbookElement = {
            ...currentSelected,
            x: Math.max(0, Math.min(PW, currentSelected.x + dx)),
            y: Math.max(0, Math.min(PH, currentSelected.y + dy)),
          };
          handleUpdateElement(nudged, true);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editPage, selectedId, state, currentUser]);
  const handleAddLeaf = () => {
    const newP1: ScrapbookPage = {
      id: `pg_${Date.now()}_a`,
      author: currentUser,
      updatedBy: currentUser,
      background: {
        type: 'solid',
        color: '#fbf3e4',
        pattern: 'paper',
        patternColor: '#d9c3a5',
        frame: 'none',
        frameColor: '#ffffff',
        imageDim: 0,
      },
      elements: [],
    };
    const newP2: ScrapbookPage = {
      id: `pg_${Date.now()}_b`,
      author: currentUser,
      updatedBy: currentUser,
      background: {
        type: 'solid',
        color: '#fbf3e4',
        pattern: 'paper',
        patternColor: '#d9c3a5',
        frame: 'none',
        frameColor: '#ffffff',
        imageDim: 0,
      },
      elements: [],
    };
    const newState = { ...state, pages: [...state.pages, newP1, newP2] };
    pushHistory(newState);
    engineRef.current?.updateState(newState);
    engineRef.current?.setTurned(newState.pages.length / 2);
  };

  // Update Meta (judul, warna, foto cover, dsb)
  const handleUpdateMeta = (updateFn: (meta: typeof state.meta) => void) => {
    const newMeta = { ...state.meta };
    updateFn(newMeta);
    const newState = { ...state, meta: newMeta };
    pushHistory(newState);
    if (engineRef.current) {
      engineRef.current.setState(newState);
      engineRef.current.setScene(newMeta.sceneColor);
      engineRef.current.invalidateCover();
    }
  };

  // Upload foto sampul cover
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { compressImage } = await import('./imageUtils');
      const compressed = await compressImage(file, 1280, 0.85);
      const blobId = `bl_cover_${Date.now()}`;
      const newState = {
        ...state,
        meta: { ...state.meta, coverImageBlobId: blobId },
        blobs: { ...state.blobs, [blobId]: compressed },
      };
      pushHistory(newState);
      if (engineRef.current) {
        engineRef.current.setState(newState);
        engineRef.current.invalidateCover();
      }
    } catch (err: any) {
      alert('Gagal memproses gambar: ' + err.message);
    }
    e.target.value = '';
  };

  // 2-Way Sync: Export element from Scrapbook to Timeline
  const handleExportToLinimasa = (el: ScrapbookElement) => {
    const memInput = exportScrapbookElementToMemoryInput(el, state);
    if (!memInput) {
      alert('Elemen ini belum bisa diekspor ke linimasa.');
      return;
    }
    if (onAddMemoryToTimeline) {
      onAddMemoryToTimeline(memInput);
      alert('Momen berhasil ditambahkan ke Linimasa Kenangan! ✔');
    }
  };

  // Total Spreads
  const totalLeaves = Math.floor(state.pages.length / 2) + 2;

  return (
    <div className="relative w-full h-[78vh] sm:h-[84vh] rounded-3xl overflow-hidden bg-[#e6d6bf] border border-[var(--border)] shadow-xl font-display select-none">
      {/* 3D WebGL Canvas Stage */}
      <div
        ref={containerRef}
        onClick={handleStageClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Canva 2D Overlay saat mode edit */}
      {editing && editPage && (
        <ScrapbookOverlay
          engine={engineRef.current}
          page={editPage}
          side={editSide}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={handleUpdateElement}
          onOpenProps={() => {}}
        />
      )}

      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-30">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="card px-3.5 py-2 shadow-md flex items-center gap-2 bg-[var(--surface)]/90 backdrop-blur-md">
            <BookOpen size={18} className="text-accent" />
            <span className="font-bold text-sm tracking-tight">{state.meta.title}</span>
          </div>

          <button
            onClick={() => setMode3d(!mode3d)}
            disabled={editing}
            className={`btn-soft text-xs shadow-md backdrop-blur-md ${
              mode3d ? 'text-accent border border-accent/40' : ''
            }`}
            title="Ganti Sudut Pandang"
          >
            {mode3d ? <Box size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{mode3d ? '3D View' : 'Flat View'}</span>
          </button>

          {/* Collaborative Sync Status Badge */}
          <div className="card px-3 py-1.5 shadow-md flex items-center gap-1.5 bg-[var(--surface)]/90 backdrop-blur-md text-[11px] font-bold">
            {syncStatus === 'saving' ? (
              <span className="text-amber-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden sm:inline">Menyimpan...</span>
              </span>
            ) : syncStatus === 'offline' ? (
              <span className="opacity-60 flex items-center gap-1.5" title="Tersimpan di perangkat lokal">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span className="hidden sm:inline">Lokal</span>
              </span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1.5" title="Tersinkron realtime ke cloud">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline">Tersinkron</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleUndo}
            disabled={historyIdxRef.current <= 0}
            className="btn-soft p-2 disabled:opacity-40 shadow-md backdrop-blur-md"
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdxRef.current >= historyRef.current.length - 1}
            className="btn-soft p-2 disabled:opacity-40 shadow-md backdrop-blur-md"
            title="Redo"
          >
            <Redo2 size={16} />
          </button>

          {!editing ? (
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setEditing(true);
                  setEditSide('left');
                  setSelectedId(null);
                }}
                disabled={turned < 2 || turned > state.pages.length / 2 + 1}
                className="btn-soft text-xs font-bold disabled:opacity-40 shadow-md backdrop-blur-md"
              >
                <Edit3 size={14} /> Edit Kiri
              </button>
              <button
                onClick={() => {
                  setEditing(true);
                  setEditSide('right');
                  setSelectedId(null);
                }}
                disabled={turned < 1 || turned > state.pages.length / 2}
                className="btn-warm text-xs font-bold disabled:opacity-40 shadow-md"
              >
                <Edit3 size={14} /> Edit Kanan
              </button>
              {(turned === 0 || turned === totalLeaves - 1) && (
                <button
                  onClick={() => setEditingCover(true)}
                  className="btn-soft text-xs font-bold shadow-md backdrop-blur-md text-accent border border-accent/40"
                >
                  <Palette size={14} /> Edit Sampul
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setEditing(false);
                setSelectedId(null);
              }}
              className="btn-warm text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-500"
            >
              ✓ Selesai Edit
            </button>
          )}

          <button
            onClick={handleAddLeaf}
            className="btn-soft p-2 shadow-md backdrop-blur-md text-accent"
            title="Tambah 2 Halaman Baru"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Toast Notifikasi Kolaborasi Realtime (Canva-style) */}
      {partnerNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-[var(--surface)]/95 border border-accent/40 text-accent font-bold text-xs shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-bounce">
          <span>🎨</span>
          <span>{partnerNotice}</span>
        </div>
      )}

      {/* Bottom Bar: Spread Navigator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 pointer-events-auto">
        <button
          onClick={() => engineRef.current?.prev()}
          disabled={turned <= 0 || editing}
          className="btn-soft p-2.5 rounded-full shadow-lg disabled:opacity-30 backdrop-blur-md"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="card px-4 py-1.5 shadow-lg backdrop-blur-md text-xs font-bold text-center">
          {turned === 0
            ? 'Sampul Depan'
            : turned === totalLeaves - 1
            ? 'Sampul Belakang'
            : `Halaman ${2 * turned - 2} – ${2 * turned - 1}`}
          <div className="text-[10px] opacity-60 font-medium">
            {turned + 1} dari {totalLeaves} spread
          </div>
        </div>

        <button
          onClick={() => engineRef.current?.next()}
          disabled={turned >= totalLeaves - 1 || editing}
          className="btn-soft p-2.5 rounded-full shadow-lg disabled:opacity-30 backdrop-blur-md"
          title="Halaman Selanjutnya"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Side Editor Panel saat mode edit aktif */}
      {editing && editPage && (
        <ScrapbookEditorPanel
          page={editPage}
          side={editSide}
          selectedId={selectedId}
          state={state}
          currentUser={currentUser}
          onClose={() => {
            setEditing(false);
            setSelectedId(null);
          }}
          onSwitchSide={() => {
            const nextSide = editSide === 'left' ? 'right' : 'left';
            setEditSide(nextSide);
            setSelectedId(null);
          }}
          onAddElement={handleAddElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onReorderElement={handleReorderElement}
          onUpdateBackground={handleUpdateBackground}
          onOpenMediaPool={(onPick) => {
            mediaPickCallbackRef.current = onPick;
            setMediaPickerOpen(true);
          }}
          onExportToLinimasa={handleExportToLinimasa}
        />
      )}

      {/* Cover Editor Panel */}
      {editingCover && (
        <div
          className="absolute top-0 right-0 h-full z-40 flex flex-col overflow-y-auto"
          style={{
            width: 280,
            backgroundColor: 'var(--surface, #ffffff)',
            color: 'var(--fg, #1a1a1a)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-6px 0 24px rgba(0,0,0,0.12)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
            <div>
              <p className="font-bold text-sm">🎨 Edit Sampul Buku</p>
              <p className="text-[10px] opacity-60">Ubah tampilan cover buku kenangan</p>
            </div>
            <button
              onClick={() => setEditingCover(false)}
              className="p-1.5 rounded-xl hover:bg-chip transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 space-y-5 text-xs">

            {/* Judul & Subtitle */}
            <div className="space-y-3">
              <p className="font-bold opacity-60 uppercase tracking-wider text-[10px]">Teks Sampul</p>
              <div>
                <label className="opacity-60 text-[10px] block mb-1">Judul Buku</label>
                <input
                  type="text"
                  value={state.meta.title}
                  onChange={(e) => handleUpdateMeta((m) => { m.title = e.target.value; })}
                  placeholder="Judul buku kenangan..."
                  className="field py-1.5 text-xs font-bold bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)]"
                />
              </div>
              <div>
                <label className="opacity-60 text-[10px] block mb-1">Subjudul / Keterangan</label>
                <input
                  type="text"
                  value={state.meta.subtitle}
                  onChange={(e) => handleUpdateMeta((m) => { m.subtitle = e.target.value; })}
                  placeholder="kumpulan momen kita..."
                  className="field py-1.5 text-xs bg-[var(--chip)] text-[var(--fg)] border border-[var(--border)]"
                />
              </div>
            </div>

            {/* Warna */}
            <div className="space-y-3">
              <p className="font-bold opacity-60 uppercase tracking-wider text-[10px]">Warna</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="opacity-60 text-[10px] block mb-1.5">Warna Sampul</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={state.meta.coverColor}
                      onChange={(e) => handleUpdateMeta((m) => { m.coverColor = e.target.value; })}
                      className="w-10 h-8 rounded-lg border-0 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] opacity-70">{state.meta.coverColor}</span>
                  </div>
                </div>
                <div>
                  <label className="opacity-60 text-[10px] block mb-1.5">Warna Aksen</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={state.meta.accent}
                      onChange={(e) => handleUpdateMeta((m) => { m.accent = e.target.value; })}
                      className="w-10 h-8 rounded-lg border-0 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] opacity-70">{state.meta.accent}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="opacity-60 text-[10px] block mb-1.5">Warna Meja 3D</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={state.meta.sceneColor}
                      onChange={(e) => {
                        handleUpdateMeta((m) => { m.sceneColor = e.target.value; });
                      }}
                      className="w-10 h-8 rounded-lg border-0 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] opacity-70">{state.meta.sceneColor}</span>
                  </div>
                </div>
              </div>

              {/* Preset warna cover */}
              <div>
                <label className="opacity-60 text-[10px] block mb-2">Preset Cepat</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { cover: '#c9677a', accent: '#f6d58e', label: 'Rose 🌹' },
                    { cover: '#7a5bb0', accent: '#f6a0c8', label: 'Lilac 💜' },
                    { cover: '#4a7c6f', accent: '#f6e49e', label: 'Sage 🌿' },
                    { cover: '#3b6fa8', accent: '#f6d58e', label: 'Ocean 🌊' },
                    { cover: '#8b4513', accent: '#f6e0b8', label: 'Coklat ☕' },
                    { cover: '#1a1a2e', accent: '#e94560', label: 'Galaxy 🌌' },
                  ].map((p) => (
                    <button
                      key={p.cover}
                      onClick={() => handleUpdateMeta((m) => { m.coverColor = p.cover; m.accent = p.accent; })}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 hover:scale-105 transition"
                      style={{
                        borderColor: state.meta.coverColor === p.cover ? p.accent : 'transparent',
                        backgroundColor: p.cover,
                      }}
                      title={p.label}
                    >
                      <span className="text-base">{p.label.split(' ')[1]}</span>
                      <span className="text-[9px] text-white/90 font-bold">{p.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Foto Cover */}
            <div className="space-y-2">
              <p className="font-bold opacity-60 uppercase tracking-wider text-[10px]">Foto Sampul Depan</p>
              <p className="opacity-60 text-[10px]">Foto akan dijadikan background sampul dengan overlay warna di atasnya.</p>

              {state.meta.coverImageBlobId && state.blobs[state.meta.coverImageBlobId] && (
                <div className="relative rounded-2xl overflow-hidden aspect-[3/4] border border-[var(--border)]">
                  <img
                    src={state.blobs[state.meta.coverImageBlobId]}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleUpdateMeta((m) => { m.coverImageBlobId = undefined; })}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                    title="Hapus foto sampul"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <button
                onClick={() => coverImgInputRef.current?.click()}
                className="btn-soft w-full py-2 justify-center text-xs font-bold"
              >
                <Upload size={14} />
                {state.meta.coverImageBlobId ? 'Ganti Foto Sampul' : 'Upload Foto Sampul'}
              </button>
              <input
                ref={coverImgInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverImageUpload}
                className="hidden"
              />
            </div>

            {/* Info */}
            <div className="p-2.5 rounded-xl bg-accent/5 border border-accent/20 text-[10px] opacity-80">
              💡 Perubahan warna & teks langsung terlihat di buku 3D. Balik halaman dulu ke sampul kalau belum terlihat.
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LetterModal letter={activeLetter} onClose={() => setActiveLetter(null)} />
      <PhotoLightboxModal
        photo={activePhoto}
        blobs={state.blobs}
        onClose={() => setActivePhoto(null)}
      />
      <LinkPreviewModal
        link={activeLink}
        blobs={state.blobs}
        onClose={() => setActiveLink(null)}
      />
      <SharedMediaPickerModal
        open={mediaPickerOpen}
        items={getSharedMediaPool(memories, state)}
        onSelect={(item) => {
          if (mediaPickCallbackRef.current) {
            mediaPickCallbackRef.current(item.url);
          }
        }}
        onUploadNew={async (file) => {
          try {
            const compressed = await compressImage(file, 1280, 0.82);
            const blobId = `bl_${Date.now()}`;
            handleAddElement(
              'photo',
              {
                photos: [blobId],
                frame: 'polaroid',
                caption: file.name.replace(/\.[^.]+$/, ''),
                date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
              },
              { [blobId]: compressed }
            );
          } catch (err: any) {
            alert('Gagal memproses gambar: ' + err.message);
          }
        }}
        onClose={() => setMediaPickerOpen(false)}
      />
    </div>
  );
}
