import crypto from 'crypto';
import { q } from './db.js';
import { bad, auth } from './common.js';

export const MOODS = ['happy', 'chill', 'love', 'sleepy', 'sad', 'angry'];
export const CATEGORIES = ['Curhat', 'Hari Ini', 'Lagi Kesel', 'Random', 'Appreciation'];
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const now = () => Date.now();
const code = () => { let c; do { c = Array.from({ length: 6 }, () => ALPHA[crypto.randomInt(ALPHA.length)]).join(''); } while (q.coupleByCode.get(c)); return c; };
export const text = (v, max) => (typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= max ? v.trim() : null);
const mood = (v) => (v == null ? null : MOODS.includes(v) ? v : undefined);
const cat = (v) => (v == null ? null : CATEGORIES.includes(v) ? v : undefined);

export function mountCouple(app) {
const publicUser = (u) => (u ? { id: u.id, name: u.name, mood: u.mood, moodAt: u.mood_at } : null);
const makeUser = (coupleId, name) => {
  const token = crypto.randomBytes(24).toString('hex');
  const id = q.addUser.run(coupleId, name, token, now()).lastInsertRowid;
  return { token, user: publicUser({ id, name, mood: null, mood_at: null }) };
};

// ---------- Auth / pasangan ----------
app.post('/api/auth/create', (req, res) => {
  const name = text(req.body.name, 20); if (!name) return bad(res, 'Nama wajib diisi (maks 20 karakter)');
  const inviteCode = code();
  const coupleId = q.addCouple.run(inviteCode, now()).lastInsertRowid;
  res.status(201).json({ ...makeUser(coupleId, name), inviteCode });
});
app.post('/api/auth/join', (req, res) => {
  const name = text(req.body.name, 20); if (!name) return bad(res, 'Nama wajib diisi (maks 20 karakter)');
  const couple = q.coupleByCode.get(String(req.body.code || '').trim().toUpperCase());
  if (!couple) return bad(res, 'Kode undangan tidak ditemukan', 404);
  if (q.usersOfCouple.all(couple.id).length >= 2) return bad(res, 'Ruang ini sudah berisi dua orang', 409);
  res.status(201).json({ ...makeUser(couple.id, name), inviteCode: couple.invite_code });
});
app.get('/api/me', auth, (req, res) => {
  const users = q.usersOfCouple.all(req.user.couple_id);
  const withSlot = (u) => (u ? { ...publicUser(u), slot: users[0].id === u.id ? 'A' : 'B' } : null);
  res.json({ user: withSlot(users.find((u) => u.id === req.user.id)), partner: withSlot(users.find((u) => u.id !== req.user.id)), inviteCode: q.coupleById.get(req.user.couple_id).invite_code });
});
app.put('/api/mood', auth, (req, res) => {
  const m = mood(req.body.mood); if (!m) return bad(res, 'Mood tidak valid');
  q.setMood.run(m, now(), req.user.id); res.json({ ok: true });
});
app.put('/api/user/name', auth, (req, res) => {
  const name = text(req.body.name, 20);
  if (!name) return bad(res, 'Nama wajib diisi (maks 20 karakter)');
  q.setName.run(name, req.user.id);
  res.json({ ok: true, name });
});

// ---------- Buku Kenangan 3D (Scrapbook) ----------
app.get('/api/scrapbook', auth, (req, res) => {
  const row = q.getScrapbook.get(req.user.couple_id);
  if (!row) return res.json({ state: null });
  res.json({
    state: JSON.parse(row.state),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  });
});
app.put('/api/scrapbook', auth, (req, res) => {
  const s = req.body.state;
  if (!s) return bad(res, 'State buku tidak valid');
  q.saveScrapbook.run(req.user.couple_id, JSON.stringify(s), now(), req.user.name);
  res.json({ ok: true });
});

// ---------- Cerita ----------
// Aturan akses utama: cerita pasangan HANYA terlihat bila visibility = 'shared'.
const canSee = (s, me) => s && (s.author_id === me.id || s.visibility === 'shared');
const shape = (s) => {
  const shared = s.visibility === 'shared';
  return {
    id: s.id, authorId: s.author_id, authorName: s.author_name, body: s.body, category: s.category, mood: s.mood,
    visibility: s.visibility, createdAt: s.created_at, editedAt: s.edited_at,
    replies: shared ? q.repliesOf.all(s.id).map((r) => ({ id: r.id, authorId: r.author_id, authorName: r.author_name, body: r.body, mood: r.mood, createdAt: r.created_at })) : [],
    reactions: shared ? q.reactionsOf.all(s.id).map((r) => ({ userId: r.user_id, userName: r.user_name, mood: r.mood })) : [],
  };
};
const loadStory = (req, res) => {
  const s = q.story.get(Number(req.params.id), req.user.couple_id);
  if (!canSee(s, req.user)) { bad(res, 'Cerita tidak ditemukan', 404); return null; }
  return s;
};

app.get('/api/stories', auth, (req, res) => res.json({ stories: q.visibleStories.all(req.user.couple_id, req.user.id).map(shape) }));
app.post('/api/stories', auth, (req, res) => {
  const body = text(req.body.body, 5000), c = cat(req.body.category), m = mood(req.body.mood);
  const visibility = req.body.visibility ?? 'private';
  if (!body) return bad(res, 'Isi cerita tidak boleh kosong');
  if (c === undefined || m === undefined || !['private', 'shared'].includes(visibility)) return bad(res, 'Data tidak valid');
  const id = q.addStory.run(req.user.couple_id, req.user.id, body, c, m, visibility, now()).lastInsertRowid;
  res.status(201).json({ id });
});
app.patch('/api/stories/:id', auth, (req, res) => {
  const s = loadStory(req, res); if (!s) return;
  if (s.author_id !== req.user.id) return bad(res, 'Hanya penulis yang bisa mengubah cerita', 403);
  const body = 'body' in req.body ? text(req.body.body, 5000) : s.body;
  const c = 'category' in req.body ? cat(req.body.category) : s.category;
  const m = 'mood' in req.body ? mood(req.body.mood) : s.mood;
  const v = 'visibility' in req.body ? req.body.visibility : s.visibility;
  if (!body || c === undefined || m === undefined || !['private', 'shared'].includes(v)) return bad(res, 'Data tidak valid');
  q.updStory.run(body, c, m, v, body !== s.body ? now() : s.edited_at, s.id);
  res.json({ ok: true });
});
app.delete('/api/stories/:id', auth, (req, res) => {
  const s = loadStory(req, res); if (!s) return;
  if (s.author_id !== req.user.id) return bad(res, 'Hanya penulis yang bisa menghapus cerita', 403);
  q.delStory.run(s.id); res.json({ ok: true });
});

// ---------- Balasan & reaksi mood (hanya pada cerita yang dibagikan) ----------
app.post('/api/stories/:id/replies', auth, (req, res) => {
  const s = loadStory(req, res); if (!s) return;
  if (s.visibility !== 'shared') return bad(res, 'Cerita ini masih private. Bagikan dulu untuk membuka balasan.', 403);
  const body = text(req.body.body, 1000), m = mood(req.body.mood);
  if (!body || m === undefined) return bad(res, 'Balasan tidak valid');
  res.status(201).json({ id: q.addReply.run(s.id, req.user.id, body, m, now()).lastInsertRowid });
});
app.delete('/api/stories/:id/replies/:rid', auth, (req, res) => {
  const s = loadStory(req, res); if (!s) return;
  const r = q.reply.get(Number(req.params.rid), s.id);
  if (!r) return bad(res, 'Balasan tidak ditemukan', 404);
  if (r.author_id !== req.user.id) return bad(res, 'Hanya penulis yang bisa menghapus balasan', 403);
  q.delReply.run(r.id); res.json({ ok: true });
});
app.put('/api/stories/:id/reaction', auth, (req, res) => {
  const s = loadStory(req, res); if (!s) return;
  if (s.visibility !== 'shared') return bad(res, 'Cerita ini masih private', 403);
  const m = mood(req.body.mood); if (m === undefined) return bad(res, 'Mood tidak valid');
  if (m === null) q.delReaction.run(s.id, req.user.id); else q.setReaction.run(s.id, req.user.id, m);
  res.json({ ok: true });
});

}
