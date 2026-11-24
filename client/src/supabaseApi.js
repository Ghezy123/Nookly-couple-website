import { supabase } from './supabase.js';

const KEY = 'couple-token';
export const getToken = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () =>
  Array.from({ length: 6 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join('');

const randomToken = () =>
  Array.from({ length: 32 }, () => ((Math.random() * 16) | 0).toString(16)).join('');

// Helper untuk mengambil data user aktif berdasarkan token
async function getCurrentContext() {
  const token = getToken();
  if (!token) throw Object.assign(new Error('Belum masuk'), { status: 401 });

  const { data: user, error: uErr } = await supabase
    .from('users')
    .select('*')
    .eq('token', token)
    .single();

  if (uErr || !user) throw Object.assign(new Error('Sesi tidak valid'), { status: 401 });

  const { data: couple, error: cErr } = await supabase
    .from('couples')
    .select('*')
    .eq('id', user.couple_id)
    .single();

  if (cErr || !couple) throw Object.assign(new Error('Pasangan tidak ditemukan'), { status: 404 });

  const { data: coupleUsers, error: cuErr } = await supabase
    .from('users')
    .select('*')
    .eq('couple_id', user.couple_id)
    .order('created_at', { ascending: true });

  if (cuErr) throw new Error(cuErr.message);

  const slotMap = new Map();
  if (coupleUsers && coupleUsers.length > 0) {
    slotMap.set(coupleUsers[0].id, 'A');
    if (coupleUsers[1]) slotMap.set(coupleUsers[1].id, 'B');
  }

  return { user, couple, coupleUsers, slotMap };
}

export const supabaseApi = {
  create: async (name, password) => {
    const cleanName = String(name || '').trim().slice(0, 20);
    if (!cleanName) throw new Error('Nama wajib diisi (maks 20 karakter)');
    const cleanPassword = String(password || '').trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error('Kata sandi minimal 4 karakter');
    }

    const inviteCode = randomCode();
    const now = Date.now();
    const token = randomToken();

    // 1. Buat couple
    const { data: couple, error: cErr } = await supabase
      .from('couples')
      .insert({ invite_code: inviteCode, created_at: now })
      .select()
      .single();

    if (cErr) throw new Error(cErr.message);

    // 2. Buat user pertama
    const { data: user, error: uErr } = await supabase
      .from('users')
      .insert({ couple_id: couple.id, name: cleanName, token, password: cleanPassword, created_at: now })
      .select()
      .single();

    if (uErr) throw new Error(uErr.message);

    return {
      token,
      user: { id: user.id, name: user.name, mood: null, moodAt: null },
      inviteCode: couple.invite_code,
    };
  },

  join: async (code, name, password) => {
    const cleanName = String(name || '').trim().slice(0, 20);
    if (!cleanName) throw new Error('Nama wajib diisi (maks 20 karakter)');
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanPassword = String(password || '').trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error('Kata sandi minimal 4 karakter');
    }

    const { data: couple, error: cErr } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', cleanCode)
      .single();

    if (cErr || !couple) throw new Error('Kode undangan tidak ditemukan');

    const { data: users, error: uListErr } = await supabase
      .from('users')
      .select('*')
      .eq('couple_id', couple.id);

    if (uListErr) throw new Error(uListErr.message);

    const existingUsers = users || [];

    // 1. Cek apakah pengguna ini sudah terdaftar di ruang ini (Re-login / Masuk kembali)
    const match = existingUsers.find(
      (u) => u.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (match) {
      if (match.password) {
        if (match.password !== cleanPassword) {
          throw new Error('Kata sandi salah. Silakan periksa kembali kata sandimu.');
        }
      } else {
        // Akun lama yang belum punya password (seperti Ghezy):
        // Kunci dan amankan dengan password baru yang diinput!
        await supabase
          .from('users')
          .update({ password: cleanPassword })
          .eq('id', match.id);
      }

      // Masuk kembali ke akun yang sudah ada
      return {
        token: match.token,
        user: { id: match.id, name: match.name, mood: match.mood, moodAt: match.mood_at },
        inviteCode: couple.invite_code,
      };
    }

    // 2. Jika bukan akun yang sudah ada, cek apakah ruang sudah penuh
    if (existingUsers.length >= 2) {
      const names = existingUsers.map((u) => u.name).join(' atau ');
      throw new Error(`Ruang ini sudah terisi oleh ${names}. Masukkan namamu yang terdaftar beserta kata sandinya.`);
    }

    // 3. Daftarkan sebagai pasangan baru (pengguna ke-2)
    const now = Date.now();
    const token = randomToken();

    const { data: user, error: uErr } = await supabase
      .from('users')
      .insert({ couple_id: couple.id, name: cleanName, token, password: cleanPassword, created_at: now })
      .select()
      .single();

    if (uErr) throw new Error(uErr.message);

    return {
      token,
      user: { id: user.id, name: user.name, mood: null, moodAt: null },
      inviteCode: couple.invite_code,
    };
  },

  me: async () => {
    const { user, couple, coupleUsers, slotMap } = await getCurrentContext();

    const meData = {
      id: user.id,
      name: user.name,
      mood: user.mood,
      moodAt: user.mood_at,
      slot: slotMap.get(user.id) || 'A',
    };

    const partner = coupleUsers.find((u) => u.id !== user.id);
    const partnerData = partner
      ? {
          id: partner.id,
          name: partner.name,
          mood: partner.mood,
          moodAt: partner.mood_at,
          slot: slotMap.get(partner.id) || 'B',
        }
      : null;

    return {
      user: meData,
      partner: partnerData,
      inviteCode: couple.invite_code,
    };
  },

  setMood: async (mood) => {
    const { user } = await getCurrentContext();
    const now = Date.now();
    const { error } = await supabase
      .from('users')
      .update({ mood, mood_at: now })
      .eq('id', user.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  },

  setName: async (name) => {
    const { user } = await getCurrentContext();
    const cleanName = String(name || '').trim().slice(0, 20);
    if (!cleanName) throw new Error('Nama wajib diisi (maks 20 karakter)');
    const { error } = await supabase
      .from('users')
      .update({ name: cleanName })
      .eq('id', user.id);

    if (error) throw new Error(error.message);
    return { ok: true, name: cleanName };
  },

  stories: async () => {
    const { user, coupleUsers } = await getCurrentContext();
    const userNames = new Map(coupleUsers.map((u) => [u.id, u.name]));

    // Ambil cerita couple: milik sendiri ATAU shared
    const { data: storiesData, error: sErr } = await supabase
      .from('stories')
      .select('*')
      .eq('couple_id', user.couple_id)
      .or(`author_id.eq.${user.id},visibility.eq.shared`)
      .order('created_at', { ascending: false });

    if (sErr) throw new Error(sErr.message);
    if (!storiesData || storiesData.length === 0) return { stories: [] };

    const storyIds = storiesData.map((s) => s.id);

    // Ambil balasan
    const { data: repliesData } = await supabase
      .from('replies')
      .select('*')
      .in('story_id', storyIds)
      .order('created_at', { ascending: true });

    // Ambil reaksi
    const { data: reactionsData } = await supabase
      .from('reactions')
      .select('*')
      .in('story_id', storyIds);

    const repliesByStory = new Map();
    (repliesData || []).forEach((r) => {
      const arr = repliesByStory.get(r.story_id) || [];
      arr.push({
        id: r.id,
        authorId: r.author_id,
        authorName: userNames.get(r.author_id) || 'Pasangan',
        body: r.body,
        mood: r.mood,
        createdAt: r.created_at,
      });
      repliesByStory.set(r.story_id, arr);
    });

    const reactionsByStory = new Map();
    (reactionsData || []).forEach((rx) => {
      const arr = reactionsByStory.get(rx.story_id) || [];
      arr.push({
        userId: rx.user_id,
        userName: userNames.get(rx.user_id) || 'Pasangan',
        mood: rx.mood,
      });
      reactionsByStory.set(rx.story_id, arr);
    });

    const shaped = storiesData.map((s) => {
      const isShared = s.visibility === 'shared';
      return {
        id: s.id,
        authorId: s.author_id,
        authorName: userNames.get(s.author_id) || (s.author_id === user.id ? 'Kamu' : 'Pasangan'),
        body: s.body,
        category: s.category,
        mood: s.mood,
        visibility: s.visibility,
        createdAt: s.created_at,
        editedAt: s.edited_at,
        replies: isShared ? repliesByStory.get(s.id) || [] : [],
        reactions: isShared ? reactionsByStory.get(s.id) || [] : [],
      };
    });

    return { stories: shaped };
  },

  addStory: async ({ body, category, mood, visibility = 'private' }) => {
    const { user } = await getCurrentContext();
    const cleanBody = String(body || '').trim();
    if (!cleanBody) throw new Error('Cerita tidak boleh kosong');

    const now = Date.now();
    const { data, error } = await supabase
      .from('stories')
      .insert({
        couple_id: user.couple_id,
        author_id: user.id,
        body: cleanBody,
        category: category || null,
        mood: mood || null,
        visibility,
        created_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: data.id };
  },

  editStory: async (id, patch) => {
    const { user } = await getCurrentContext();
    const now = Date.now();

    const updateData = { edited_at: now };
    if ('body' in patch) updateData.body = String(patch.body).trim();
    if ('category' in patch) updateData.category = patch.category;
    if ('mood' in patch) updateData.mood = patch.mood;
    if ('visibility' in patch) updateData.visibility = patch.visibility;

    const { error } = await supabase
      .from('stories')
      .update(updateData)
      .eq('id', id)
      .eq('author_id', user.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  },

  delStory: async (id) => {
    const { user } = await getCurrentContext();
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  },

  addReply: async (storyId, { body, mood }) => {
    const { user } = await getCurrentContext();
    const cleanBody = String(body || '').trim();
    if (!cleanBody) throw new Error('Balasan tidak boleh kosong');

    const now = Date.now();
    const { data, error } = await supabase
      .from('replies')
      .insert({
        story_id: storyId,
        author_id: user.id,
        body: cleanBody,
        mood: mood || null,
        created_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: data.id };
  },

  delReply: async (storyId, replyId) => {
    const { user } = await getCurrentContext();
    const { error } = await supabase
      .from('replies')
      .delete()
      .eq('id', replyId)
      .eq('author_id', user.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  },

  react: async (storyId, mood) => {
    const { user } = await getCurrentContext();
    if (!mood) {
      await supabase
        .from('reactions')
        .delete()
        .eq('story_id', storyId)
        .eq('user_id', user.id);
      return { ok: true };
    }

    const { error } = await supabase
      .from('reactions')
      .upsert(
        { story_id: storyId, user_id: user.id, mood },
        { onConflict: 'story_id,user_id' }
      );

    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // ---------- Kenangan (Memories) ----------
  memories: async () => {
    const { user, slotMap } = await getCurrentContext();

    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('couple_id', user.couple_id)
      .or(`author_id.eq.${user.id},visibility.eq.shared`)
      .order('event_date', { ascending: false });

    if (error) throw new Error(error.message);

    const shaped = (data || []).map((m) => ({
      id: String(m.id),
      eventDate: m.event_date,
      title: m.title,
      description: m.description,
      category: m.category,
      images: typeof m.images === 'string' ? JSON.parse(m.images) : m.images || [],
      visibility: m.visibility,
      createdBy: slotMap.get(m.author_id) || 'A',
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    return { memories: shaped };
  },

  addMemory: async (input) => {
    const { user, slotMap } = await getCurrentContext();
    const now = Date.now();

    const { data, error } = await supabase
      .from('memories')
      .insert({
        couple_id: user.couple_id,
        author_id: user.id,
        event_date: input.eventDate,
        title: input.title.trim(),
        description: (input.description || '').trim(),
        category: input.category || 'other',
        images: input.images || [],
        visibility: input.visibility || 'private',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const shaped = {
      id: String(data.id),
      eventDate: data.event_date,
      title: data.title,
      description: data.description,
      category: data.category,
      images: typeof data.images === 'string' ? JSON.parse(data.images) : data.images || [],
      visibility: data.visibility,
      createdBy: slotMap.get(data.author_id) || 'A',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { memory: shaped };
  },

  editMemory: async (id, patch) => {
    const { user, slotMap } = await getCurrentContext();
    const now = Date.now();

    const updateData = { updated_at: now };
    if ('eventDate' in patch) updateData.event_date = patch.eventDate;
    if ('title' in patch) updateData.title = patch.title.trim();
    if ('description' in patch) updateData.description = (patch.description || '').trim();
    if ('category' in patch) updateData.category = patch.category;
    if ('images' in patch) updateData.images = patch.images;
    if ('visibility' in patch) updateData.visibility = patch.visibility;

    const { data, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const shaped = {
      id: String(data.id),
      eventDate: data.event_date,
      title: data.title,
      description: data.description,
      category: data.category,
      images: typeof data.images === 'string' ? JSON.parse(data.images) : data.images || [],
      visibility: data.visibility,
      createdBy: slotMap.get(data.author_id) || 'A',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { memory: shaped };
  },

  delMemory: async (id) => {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // ---------- Buku Kenangan 3D Kolaboratif (Scrapbook) ----------
  getScrapbook: async () => {
    const { user } = await getCurrentContext();
    const { data, error } = await supabase
      .from('scrapbooks')
      .select('*')
      .eq('couple_id', user.couple_id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Gagal memuat scrapbook dari Supabase', error);
      return null;
    }
    if (!data) return null;
    return {
      state: typeof data.state === 'string' ? JSON.parse(data.state) : data.state,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
      coupleId: user.couple_id,
    };
  },

  saveScrapbook: async (scrapbookState) => {
    const { user } = await getCurrentContext();
    const now = Date.now();
    const { error } = await supabase
      .from('scrapbooks')
      .upsert(
        {
          couple_id: user.couple_id,
          state: scrapbookState,
          updated_at: now,
          updated_by: user.name,
        },
        { onConflict: 'couple_id' }
      );

    if (error) {
      console.warn('Gagal menyimpan scrapbook ke Supabase', error);
      throw new Error(error.message);
    }
    return { ok: true, updatedAt: now, coupleId: user.couple_id };
  },
};
