import { useCallback, useEffect, useState } from 'react';
import type { Memory, MemoryInput, UserId } from './types';
import type { MemoryService } from './memoryService';

export function useMemories(service: MemoryService, pollMs = 0) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try { setMemories(await service.list()); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [service]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!pollMs) return undefined;
    const t = setInterval(() => { if (!document.hidden) void refresh(); }, pollMs);
    return () => clearInterval(t);
  }, [pollMs, refresh]);

  // Menjalankan aksi lalu memuat ulang; mengembalikan true jika sukses.
  const run = async (fn: () => Promise<unknown>) => {
    try { setError(''); await fn(); await refresh(); return true; } catch (e) { setError((e as Error).message); return false; }
  };
  return {
    memories, loading, error, clearError: () => setError(''),
    add: (input: MemoryInput, user: UserId) => run(() => service.create(input, user)),
    update: (id: string, patch: Partial<MemoryInput>) => run(() => service.update(id, patch)),
    remove: (id: string) => run(() => service.remove(id)),
  };
}
