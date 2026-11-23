# Couple Hub

Satu website untuk dua orang, dengan sidebar menu: **Beranda** (mood duo), **Cerita** (forum privat), **Kenangan** (linimasa), **Main** (Block Blast Battle).

Butuh Node >= 22.13 (cek `node -v`). Database memakai `node:sqlite` bawaan Node, jadi `npm install` tidak butuh compiler.

## Menjalankan (Node 18+)
```bash
cd server && npm install && npm start      # API + Socket.io di :3001 (database: server/data/couple.db)
cd client && npm install && npm run dev    # buka http://localhost:5173
```
Produksi: `cd client && npm run build`, lalu `npm start` di `server/` (server ikut menyajikan `client/dist`).

## Struktur
```
server/  index.js (rakit app) | couple.js (akun, mood, cerita) | memories.js (kenangan) | battle.js (Socket.io) | db.js | common.js
client/src/
  App.jsx                 shell: header, tab, tema global, toast
  theme/                  settings.js (turunan warna + kontras otomatis), SettingsModal.jsx
  pages/                  Home.jsx, StoriesPage.jsx
  components/             AnimatedMoodAvatar, DuoMoodWidget, MoodPicker, StoryCard, ReplyThread, ...
  timeline/               TimelinePage.tsx, TimelineCard, MemoryFormModal, MemoryLightbox, restService.ts, ...
  game/                   engine.js, audio.js, GameScreen.jsx, BattleHub.jsx
```
Satu akun pasangan (kode undangan) dipakai semua fitur. Aturan privasi (Keep Private / Bagikan) diterapkan di server.
