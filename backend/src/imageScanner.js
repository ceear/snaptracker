import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { stmts } from './db.js';
import logger from './logger.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif']);

// ── Timestamp parsing ─────────────────────────────────────────────────────────

const PATTERNS = [
  // YYYY-MM-DD_HH-MM-SS
  /(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/,
  // YYYYMMDD_HHMMSS
  /(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
  // YYYY-MM-DDTHH:MM:SS
  /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
  // YYYY-MM-DD HH:MM:SS
  /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
];

function parseTimestampFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));

  for (const pattern of PATTERNS) {
    const m = base.match(pattern);
    if (m) {
      const [, year, month, day, hour, min, sec] = m;
      // Local Date constructor — filename contains camera local time, not UTC
      const ts = new Date(+year, +month - 1, +day, +hour, +min, +sec).getTime();
      if (!isNaN(ts)) return Math.floor(ts / 1000);
    }
  }

  // 10-digit unix timestamp anywhere in filename
  const unix = base.match(/\b(\d{10})\b/);
  if (unix) return parseInt(unix[1], 10);

  return null;
}

async function getImageMeta(filepath) {
  try {
    const meta = await sharp(filepath).metadata();
    return { width: meta.width || null, height: meta.height || null };
  } catch {
    return { width: null, height: null };
  }
}

async function getExif(filepath) {
  try {
    const { default: exifr } = await import('exifr');
    const exif = await exifr.parse(filepath, {
      pick: ['Make', 'Model', 'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude',
             'ISO', 'ExposureTime', 'FNumber', 'FocalLength', 'LensModel'],
    });
    return exif ? JSON.stringify(exif) : null;
  } catch {
    return null;
  }
}

export async function processFile(owner, filepath) {
  const ext = path.extname(filepath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return;

  let stat;
  try {
    stat = fs.statSync(filepath);
  } catch {
    return; // file disappeared
  }

  const filename = path.basename(filepath);
  const parsedTs = parseTimestampFromFilename(filename);
  const captured_at = parsedTs ?? Math.floor(stat.mtimeMs / 1000);

  const { width, height } = await getImageMeta(filepath);
  const exif_json = await getExif(filepath);

  stmts.upsertImage.run({
    folder_owner: owner,
    filename,
    filepath,
    captured_at,
    file_size: stat.size,
    width,
    height,
    exif_json,
  });
}

export async function scanFolder(owner, folderPath) {
  if (!fs.existsSync(folderPath)) {
    logger.warn(`Folder does not exist, skipping scan: ${folderPath}`);
    return;
  }

  logger.info(`Scanning folder for ${owner}: ${folderPath}`);
  let files;
  try {
    files = fs.readdirSync(folderPath);
  } catch (err) {
    logger.error(`Failed to read folder ${folderPath}:`, err);
    return;
  }

  const limit = pLimit(4); // concurrency cap for metadata extraction
  const imagePaths = files
    .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map(f => path.join(folderPath, f));

  await Promise.all(imagePaths.map(fp => limit(() => processFile(owner, fp))));
  logger.info(`Scan complete for ${owner}: ${imagePaths.length} images processed`);
}

// ── Filesystem watcher ────────────────────────────────────────────────────────

export function startWatcher(adminPath, uploadsPath) {
  const watchPaths = [];
  if (fs.existsSync(adminPath)) watchPaths.push(adminPath);
  if (fs.existsSync(uploadsPath)) watchPaths.push(uploadsPath);

  if (watchPaths.length === 0) {
    logger.warn('No image directories found to watch');
    return;
  }

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true, // initial scan done separately
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 },
  });

  watcher.on('add', async (filepath) => {
    const owner = resolveOwner(filepath, adminPath, uploadsPath);
    if (owner) {
      logger.debug(`New file detected: ${filepath} (owner: ${owner})`);
      await processFile(owner, filepath);
    }
  });

  watcher.on('unlink', (filepath) => {
    logger.debug(`File removed: ${filepath}`);
    stmts.deleteImageByPath.run(filepath);
  });

  watcher.on('error', err => logger.error('Watcher error:', err));

  logger.info('Filesystem watcher started');
}

function resolveOwner(filepath, adminPath, uploadsPath) {
  const normalized = path.normalize(filepath);
  const normalizedAdmin = path.normalize(adminPath);
  const normalizedUploads = path.normalize(uploadsPath);

  if (normalized.startsWith(normalizedAdmin + path.sep) ||
      normalized.startsWith(normalizedAdmin + '/')) {
    return 'admin';
  }
  if (normalized.startsWith(normalizedUploads + path.sep) ||
      normalized.startsWith(normalizedUploads + '/')) {
    // uploads/<folder_name>/image.jpg → folder_name is the owner
    const rel = path.relative(normalizedUploads, normalized);
    const parts = rel.split(path.sep);
    return parts[0] || null;
  }
  return null;
}
