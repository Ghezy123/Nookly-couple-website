import { isSupabaseConfigured } from './supabase.js';
import { supabaseApi } from './supabaseApi.js';

// Satu lapisan API untuk seluruh app (akun pasangan, cerita, kenangan).
// Otomatis beralih ke Supabase bila VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY diisi.
const BASE = import.meta.env.VITE_API_BASE || '/api';
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

async function req(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Terjadi kesalahan'), { status: res.status });
  return data;
}

const restApi = {
  create: (name, password) => req('/auth/create', { method: 'POST', body: { name, password } }),
  join: (code, name, password) => req('/auth/join', { method: 'POST', body: { code, name, password } }),
  me: () => req('/me'),
  setName: (name) => req('/user/name', { method: 'PUT', body: { name } }),
  setMood: (mood) => req('/mood', { method: 'PUT', body: { mood } }),
  stories: () => req('/stories'),
  addStory: (b) => req('/stories', { method: 'POST', body: b }),
  editStory: (id, b) => req(`/stories/${id}`, { method: 'PATCH', body: b }),
  delStory: (id) => req(`/stories/${id}`, { method: 'DELETE' }),
  addReply: (id, b) => req(`/stories/${id}/replies`, { method: 'POST', body: b }),
  delReply: (id, rid) => req(`/stories/${id}/replies/${rid}`, { method: 'DELETE' }),
  react: (id, mood) => req(`/stories/${id}/reaction`, { method: 'PUT', body: { mood } }),
  memories: () => req('/memories'),
  addMemory: (b) => req('/memories', { method: 'POST', body: b }),
  editMemory: (id, b) => req(`/memories/${id}`, { method: 'PATCH', body: b }),
  delMemory: (id) => req(`/memories/${id}`, { method: 'DELETE' }),
  getScrapbook: () => req('/scrapbook'),
  saveScrapbook: (state) => req('/scrapbook', { method: 'PUT', body: { state } }),
};

export const api = isSupabaseConfigured ? supabaseApi : restApi;
