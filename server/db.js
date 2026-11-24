import { DatabaseSync } from 'node:sqlite'; // bawaan Node >= 22.13, tidak perlu kompilasi
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
fs.mkdirSync(dir, { recursive: true });
export const db = new DatabaseSync(process.env.DB_FILE || path.join(dir, 'couple.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS couples (id INTEGER PRIMARY KEY, invite_code TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, couple_id INTEGER NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL, token TEXT UNIQUE NOT NULL, password TEXT, mood TEXT, mood_at INTEGER, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY, couple_id INTEGER NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL, category TEXT, mood TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared')),
  created_at INTEGER NOT NULL, edited_at INTEGER);
CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY, story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL, mood TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reactions (
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL, PRIMARY KEY (story_id, user_id));
CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY, couple_id INTEGER NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'other',
  images TEXT NOT NULL DEFAULT '[]', visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared')),
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS scrapbooks (
  couple_id INTEGER PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT);
CREATE INDEX IF NOT EXISTS idx_memories_couple ON memories(couple_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_stories_couple ON stories(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_story ON replies(story_id, created_at);
`);

export const q = {
  addCouple: db.prepare('INSERT INTO couples (invite_code, created_at) VALUES (?, ?)'),
  coupleByCode: db.prepare('SELECT * FROM couples WHERE invite_code = ?'),
  coupleById: db.prepare('SELECT * FROM couples WHERE id = ?'),
  addUser: db.prepare('INSERT INTO users (couple_id, name, token, password, created_at) VALUES (?, ?, ?, ?, ?)'),
  setPassword: db.prepare('UPDATE users SET password = ? WHERE id = ?'),
  userByToken: db.prepare('SELECT * FROM users WHERE token = ?'),
  setName: db.prepare('UPDATE users SET name = ? WHERE id = ?'),
  usersOfCouple: db.prepare('SELECT * FROM users WHERE couple_id = ? ORDER BY id'),
  setMood: db.prepare('UPDATE users SET mood = ?, mood_at = ? WHERE id = ?'),
  visibleStories: db.prepare(`SELECT s.*, u.name AS author_name FROM stories s JOIN users u ON u.id = s.author_id
    WHERE s.couple_id = ? AND (s.author_id = ? OR s.visibility = 'shared') ORDER BY s.created_at DESC, s.id DESC`),
  story: db.prepare('SELECT * FROM stories WHERE id = ? AND couple_id = ?'),
  addStory: db.prepare('INSERT INTO stories (couple_id, author_id, body, category, mood, visibility, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  updStory: db.prepare('UPDATE stories SET body = ?, category = ?, mood = ?, visibility = ?, edited_at = ? WHERE id = ?'),
  delStory: db.prepare('DELETE FROM stories WHERE id = ?'),
  repliesOf: db.prepare('SELECT r.*, u.name AS author_name FROM replies r JOIN users u ON u.id = r.author_id WHERE r.story_id = ? ORDER BY r.created_at, r.id'),
  addReply: db.prepare('INSERT INTO replies (story_id, author_id, body, mood, created_at) VALUES (?, ?, ?, ?, ?)'),
  reply: db.prepare('SELECT * FROM replies WHERE id = ? AND story_id = ?'),
  delReply: db.prepare('DELETE FROM replies WHERE id = ?'),
  reactionsOf: db.prepare('SELECT r.*, u.name AS user_name FROM reactions r JOIN users u ON u.id = r.user_id WHERE r.story_id = ?'),
  setReaction: db.prepare('INSERT INTO reactions (story_id, user_id, mood) VALUES (?, ?, ?) ON CONFLICT(story_id, user_id) DO UPDATE SET mood = excluded.mood'),
  delReaction: db.prepare('DELETE FROM reactions WHERE story_id = ? AND user_id = ?'),
  visibleMemories: db.prepare("SELECT * FROM memories WHERE couple_id = ? AND (author_id = ? OR visibility = 'shared') ORDER BY event_date DESC, created_at DESC"),
  memory: db.prepare('SELECT * FROM memories WHERE id = ? AND couple_id = ?'),
  addMemory: db.prepare('INSERT INTO memories (couple_id, author_id, event_date, title, description, category, images, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  updMemory: db.prepare('UPDATE memories SET event_date = ?, title = ?, description = ?, category = ?, images = ?, visibility = ?, updated_at = ? WHERE id = ?'),
  delMemory: db.prepare('DELETE FROM memories WHERE id = ?'),
  getScrapbook: db.prepare('SELECT * FROM scrapbooks WHERE couple_id = ?'),
  saveScrapbook: db.prepare('INSERT INTO scrapbooks (couple_id, state, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(couple_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at, updated_by = excluded.updated_by'),
};
