import { api } from '../api';
import type { MemoryService } from './memoryService';
import type { Memory } from './types';

// Implementasi MemoryService ke backend Couple Hub (data dibagi antar-pasangan; aturan akses diterapkan di server).
export const createRestMemoryService = (): MemoryService => ({
  list: async () => (await api.memories()).memories as Memory[],
  create: async (input) => (await api.addMemory(input)).memory as Memory,
  update: async (id, patch) => (await api.editMemory(id, patch)).memory as Memory,
  remove: async (id) => { await api.delMemory(id); },
});
