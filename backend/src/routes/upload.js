import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireApiKey } from '../auth.js';
import { processFile } from '../imageScanner.js';
import logger from '../logger.js';

const router = Router();

const UPLOADS_PATH = process.env.IMAGE_UPLOADS_PATH || '/images/uploads';
const MAX_SIZE_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10);

// Allowed MIME types and their magic bytes
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff']);
const MAGIC_BYTES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF...WEBP
  { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2A, 0x00] }, // little-endian
  { mime: 'image/tiff', bytes: [0x4D, 0x4D, 0x00, 0x2A] }, // big-endian
];

function checkMagicBytes(filepath) {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filepath, 'r');
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);

  for (const { bytes } of MAGIC_BYTES) {
    if (bytes.every((b, i) => buf[i] === b)) return true;
  }
  return false;
}

function sanitizeFilename(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._\-]/g, '_');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_PATH, req.user.folder_name);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = sanitizeFilename(file.originalname);
    // If a file with the same name exists, add a timestamp prefix
    const target = path.join(UPLOADS_PATH, req.user.folder_name, safe);
    if (fs.existsSync(target)) {
      cb(null, `${Date.now()}_${safe}`);
    } else {
      cb(null, safe);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// POST /api/v1/upload  (also handles PUT)
const handleUpload = [
  requireApiKey,
  upload.single('image'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided (field name: "image")' });
    }

    // Verify magic bytes after disk write
    if (!checkMagicBytes(req.file.path)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File content does not match an allowed image format' });
    }

    try {
      await processFile(req.user.folder_name, req.file.path);
    } catch (err) {
      logger.warn('Post-upload processing error (file saved):', err.message);
    }

    // Return the created image record
    const { stmts } = await import('../db.js');
    const image = stmts.getImageById.get(
      stmts.upsertImage.lastInsertRowid ??
      (stmts.getUserByUsername.get(req.user.username)?.id)
    );

    // Simpler: just return file info
    res.status(201).json({
      filename: req.file.filename,
      folder_owner: req.user.folder_name,
      file_size: req.file.size,
      path: req.file.path,
    });
  },
];

router.post('/', ...handleUpload);
router.put('/', ...handleUpload);

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Maximum size is ${MAX_SIZE_MB}MB` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
