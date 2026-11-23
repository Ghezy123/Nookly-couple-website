import type { Memory, UserId } from './types';

// Aturan akses terpusat. Saat dihubungkan ke backend, aturan yang sama harus diterapkan di server.
export const canView = (m: Memory, me: UserId) => m.visibility === 'shared' || m.createdBy === me;
export const canEdit = (m: Memory, me: UserId) => canView(m, me);            // shared: keduanya boleh ubah isi
export const canDelete = (m: Memory, me: UserId) => canView(m, me);
export const canToggleVisibility = (m: Memory, me: UserId) => m.createdBy === me; // hanya pembuat yang boleh menyembunyikan/membagikan
