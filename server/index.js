import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { mountCouple } from './couple.js';
import { mountMemories } from './memories.js';
import { attachBattle } from './battle.js';

const app = express();
app.use(express.json({ limit: '8mb' })); // foto kenangan dikirim sebagai data URL terkompres
app.use((req, res, next) => {
  res.set({ 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.get('/health', (_, res) => res.json({ ok: true }));
mountCouple(app);    // akun pasangan, mood, cerita, balasan
mountMemories(app);  // linimasa kenangan

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html'))); }

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
attachBattle(io);    // game battle 1v1

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Couple Hub server on :${PORT}`));
