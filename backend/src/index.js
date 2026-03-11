import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import logger from './logger.js';
import { init as initDb } from './db.js';
import { scanFolder, startWatcher } from './imageScanner.js';

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import userRoutes from './routes/users.js';
import uploadRoutes from './routes/upload.js';

// ── Environment validation ────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('\n[FATAL] JWT_SECRET environment variable must be at least 32 characters.\n');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || `http://localhost:${PORT}`;
const ADMIN_PATH = process.env.IMAGE_ADMIN_PATH || '/images/admin';
const UPLOADS_PATH = process.env.IMAGE_UPLOADS_PATH || '/images/uploads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── App setup ────────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── API routes ────────────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/images', imageRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/upload', uploadRoutes);

// ── Serve built frontend (production) ────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback: serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal error occurred'
    : err.message;
  res.status(status).json({ error: message });
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function start() {
  // Initialize database (migrations + first-run seed)
  initDb();

  // Initial folder scans
  await scanFolder('admin', ADMIN_PATH);

  // Scan existing contributor upload folders
  if (fs.existsSync(UPLOADS_PATH)) {
    const subfolders = fs.readdirSync(UPLOADS_PATH, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const folder of subfolders) {
      await scanFolder(folder, path.join(UPLOADS_PATH, folder));
    }
  }

  // Start filesystem watcher
  startWatcher(ADMIN_PATH, UPLOADS_PATH);

  app.listen(PORT, () => {
    logger.info(`SnapTracker backend running on port ${PORT}`);
  });
}

start().catch(err => {
  logger.error('Startup failed:', err);
  process.exit(1);
});
