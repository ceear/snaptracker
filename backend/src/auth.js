import jwt from 'jsonwebtoken';
import { stmts } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function requireJWT(req, res, next) {
  const header = req.headers.authorization;
  // Also accept ?token= query param so <img src="...?token=..."> works in browsers
  const token = req.query.token ||
    (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Check denylist
  const session = stmts.getSession.get(payload.jti);
  if (!session || session.revoked) {
    return res.status(401).json({ error: 'Session revoked' });
  }

  const user = stmts.getUserById.get(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  req.jti = payload.jti;
  next();
}

export function requireApiKey(req, res, next) {
  const key =
    req.headers['x-api-key'] ||
    (req.headers.authorization?.startsWith('ApiKey ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!key) {
    return res.status(401).json({ error: 'API key required' });
  }

  const user = stmts.getUserByApiKey.get(key);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireAdminOrSelf(req, res, next) {
  const targetId = parseInt(req.params.id, 10);
  if (req.user.role === 'admin' || req.user.id === targetId) {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions' });
}

export function signToken(userId) {
  const jti = crypto.randomUUID();
  const expiresIn = 8 * 60 * 60; // 8 hours in seconds
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const token = jwt.sign({ sub: userId, jti }, JWT_SECRET, { expiresIn });
  stmts.insertSession.run(jti, userId, expiresAt);
  return token;
}
