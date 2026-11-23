import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ScrapbookElement, ScrapbookPage } from './scrapbookTypes';
import { PW, PH } from './scrapbookRenderer';
import type { ScrapbookEngine } from './scrapbookEngine';

interface ScrapbookOverlayProps {
  engine: ScrapbookEngine | null;
  page: ScrapbookPage | null;
  side: 'left' | 'right';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (el: ScrapbookElement, isFinished?: boolean) => void;
  onOpenProps: () => void;
}

export function ScrapbookOverlay({
  engine,
  page,
  side,
  selectedId,
  onSelect,
  onChange,
  onOpenProps,
}: ScrapbookOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const gestureRef = useRef<{
    type: 'move' | 'resize' | 'rotate';
    targetId: string;
    startPage: { x: number; y: number };
    startEl: { x: number; y: number; w: number; h: number; rotation: number };
    handle?: number[];
  } | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const pendingChangeRef = useRef<{ el: ScrapbookElement; isFinished: boolean } | null>(null);

  const selectedEl = page?.elements.find((e) => e.id === selectedId) || null;

  // Cleanup pending RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Sinkronisasi posisi overlay dengan proyeksi 3D halaman buku
  const updateRect = useCallback(() => {
    if (!engine) return;
    const r = engine.getPageRect(side);
    if (r) {
      setRect((prev) => {
        if (!prev || Math.abs(prev.left - r.left) > 1 || Math.abs(prev.width - r.width) > 1) {
          return r;
        }
        return prev;
      });
    }
  }, [engine, side]);

  useEffect(() => {
    let handle = 0;
    const loop = () => {
      updateRect();
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [updateRect]);

  // Konversi koordinat mouse/pointer ke koordinat 600x800 kanvas halaman secara presisi
  const toPageCoords = (e: React.PointerEvent) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const r = overlayRef.current.getBoundingClientRect();
    const currentScale = r.width / PW;
    return {
      x: (e.clientX - r.left) / currentScale,
      y: (e.clientY - r.top) / currentScale,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!page || !overlayRef.current) return;
    const P = toPageCoords(e);
    const target = e.target as HTMLElement;
    const handleAttr = target.dataset.handle;

    // 1. Klik pada handle (resize, rotate, atau drag body) dari elemen yang sedang terpilih
    if (handleAttr && selectedEl) {
      const startEl = {
        x: selectedEl.x,
        y: selectedEl.y,
        w: selectedEl.w,
        h: selectedEl.h,
        rotation: selectedEl.rotation,
      };

      if (handleAttr === 'rot') {
        gestureRef.current = { type: 'rotate', targetId: selectedEl.id, startPage: P, startEl };
      } else if (handleAttr === 'move') {
        gestureRef.current = { type: 'move', targetId: selectedEl.id, startPage: P, startEl };
      } else {
        gestureRef.current = {
          type: 'resize',
          targetId: selectedEl.id,
          startPage: P,
          startEl,
          handle: handleAttr.split(',').map(Number),
        };
      }
      overlayRef.current.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    // 2. Hit testing: Cari elemen mana yang diklik di halaman
    const hit = page.elements
      .slice()
      .reverse()
      .find((el) => {
        const rad = (-el.rotation * Math.PI) / 180;
        const cos = Math.cos(rad),
          sin = Math.sin(rad);
        const dx = P.x - el.x,
          dy = P.y - el.y;
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        // Berikan padding toleransi sentuh 16px agar mudah diklik
        const hitW = (el.w + 16) / 2;
        const hitH = (el.h + 16) / 2;
        return Math.abs(lx) <= hitW && Math.abs(ly) <= hitH;
      });

    if (hit) {
      onSelect(hit.id);
      gestureRef.current = {
        type: 'move',
        targetId: hit.id,
        startPage: P,
        startEl: { x: hit.x, y: hit.y, w: hit.w, h: hit.h, rotation: hit.rotation },
      };
      overlayRef.current.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else {
      onSelect(null);
      gestureRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || !page || !overlayRef.current) return;
    const targetEl = page.elements.find((el) => el.id === g.targetId);
    if (!targetEl) return;

    const P = toPageCoords(e);

    if (g.type === 'move') {
      targetEl.x = Math.max(0, Math.min(PW, Math.round(g.startEl.x + P.x - g.startPage.x)));
      targetEl.y = Math.max(0, Math.min(PH, Math.round(g.startEl.y + P.y - g.startPage.y)));
    } else if (g.type === 'rotate') {
      let a = (Math.atan2(P.y - targetEl.y, P.x - targetEl.x) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      while (a > 180) a -= 360;
      while (a < -180) a += 360;
      targetEl.rotation = Math.round(a * 10) / 10;
    } else if (g.type === 'resize' && g.handle) {
      const [sx, sy] = g.handle;
      const rad = (g.startEl.rotation * Math.PI) / 180;
      const cos = Math.cos(-rad),
        sin = Math.sin(-rad);
      const dx = P.x - g.startPage.x,
        dy = P.y - g.startPage.y;
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;

      let nw = g.startEl.w,
        nh = g.startEl.h;
      if (sx) nw = g.startEl.w + sx * lx;
      if (sy) nh = g.startEl.h + sy * ly;

      if (targetEl.lock && sx && sy) {
        const k = Math.max(nw / g.startEl.w, nh / g.startEl.h);
        nw = g.startEl.w * k;
        nh = g.startEl.h * k;
      }

      nw = Math.max(28, nw);
      nh = Math.max(28, nh);

      const cx = (sx * (nw - g.startEl.w)) / 2;
      const cy = (sy * (nh - g.startEl.h)) / 2;
      const wx = cx * Math.cos(rad) - cy * Math.sin(rad);
      const wy = cx * Math.sin(rad) + cy * Math.cos(rad);

      targetEl.w = Math.round(nw);
      targetEl.h = Math.round(nh);
      targetEl.x = Math.round(g.startEl.x + wx);
      targetEl.y = Math.round(g.startEl.y + wy);
    }

    // Throttle rendering ke 60 FPS menggunakan requestAnimationFrame agar geser sangat ringan dan mulus
    pendingChangeRef.current = { el: targetEl, isFinished: false };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (pendingChangeRef.current) {
          onChange(pendingChangeRef.current.el, pendingChangeRef.current.isFinished);
          pendingChangeRef.current = null;
        }
      });
    }
  };

  const handlePointerUp = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingChangeRef.current = null;

    if (gestureRef.current && page) {
      const targetEl = page.elements.find((el) => el.id === gestureRef.current!.targetId);
      if (targetEl) {
        onChange(targetEl, true); // Simpan history ke storage
      }
    }
    gestureRef.current = null;
  };

  if (!rect) return null;
  const scale = rect.width / PW;

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={onOpenProps}
      className="absolute z-20 cursor-default select-none touch-none"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    >
      {selectedEl && (
        <div
          className="absolute border-2 border-accent rounded-sm pointer-events-auto"
          style={{
            left: (selectedEl.x - selectedEl.w / 2) * scale,
            top: (selectedEl.y - selectedEl.h / 2) * scale,
            width: selectedEl.w * scale,
            height: selectedEl.h * scale,
            transform: `rotate(${selectedEl.rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Area tengah untuk drag / pindah elemen */}
          <div
            data-handle="move"
            className="absolute inset-0 cursor-move bg-accent/5 hover:bg-accent/10 transition"
            title="Klik & seret untuk memindahkan elemen"
          />

          {/* Rotation Handle di atas */}
          <div
            data-handle="rot"
            className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent border-2 border-white shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center z-10"
            title="Putar elemen (Tahan Shift untuk snap 15°)"
          />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-accent pointer-events-none" />

          {/* 8 Resize Handles */}
          {[
            { pos: '-top-1.5 -left-1.5', h: [-1, -1], cur: 'nwse-resize' },
            { pos: '-top-1.5 left-1/2 -translate-x-1/2', h: [0, -1], cur: 'ns-resize' },
            { pos: '-top-1.5 -right-1.5', h: [1, -1], cur: 'nesw-resize' },
            { pos: 'top-1/2 -translate-y-1/2 -right-1.5', h: [1, 0], cur: 'ew-resize' },
            { pos: '-bottom-1.5 -right-1.5', h: [1, 1], cur: 'nwse-resize' },
            { pos: '-bottom-1.5 left-1/2 -translate-x-1/2', h: [0, 1], cur: 'ns-resize' },
            { pos: '-bottom-1.5 -left-1.5', h: [-1, 1], cur: 'nesw-resize' },
            { pos: 'top-1/2 -translate-y-1/2 -left-1.5', h: [-1, 0], cur: 'ew-resize' },
          ].map((item, idx) => (
            <div
              key={idx}
              data-handle={item.h.join(',')}
              className={`absolute ${item.pos} w-3 h-3 bg-white border-2 border-accent rounded-sm shadow-sm z-10`}
              style={{ cursor: item.cur }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
