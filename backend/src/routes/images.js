import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { stmts } from '../db.js';
import { requireJWT, requireRole } from '../auth.js';
import logger from '../logger.js';

const router = Router();

const ADMIN_PATH = process.env.IMAGE_ADMIN_PATH || '/images/admin';
const UPLOADS_PATH = process.env.IMAGE_UPLOADS_PATH || '/images/uploads';

function canViewOwner(requestingUser, ownerUsername) {
  // Admin can see everyone
  if (requestingUser.role === 'admin') return true;
  // You can always see your own
  if (requestingUser.folder_name === ownerUsername) return true;
  // Contributors can only see public contributors
  const owner = stmts.getUserByUsername.get(ownerUsername);
  return owner && owner.is_public === 1;
}

function safeImageUrl(image) {
  return {
    id: image.id,
    folder_owner: image.folder_owner,
    filename: image.filename,
    captured_at: image.captured_at,
    file_size: image.file_size,
    width: image.width,
    height: image.height,
    exif: image.exif_json ? JSON.parse(image.exif_json) : null,
    thumbnail_url: `/api/v1/images/${image.id}/thumb`,
    full_url: `/api/v1/images/${image.id}/full`,
  };
}

// GET /api/v1/images
router.get('/', requireJWT, (req, res) => {
  const {
    owner,
    page = 1,
    limit: limitStr = 50,
    sort = 'asc',
    from,
    to,
  } = req.query;

  const targetOwner = owner || req.user.folder_name;

  if (!canViewOwner(req.user, targetOwner)) {
    return res.status(403).json({ error: 'Access denied to this folder' });
  }

  const limit = Math.min(Math.max(parseInt(limitStr, 10) || 50, 1), 10000);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const params = {
    owner: targetOwner,
    from: from ? parseInt(from, 10) : null,
    to: to ? parseInt(to, 10) : null,
    sort: sort === 'asc' ? 'asc' : 'desc',
    limit,
    offset,
  };

  const images = stmts.getImages.all(params);
  const { count } = stmts.countImages.get(params);

  res.json({
    images: images.map(safeImageUrl),
    total: count,
    page: parseInt(page, 10) || 1,
    pages: Math.ceil(count / limit),
    limit,
  });
});

// GET /api/v1/images/dates — for calendar widget
router.get('/dates', requireJWT, (req, res) => {
  const { owner } = req.query;
  const targetOwner = owner || req.user.folder_name;

  if (!canViewOwner(req.user, targetOwner)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const dates = stmts.getImageDates.all(targetOwner).map(r => r.d);
  res.json({ dates });
});

// GET /api/v1/images/:id
router.get('/:id', requireJWT, (req, res) => {
  const image = stmts.getImageById.get(parseInt(req.params.id, 10));
  if (!image) return res.status(404).json({ error: 'Image not found' });

  if (!canViewOwner(req.user, image.folder_owner)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(safeImageUrl(image));
});

// GET /api/v1/images/:id/thumb
router.get('/:id/thumb', requireJWT, async (req, res) => {
  const image = stmts.getImageById.get(parseInt(req.params.id, 10));
  if (!image) return res.status(404).json({ error: 'Image not found' });

  if (!canViewOwner(req.user, image.folder_owner)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Serve cached thumbnail if it exists
  if (image.thumbnail_path && fs.existsSync(image.thumbnail_path)) {
    res.set('Cache-Control', 'public, max-age=86400');
    return res.sendFile(path.resolve(image.thumbnail_path));
  }

  // Generate thumbnail on-the-fly
  if (!fs.existsSync(image.filepath)) {
    return res.status(404).json({ error: 'Image file not found' });
  }

  try {
    const thumbDir = path.join(process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : '.', 'thumbnails');
    fs.mkdirSync(thumbDir, { recursive: true });
    const thumbPath = path.join(thumbDir, `${image.id}.jpg`);

    await sharp(image.filepath)
      .resize(300, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    stmts.updateThumbnailPath.run(thumbPath, image.id);

    res.set('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.resolve(thumbPath));
  } catch (err) {
    logger.error('Thumbnail generation failed:', err);
    res.status(500).json({ error: 'Thumbnail generation failed' });
  }
});

// GET /api/v1/images/:id/full
router.get('/:id/full', requireJWT, (req, res) => {
  const image = stmts.getImageById.get(parseInt(req.params.id, 10));
  if (!image) return res.status(404).json({ error: 'Image not found' });

  if (!canViewOwner(req.user, image.folder_owner)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(image.filepath)) {
    return res.status(404).json({ error: 'Image file not found on disk' });
  }

  res.set('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.resolve(image.filepath));
});

// DELETE /api/v1/images/:id
router.delete('/:id', requireJWT, (req, res) => {
  const image = stmts.getImageById.get(parseInt(req.params.id, 10));
  if (!image) return res.status(404).json({ error: 'Image not found' });

  const isAdmin = req.user.role === 'admin';
  const isOwner = req.user.folder_name === image.folder_owner;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Don't delete from RO admin mount
  if (image.folder_owner === 'admin' && !isAdmin) {
    return res.status(403).json({ error: 'Cannot delete admin images' });
  }

  try {
    if (image.folder_owner !== 'admin' && fs.existsSync(image.filepath)) {
      fs.unlinkSync(image.filepath);
    }
    if (image.thumbnail_path && fs.existsSync(image.thumbnail_path)) {
      fs.unlinkSync(image.thumbnail_path);
    }
  } catch (err) {
    logger.warn('File deletion error (continuing):', err.message);
  }

  stmts.deleteImageByPath.run(image.filepath);
  res.json({ ok: true });
});

// GET /api/v1/images/owners — list accessible owners for dropdown
router.get('/owners/list', requireJWT, (req, res) => {
  const self = {
    username: req.user.username,
    folder_name: req.user.folder_name,
    isSelf: true,
  };

  if (req.user.role === 'admin') {
    const all = stmts.getAllUsers.all().map(u => ({
      username: u.username,
      folder_name: u.folder_name,
      isSelf: u.id === req.user.id,
    }));
    return res.json({ owners: all });
  }

  const publicContribs = stmts.getPublicContributors.all().map(u => ({
    username: u.username,
    folder_name: u.folder_name,
    isSelf: u.folder_name === req.user.folder_name,
  }));

  // Ensure self is always included
  const hasSelf = publicContribs.some(u => u.isSelf);
  const owners = hasSelf ? publicContribs : [self, ...publicContribs.filter(u => !u.isSelf)];
  res.json({ owners });
});

export default router;
