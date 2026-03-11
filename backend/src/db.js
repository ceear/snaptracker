import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import logger from './logger.js';

const DB_PATH = process.env.DB_PATH || './dev.db';

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function init() {
  // Run schema migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK(role IN ('admin','contributor')),
      api_key       TEXT    UNIQUE,
      is_public     INTEGER NOT NULL DEFAULT 0,
      folder_name   TEXT    NOT NULL UNIQUE,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sessions (
      jti        TEXT    PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      revoked    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS image_cache (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_owner   TEXT    NOT NULL,
      filename       TEXT    NOT NULL,
      filepath       TEXT    NOT NULL UNIQUE,
      captured_at    INTEGER NOT NULL,
      file_size      INTEGER,
      width          INTEGER,
      height         INTEGER,
      exif_json      TEXT,
      thumbnail_path TEXT,
      last_seen_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(folder_owner, filename)
    );

    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_image_cache_owner_captured
      ON image_cache(folder_owner, captured_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_sessions_expires
      ON sessions(expires_at);
  `);

  // First-run: seed superuser if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const password = generatePassword();
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(`
      INSERT INTO users (username, password_hash, role, folder_name)
      VALUES ('admin', ?, 'admin', 'admin')
    `).run(hash);

    const border = '═'.repeat(38);
    console.log(`\n╔${border}╗`);
    console.log(`║       SnapTracker — First Run Setup      ║`);
    console.log(`║                                          ║`);
    console.log(`║  Username: admin                         ║`);
    console.log(`║  Password: ${password.padEnd(28)}║`);
    console.log(`║                                          ║`);
    console.log(`║  Change this password after login!       ║`);
    console.log(`╚${border}╝\n`);
  }

  // Initialize prepared statements now that tables exist
  initStmts();

  // Prune expired sessions hourly
  setInterval(() => {
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Math.floor(Date.now() / 1000));
  }, 60 * 60 * 1000);
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  for (let i = 0; i < 16; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

// ── Prepared statement helpers ────────────────────────────────────────────────
// Populated by init() after tables are created — do not call before init().

export const stmts = {};

function initStmts() {
  Object.assign(stmts, {
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByApiKey: db.prepare('SELECT * FROM users WHERE api_key = ?'),
  getAllUsers: db.prepare('SELECT id, username, role, is_public, folder_name, api_key, created_at FROM users ORDER BY created_at ASC'),
  getPublicContributors: db.prepare(`
    SELECT id, username, folder_name FROM users
    WHERE role = 'contributor' AND is_public = 1
    ORDER BY username ASC
  `),

  insertUser: db.prepare(`
    INSERT INTO users (username, password_hash, role, api_key, folder_name)
    VALUES (@username, @password_hash, @role, @api_key, @folder_name)
  `),
  updateUser: db.prepare(`
    UPDATE users SET is_public = @is_public, password_hash = @password_hash,
    updated_at = unixepoch() WHERE id = @id
  `),
  updateApiKey: db.prepare('UPDATE users SET api_key = ? WHERE id = ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  insertSession: db.prepare(`
    INSERT INTO sessions (jti, user_id, expires_at) VALUES (?, ?, ?)
  `),
  getSession: db.prepare('SELECT * FROM sessions WHERE jti = ?'),
  revokeSession: db.prepare('UPDATE sessions SET revoked = 1 WHERE jti = ?'),

  upsertImage: db.prepare(`
    INSERT INTO image_cache
      (folder_owner, filename, filepath, captured_at, file_size, width, height, exif_json, last_seen_at)
    VALUES
      (@folder_owner, @filename, @filepath, @captured_at, @file_size, @width, @height, @exif_json, unixepoch())
    ON CONFLICT(folder_owner, filename) DO UPDATE SET
      captured_at    = excluded.captured_at,
      file_size      = excluded.file_size,
      width          = excluded.width,
      height         = excluded.height,
      exif_json      = excluded.exif_json,
      last_seen_at   = unixepoch()
  `),
  updateThumbnailPath: db.prepare('UPDATE image_cache SET thumbnail_path = ? WHERE id = ?'),
  getImageById: db.prepare('SELECT * FROM image_cache WHERE id = ?'),
  deleteImageByPath: db.prepare('DELETE FROM image_cache WHERE filepath = ?'),
  deleteImagesByOwner: db.prepare('DELETE FROM image_cache WHERE folder_owner = ?'),

  getImages: db.prepare(`
    SELECT * FROM image_cache
    WHERE folder_owner = @owner
      AND (@from IS NULL OR captured_at >= @from)
      AND (@to IS NULL OR captured_at <= @to)
    ORDER BY
      CASE WHEN @sort = 'asc' THEN captured_at END ASC,
      CASE WHEN @sort != 'asc' THEN captured_at END DESC
    LIMIT @limit OFFSET @offset
  `),
  countImages: db.prepare(`
    SELECT COUNT(*) as count FROM image_cache
    WHERE folder_owner = @owner
      AND (@from IS NULL OR captured_at >= @from)
      AND (@to IS NULL OR captured_at <= @to)
  `),
  getImageDates: db.prepare(`
    SELECT DISTINCT date(captured_at, 'unixepoch', 'localtime') as d
    FROM image_cache WHERE folder_owner = ?
    ORDER BY d ASC
  `),
  });
}

export default db;
