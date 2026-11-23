import type { Memory } from './types';
import { createLocalStorageService } from './memoryService';

const art = (c1: string, c2: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='800' height='600' fill='url(#g)'/><text x='400' y='320' font-size='56' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='700'>${label}</text></svg>`)}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const base = (n: number) => Date.now() - n * 86400000;

// Data kosong default untuk preview.
export const mockMemories = (): Memory[] => [];

export const defaultService = createLocalStorageService('relationship-timeline-v1', mockMemories);
