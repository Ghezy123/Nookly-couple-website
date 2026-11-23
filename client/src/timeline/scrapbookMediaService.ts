import type { Memory, MemoryInput, UserId } from './types';
import type { ScrapbookState, ScrapbookPage, ScrapbookElement, PhotoElement } from './scrapbookTypes';

export interface SharedMediaItem {
  id: string;
  url: string;
  source: 'linimasa' | 'scrapbook';
  title?: string;
  date?: string;
  memoryId?: string;
}

/**
 * Mengumpulkan semua foto dari linimasa dan buku scrapbook ke dalam 1 pool galeri terpadu.
 */
export function getSharedMediaPool(memories: Memory[], state: ScrapbookState): SharedMediaItem[] {
  const map = new Map<string, SharedMediaItem>();

  // 1. Ambil dari Linimasa
  for (const m of memories) {
    if (Array.isArray(m.images)) {
      m.images.forEach((imgUrl, idx) => {
        if (!imgUrl) return;
        // Gunakan kombinasi memoryId + index sebagai key yang unik, bukan konten URL
        // agar foto dari momen berbeda tidak dianggap duplikat satu sama lain
        const key = `mem-${m.id}-${idx}`;
        if (!map.has(key)) {
          map.set(key, {
            id: `mem-${m.id}-${idx}`,
            url: imgUrl,
            source: 'linimasa',
            title: m.title,
            date: m.eventDate,
            memoryId: m.id,
          });
        }
      });
    }
  }

  // 2. Ambil dari Scrapbook Blobs / Elements
  for (const p of state.pages) {
    for (const el of p.elements) {
      if (el.type === 'photo') {
        const photoEl = el as PhotoElement;
        photoEl.photos.forEach((blobId, idx) => {
          const dataUrl = state.blobs[blobId] || blobId;
          if (!dataUrl) return;
          // Gunakan blobId + elemen id sebagai key unik
          const key = `sc-${el.id}-${blobId}-${idx}`;
          if (!map.has(key)) {
            map.set(key, {
              id: `sc-${el.id}-${idx}`,
              url: dataUrl,
              source: 'scrapbook',
              title: photoEl.caption || 'Foto Scrapbook',
              date: photoEl.date,
            });
          }
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Mengimpor satu Momen dari Linimasa langsung menjadi elemen Polaroid + Stiker di Scrapbook Page.
 */
export function importMemoryToScrapbook(
  memory: Memory,
  targetPage: ScrapbookPage,
  state: ScrapbookState,
  currentUser: UserId
): ScrapbookElement[] {
  const createdElements: ScrapbookElement[] = [];

  // Masukkan gambar ke blobs scrapbook jika belum ada
  const photoBlobIds: string[] = [];
  for (const imgUrl of memory.images) {
    const blobId = `bl_mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    state.blobs[blobId] = imgUrl;
    photoBlobIds.push(blobId);
  }

  // 1. Elemen Foto Polaroid
  if (photoBlobIds.length > 0) {
    const photoEl: PhotoElement = {
      id: `el_${Date.now()}_ph`,
      type: 'photo',
      photos: photoBlobIds,
      frame: 'polaroid',
      caption: memory.title,
      date: memory.eventDate,
      x: 300 + (Math.random() * 40 - 20),
      y: 380 + (Math.random() * 40 - 20),
      w: 320,
      h: 370,
      rotation: Math.round((Math.random() * 8 - 4) * 10) / 10,
      opacity: 1,
      lock: true,
      createdBy: currentUser,
      updatedBy: currentUser,
      sourceMemoryId: memory.id,
    };
    createdElements.push(photoEl);
    targetPage.elements.push(photoEl);

    // Tambah stiker washi tape pemanis di atas polaroid
    const washiEl: ScrapbookElement = {
      id: `el_${Date.now()}_washi`,
      type: 'sticker',
      kind: 'builtin',
      name: 'washi',
      color: '#f4a6b8',
      x: photoEl.x,
      y: photoEl.y - photoEl.h / 2 + 10,
      w: 180,
      h: 46,
      rotation: photoEl.rotation - 3,
      opacity: 0.9,
      lock: false,
      createdBy: currentUser,
      updatedBy: currentUser,
    };
    createdElements.push(washiEl);
    targetPage.elements.push(washiEl);
  }

  return createdElements;
}

/**
 * Mengekspor elemen foto/surat dari Scrapbook menjadi MemoryInput siap simpan di Linimasa.
 */
export function exportScrapbookElementToMemoryInput(
  el: ScrapbookElement,
  state: ScrapbookState
): MemoryInput | null {
  const today = new Date().toISOString().slice(0, 10);

  if (el.type === 'photo') {
    const p = el as PhotoElement;
    const images = p.photos.map((id) => state.blobs[id] || id).filter(Boolean);
    if (!images.length) return null;

    return {
      title: p.caption || 'Kenangan Buku Scrapbook',
      description: 'Diimpor dari lembaran Buku Kenangan.',
      eventDate: p.date || today,
      category: 'other',
      images,
      visibility: 'shared',
    };
  }

  if (el.type === 'letter') {
    return {
      title: el.title || 'Surat di Buku Kenangan',
      description: el.body || 'Surat cinta tersimpan di buku kenangan.',
      eventDate: el.date || today,
      category: 'other',
      images: [],
      visibility: 'shared',
    };
  }

  return null;
}
