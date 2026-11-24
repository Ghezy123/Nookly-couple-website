-- =========================================================================
-- COUPLE HUB - SUPABASE SQL SCHEMA
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. Tabel Pasangan (Couples)
CREATE TABLE IF NOT EXISTS public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  created_at BIGINT NOT NULL
);

-- 2. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  mood TEXT,
  mood_at BIGINT,
  created_at BIGINT NOT NULL
);

-- 3. Tabel Cerita (Stories)
CREATE TABLE IF NOT EXISTS public.stories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  category TEXT,
  mood TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  created_at BIGINT NOT NULL,
  edited_at BIGINT
);

-- 4. Tabel Balasan Cerita (Replies)
CREATE TABLE IF NOT EXISTS public.replies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  story_id BIGINT NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mood TEXT,
  created_at BIGINT NOT NULL
);

-- 5. Tabel Reaksi Mood (Reactions)
CREATE TABLE IF NOT EXISTS public.reactions (
  story_id BIGINT NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  PRIMARY KEY (story_id, user_id)
);

-- 6. Tabel Linimasa Kenangan (Memories)
CREATE TABLE IF NOT EXISTS public.memories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  images JSONB NOT NULL DEFAULT '[]'::JSONB,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- 7. Tabel Buku Kenangan 3D Kolaboratif (Scrapbooks)
CREATE TABLE IF NOT EXISTS public.scrapbooks (
  couple_id UUID PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  updated_by TEXT
);

-- Indeks untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_users_couple ON public.users(couple_id);
CREATE INDEX IF NOT EXISTS idx_stories_couple ON public.stories(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_story ON public.replies(story_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_memories_couple ON public.memories(couple_id, event_date DESC);

-- Enable Row Level Security (RLS) dengan kebijakan publik (akses divalidasi via kode pasangan & token client)
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrapbooks ENABLE ROW LEVEL SECURITY;

-- Kebijakan Anon (Izinkan read/write untuk client ber-API Key anon)
CREATE POLICY "Allow all on couples" ON public.couples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stories" ON public.stories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on replies" ON public.replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reactions" ON public.reactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on memories" ON public.memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on scrapbooks" ON public.scrapbooks FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime untuk sinkronisasi otomatis
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scrapbooks;
