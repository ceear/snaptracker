/**
 * Demo mode mock layer.
 * Replaces all API calls when VITE_DEMO_MODE=true.
 * All functions mirror the real api/ surface.
 */

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));

// ── Generate mock images ──────────────────────────────────────────────────────

function makeImage(id, owner = 'admin') {
  // Spread 90 images over 3 months starting from 2024-01-01
  const baseTs = 1704067200; // 2024-01-01 00:00 UTC
  const captured_at = baseTs + (id - 1) * 3600 * 2; // every 2 hours
  return {
    id,
    folder_owner: owner,
    filename: `snapshot_${String(id).padStart(4, '0')}.jpg`,
    captured_at,
    file_size: 1_500_000 + Math.floor(Math.random() * 500_000),
    width: 1920,
    height: 1080,
    exif: {
      Make: 'Raspberry Pi',
      Model: 'Camera Module 3',
      ISO: 100 + Math.floor(Math.random() * 400),
      FNumber: 2.8,
      ExposureTime: 0.001,
      FocalLength: 4.74,
    },
    thumbnail_url: `https://picsum.photos/seed/${owner}${id}/300/200`,
    full_url: `https://picsum.photos/seed/${owner}${id}/1280/720`,
  };
}

const ADMIN_IMAGES = Array.from({ length: 90 }, (_, i) => makeImage(i + 1, 'admin'));
const ALICE_IMAGES = Array.from({ length: 40 }, (_, i) => makeImage(i + 200, 'alice'));

const MOCK_USERS = [
  { id: 1, username: 'admin', role: 'admin', is_public: 0, folder_name: 'admin', api_key: null, created_at: 1704067200 },
  { id: 2, username: 'alice', role: 'contributor', is_public: 1, folder_name: 'alice', api_key: 'demo-api-key-alice-00000000', created_at: 1704067200 },
  { id: 3, username: 'bob', role: 'contributor', is_public: 0, folder_name: 'bob', api_key: 'demo-api-key-bob-000000000', created_at: 1704067200 },
];

const MOCK_AUTH = {
  token: 'demo-jwt-token',
  user: { id: 1, username: 'admin', role: 'admin', is_public: 0, folder_name: 'admin' },
};

// ── Override axios client + API token attachment ──────────────────────────────
// In demo mode, the real API functions are replaced. We patch the module exports.

// ── Auth API ──────────────────────────────────────────────────────────────────

export async function login(username, password) {
  await delay(400);
  // Accept any credentials in demo mode
  return {
    token: 'demo-jwt-token',
    user: { id: 1, username: username || 'demo', role: 'admin', is_public: 0, folder_name: 'admin' },
  };
}

export async function logout() {
  await delay(100);
  return { ok: true };
}

export async function getMe() {
  await delay(100);
  return MOCK_AUTH.user;
}

// ── Images API ─────────────────────────────────────────────────────────────────

function getImagePool(owner) {
  if (owner === 'alice') return ALICE_IMAGES;
  return ADMIN_IMAGES;
}

export async function getImages({ owner = 'admin', page = 1, limit = 50, sort = 'asc', from, to } = {}) {
  await delay(150);
  let pool = [...getImagePool(owner)];
  if (from) pool = pool.filter(i => i.captured_at >= from);
  if (to) pool = pool.filter(i => i.captured_at <= to);
  if (sort === 'desc') pool.reverse();
  const offset = (page - 1) * limit;
  const images = pool.slice(offset, offset + limit);
  return { images, total: pool.length, page, pages: Math.ceil(pool.length / limit), limit };
}

export async function getImageDates(owner = 'admin') {
  await delay(50);
  const pool = getImagePool(owner);
  const seen = new Set();
  const dates = [];
  for (const img of pool) {
    const d = new Date(img.captured_at * 1000).toISOString().split('T')[0];
    if (!seen.has(d)) { seen.add(d); dates.push(d); }
  }
  return { dates };
}

export async function getImageDetail(id) {
  await delay(100);
  const all = [...ADMIN_IMAGES, ...ALICE_IMAGES];
  const img = all.find(i => i.id === id);
  if (!img) throw new Error('Not found');
  return img;
}

export async function deleteImage(id) {
  await delay(200);
  return { ok: true };
}

export async function getOwners() {
  await delay(100);
  return {
    owners: [
      { username: 'admin', folder_name: 'admin', isSelf: true },
      { username: 'alice', folder_name: 'alice', isSelf: false },
    ],
  };
}

export function getThumbUrl(id) {
  const all = [...ADMIN_IMAGES, ...ALICE_IMAGES];
  const img = all.find(i => i.id === id);
  return img?.thumbnail_url || `https://picsum.photos/seed/${id}/300/200`;
}

export function getFullUrl(id) {
  const all = [...ADMIN_IMAGES, ...ALICE_IMAGES];
  const img = all.find(i => i.id === id);
  return img?.full_url || `https://picsum.photos/seed/${id}/1280/720`;
}

// ── Users API ─────────────────────────────────────────────────────────────────

export async function getUsers() {
  await delay(100);
  return { users: MOCK_USERS };
}

export async function createUser(data) {
  await delay(300);
  return {
    id: 99,
    username: data.username,
    role: data.role || 'contributor',
    folder_name: data.username,
    api_key: 'new-demo-api-key-' + Math.random().toString(36).slice(2),
    generated_password: data.password || 'DemoPass#123',
  };
}

export async function updateUser(id, updates) {
  await delay(200);
  const user = MOCK_USERS.find(u => u.id === id);
  return { ...user, ...updates };
}

export async function deleteUser(id) {
  await delay(200);
  return { ok: true };
}

export async function rotateApiKey(id) {
  await delay(200);
  return { api_key: 'rotated-demo-key-' + Math.random().toString(36).slice(2) };
}
