import type { Memory, MemoryInput, UserId } from './types';

// Kontrak service. Untuk integrasi backend: implementasikan interface ini (REST/GraphQL/dll) lalu kirim lewat prop `service`.
export interface MemoryService {
  list(): Promise<Memory[]>;
  create(input: MemoryInput, userId: UserId): Promise<Memory>;
  update(id: string, patch: Partial<MemoryInput>): Promise<Memory>;
  remove(id: string): Promise<void>;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function createLocalStorageService(key: string, seed: () => Memory[] = () => []): MemoryService {
  const read = (): Memory[] => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) { const s = seed(); write(s); return s; }
      return JSON.parse(raw) as Memory[];
    } catch { return []; }
  };
  const write = (items: Memory[]) => {
    try { localStorage.setItem(key, JSON.stringify(items)); }
    catch { throw new Error('Penyimpanan penuh. Kurangi jumlah/ukuran foto atau hapus beberapa momen.'); }
  };
  return {
    async list() { return read(); },
    async create(input, userId) {
      const now = Date.now();
      const m: Memory = { ...input, id: uid(), createdBy: userId, createdAt: now, updatedAt: now };
      write([m, ...read()]);
      return m;
    },
    async update(id, patch) {
      const items = read(); const i = items.findIndex((m) => m.id === id);
      if (i < 0) throw new Error('Momen tidak ditemukan');
      items[i] = { ...items[i], ...patch, updatedAt: Date.now() };
      write(items); return items[i];
    },
    async remove(id) { write(read().filter((m) => m.id !== id)); },
  };
}
