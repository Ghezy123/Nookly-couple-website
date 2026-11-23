import { q } from './db.js';
import { auth, bad } from './common.js';
import { now } from './couple.js';

const CATS = ['call', 'movie', 'games', 'milestone', 'food', 'other'];
const slotFn = (coupleId) => { const users = q.usersOfCouple.all(coupleId); return (id) => (users[0]?.id === id ? 'A' : 'B'); };
const shape = (m, slot) => ({ id: String(m.id), eventDate: m.event_date, title: m.title, description: m.description, category: m.category,
  images: JSON.parse(m.images), visibility: m.visibility, createdBy: slot(m.author_id), createdAt: m.created_at, updatedAt: m.updated_at });
const canSee = (m, me) => m && (m.author_id === me.id || m.visibility === 'shared');

// Mengembalikan string (pesan error) atau objek nilai yang sudah valid.
function validate(b, base) {
  const v = { ...base };
  if ('eventDate' in b) { if (!/^\d{4}-\d{2}-\d{2}$/.test(b.eventDate) || Number.isNaN(Date.parse(b.eventDate))) return 'Tanggal tidak valid'; v.eventDate = b.eventDate; }
  if ('title' in b) { const t = typeof b.title === 'string' ? b.title.trim() : ''; if (!t || t.length > 80) return 'Judul wajib diisi (maks 80 karakter)'; v.title = t; }
  if ('description' in b) { if (typeof b.description !== 'string' || b.description.length > 1000) return 'Deskripsi maksimal 1000 karakter'; v.description = b.description.trim(); }
  if ('category' in b) { if (!CATS.includes(b.category)) return 'Kategori tidak valid'; v.category = b.category; }
  if ('visibility' in b) { if (!['private', 'shared'].includes(b.visibility)) return 'Visibilitas tidak valid'; v.visibility = b.visibility; }
  if ('images' in b) {
    if (!Array.isArray(b.images) || b.images.length > 6 || b.images.some((i) => typeof i !== 'string' || !i.startsWith('data:image/') || i.length > 900000)) return 'Foto tidak valid (maks 6 foto, sudah dikompres)';
    v.images = b.images;
  }
  return v;
}

export function mountMemories(app) {
  app.get('/api/memories', auth, (req, res) => {
    const slot = slotFn(req.user.couple_id);
    res.json({ memories: q.visibleMemories.all(req.user.couple_id, req.user.id).map((m) => shape(m, slot)) });
  });
  app.post('/api/memories', auth, (req, res) => {
    const v = validate(req.body || {}, { description: '', category: 'other', images: [], visibility: 'private' });
    if (typeof v === 'string') return bad(res, v);
    if (!v.eventDate || !v.title) return bad(res, 'Tanggal dan judul wajib diisi');
    const t = now();
    const id = q.addMemory.run(req.user.couple_id, req.user.id, v.eventDate, v.title, v.description, v.category, JSON.stringify(v.images), v.visibility, t, t).lastInsertRowid;
    res.status(201).json({ memory: shape(q.memory.get(id, req.user.couple_id), slotFn(req.user.couple_id)) });
  });
  app.patch('/api/memories/:id', auth, (req, res) => {
    const m = q.memory.get(Number(req.params.id), req.user.couple_id);
    if (!canSee(m, req.user)) return bad(res, 'Momen tidak ditemukan', 404);
    const v = validate(req.body || {}, { eventDate: m.event_date, title: m.title, description: m.description, category: m.category, images: JSON.parse(m.images), visibility: m.visibility });
    if (typeof v === 'string') return bad(res, v);
    if (v.visibility !== m.visibility && m.author_id !== req.user.id) return bad(res, 'Hanya pembuat yang bisa mengubah visibilitas', 403);
    q.updMemory.run(v.eventDate, v.title, v.description, v.category, JSON.stringify(v.images), v.visibility, now(), m.id);
    res.json({ memory: shape(q.memory.get(m.id, req.user.couple_id), slotFn(req.user.couple_id)) });
  });
  app.delete('/api/memories/:id', auth, (req, res) => {
    const m = q.memory.get(Number(req.params.id), req.user.couple_id);
    if (!canSee(m, req.user)) return bad(res, 'Momen tidak ditemukan', 404);
    q.delMemory.run(m.id); res.json({ ok: true });
  });
}
