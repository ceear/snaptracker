import fs from 'fs';
import path from 'path';
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

  const scannedPaths = new Set(imagePaths);
  await Promise.all(imagePaths.map(fp => limit(() => processFile(owner, fp))));

  // Remove DB entries for images that no longer exist on disk
  const dbRows = stmts.getFilepathsByOwner.all(owner);
  let pruned = 0;
  for (const { filepath } of dbRows) {
    if (!scannedPaths.has(filepath)) {
      stmts.deleteImageByPath.run(filepath);
      pruned++;
    }
  }
  if (pruned > 0) logger.info(`Pruned ${pruned} stale DB entries for ${owner}`);

  logger.info(`Scan complete for ${owner}: ${imagePaths.length} images processed`);
}

// ── Periodic reconciliation ───────────────────────────────────────────────────

async function reconcileFolder(owner, folderPath) {
  if (!fs.existsSync(folderPath)) return;

  let files;
  try {
    files = fs.readdirSync(folderPath);
  } catch {
    return;
  }

  const diskPaths = new Set(
    files
      .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(f => path.join(folderPath, f))
  );

  const dbRows = stmts.getFilepathsByOwner.all(owner);
  const dbPaths = new Set(dbRows.map(r => r.filepath));

  // Process only new files (not yet in DB)
  const toAdd = [...diskPaths].filter(p => !dbPaths.has(p));
  if (toAdd.length > 0) {
    const limit = pLimit(4);
    await Promise.all(toAdd.map(fp => limit(() => processFile(owner, fp))));
    logger.info(`Reconcile: added ${toAdd.length} new image(s) for ${owner}`);
  }

  // Remove entries for deleted files
  let pruned = 0;
  for (const p of dbPaths) {
    if (!diskPaths.has(p)) {
      stmts.deleteImageByPath.run(p);
      pruned++;
    }
  }
  if (pruned > 0) logger.info(`Reconcile: pruned ${pruned} stale entry(s) for ${owner}`);
}

export function startPeriodicScan(adminPath, uploadsPath) {
  const intervalMs = parseInt(process.env.SCAN_INTERVAL_MS || '10000', 10);

  const tick = async () => {
    try {
      await reconcileFolder('admin', adminPath);
      if (fs.existsSync(uploadsPath)) {
        const subfolders = fs.readdirSync(uploadsPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
        for (const folder of subfolders) {
          await reconcileFolder(folder, path.join(uploadsPath, folder));
        }
      }
    } catch (err) {
      logger.error('Periodic scan error:', err);
    }
  };

  setInterval(tick, intervalMs);
  logger.info(`Periodic folder scan started (interval: ${intervalMs}ms)`);
}
