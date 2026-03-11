import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { stmts } from '../db.js';
import { requireJWT, signToken } from '../auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = stmts.getUserByUsername.get(username.trim().toLowerCase());
  if (!user) {
    // Constant-time rejection to prevent user enumeration
    await bcrypt.compare(password, '$2a$12$invalidhashfortimingatttacks000000000000000000000');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      is_public: user.is_public,
      folder_name: user.folder_name,
    },
  });
});

// POST /api/v1/auth/logout
router.post('/logout', requireJWT, (req, res) => {
  stmts.revokeSession.run(req.jti);
  res.json({ ok: true });
});

// GET /api/v1/auth/me
router.get('/me', requireJWT, (req, res) => {
  const u = req.user;
  res.json({
    id: u.id,
    username: u.username,
    role: u.role,
    is_public: u.is_public,
    folder_name: u.folder_name,
  });
});

export default router;
