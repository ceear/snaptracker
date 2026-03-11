import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { stmts } from '../db.js';
import { requireJWT, requireRole, requireAdminOrSelf } from '../auth.js';
import logger from '../logger.js';

const router = Router();
const UPLOADS_PATH = process.env.IMAGE_UPLOADS_PATH || '/images/uploads';

function sanitizeFolderName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_\-]/g, '_').slice(0, 32);
}

// GET /api/v1/users  — admin only
router.get('/', requireJWT, requireRole('admin'), (req, res) => {
  const users = stmts.getAllUsers.all().map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    is_public: u.is_public,
    folder_name: u.folder_name,
    api_key: u.api_key,
    created_at: u.created_at,
  }));
  res.json({ users });
});

// POST /api/v1/users  — admin only
router.post('/', requireJWT, requireRole('admin'), async (req, res) => {
  const { username, password, role = 'contributor' } = req.body;

  if (!username) return res.status(400).json({ error: 'Username required' });
  if (!['admin', 'contributor'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or contributor' });
  }

  const trimmed = username.trim().toLowerCase();
  if (!/^[a-z0-9_\-]{2,32}$/.test(trimmed)) {
    return res.status(400).json({
      error: 'Username must be 2-32 characters, letters/numbers/underscore/hyphen only',
    });
  }

  const existing = stmts.getUserByUsername.get(trimmed);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const pw = password || generatePassword();
  const hash = await bcrypt.hash(pw, 12);
  const api_key = role === 'contributor' ? uuidv4() : null;
  const folder_name = sanitizeFolderName(trimmed);

  // Create upload folder for contributor
  if (role === 'contributor') {
    const folderPath = path.join(UPLOADS_PATH, folder_name);
    fs.mkdirSync(folderPath, { recursive: true });
  }

  let id;
  try {
    const result = stmts.insertUser.run({
      username: trimmed,
      password_hash: hash,
      role,
      api_key,
      folder_name,
    });
    id = result.lastInsertRowid;
  } catch (err) {
    logger.error('User creation error:', err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or folder name already taken' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }

  res.status(201).json({
    id,
    username: trimmed,
    role,
    folder_name,
    api_key,
    generated_password: password ? undefined : pw, // only show if auto-generated
  });
});

// PATCH /api/v1/users/:id  — admin or self
router.patch('/:id', requireJWT, requireAdminOrSelf, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const target = stmts.getUserById.get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const { is_public, password } = req.body;
  const isAdmin = req.user.role === 'admin';

  // Non-admins can only change their own is_public and password
  let newHash = target.password_hash;
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    newHash = await bcrypt.hash(password, 12);
  }

  const newPublic = is_public !== undefined
    ? (is_public ? 1 : 0)
    : target.is_public;

  stmts.updateUser.run({
    is_public: newPublic,
    password_hash: newHash,
    id: targetId,
  });

  const updated = stmts.getUserById.get(targetId);
  res.json({
    id: updated.id,
    username: updated.username,
    role: updated.role,
    is_public: updated.is_public,
    folder_name: updated.folder_name,
  });
});

// DELETE /api/v1/users/:id  — admin only
router.delete('/:id', requireJWT, requireRole('admin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const target = stmts.getUserById.get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Clean up image cache entries
  stmts.deleteImagesByOwner.run(target.folder_name);

  stmts.deleteUser.run(targetId);
  res.json({ ok: true });
});

// POST /api/v1/users/:id/rotate-key  — admin only
router.post('/:id/rotate-key', requireJWT, requireRole('admin'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const target = stmts.getUserById.get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') {
    return res.status(400).json({ error: 'Admin users do not have API keys' });
  }

  const api_key = uuidv4();
  stmts.updateApiKey.run(api_key, targetId);
  res.json({ api_key });
});

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default router;
