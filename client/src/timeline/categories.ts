import { Clapperboard, Flag, Gamepad2, Phone, Sparkles, Utensils, type LucideIcon } from 'lucide-react';
import type { Category } from './types';

export const CATEGORIES: { id: Category; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'call', label: 'Call', icon: Phone, color: 'var(--accent)' },
  { id: 'movie', label: 'Movie Date', icon: Clapperboard, color: 'var(--accent)' },
  { id: 'games', label: 'Games', icon: Gamepad2, color: 'var(--accent)' },
  { id: 'milestone', label: 'Milestone', icon: Flag, color: 'var(--accent)' },
  { id: 'food', label: 'Food & Hangout', icon: Utensils, color: 'var(--accent)' },
  { id: 'other', label: 'Other Fun', icon: Sparkles, color: 'var(--accent)' },
];
export const catOf = (id: Category) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[5];
