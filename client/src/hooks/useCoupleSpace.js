import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api.js';

// State + aksi. Polling 8 dtk (asinkron: tidak perlu online bersamaan).
export function useCoupleSpace() {
  const [status, setStatus] = useState(getToken() ? 'loading' : 'anon');
  const [info, setInfo] = useState(null);
  const [stories, setStories] = useState([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [i, s] = await Promise.all([api.me(), api.stories()]);
      setInfo(i); setStories(s.stories); setStatus('ready');
    } catch (e) {
      if (e.status === 401) { setToken(null); setStatus('anon'); } else setError(e.message);
    }
  }, []);

  useEffect(() => { if (getToken()) refresh(); }, [refresh]);
  useEffect(() => {
    if (status !== 'ready') return undefined;
    const t = setInterval(() => { if (!document.hidden) refresh(); }, 8000);
    return () => clearInterval(t);
  }, [status, refresh]);

  const run = async (fn) => { try { setError(''); await fn(); await refresh(); return true; } catch (e) { setError(e.message); return false; } };
  const enter = async (fn) => { try { setError(''); const r = await fn(); setToken(r.token); setStatus('loading'); await refresh(); } catch (e) { setError(e.message); setStatus('anon'); } };

  const actions = {
    create: (name, password) => enter(() => api.create(name, password)),
    join: (code, name, password) => enter(() => api.join(code, name, password)),
    logout: () => { setToken(null); setInfo(null); setStories([]); setStatus('anon'); },
    setName: (name) => run(() => api.setName(name)),
    setPassword: (password) => run(() => api.setPassword(password)),
    setMood: async (mood) => { setInfo((i) => ({ ...i, user: { ...i.user, mood, moodAt: Date.now() } })); return run(() => api.setMood(mood)); },
    add: (v) => run(() => api.addStory(v)),
    edit: (id, v) => run(() => api.editStory(id, v)),
    remove: (id) => run(() => api.delStory(id)),
    setVisibility: (id, visibility) => run(() => api.editStory(id, { visibility })),
    reply: (id, body, mood) => run(() => api.addReply(id, { body, mood })),
    delReply: (id, rid) => run(() => api.delReply(id, rid)),
    react: (id, mood) => run(() => api.react(id, mood)),
  };
  return { status, info, stories, error, setError, actions };
}
