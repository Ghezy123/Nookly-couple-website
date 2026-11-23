import { q } from './db.js';
export const bad = (res, msg, status = 400) => res.status(status).json({ error: msg });
export const auth = (req, res, next) => {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  const u = t && q.userByToken.get(t);
  if (!u) return bad(res, 'Silakan masuk dulu', 401);
  req.user = u; next();
};
