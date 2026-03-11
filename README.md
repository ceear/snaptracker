
# SnapTracker

A self-hosted web app for viewing time-lapse snapshots. Mount a folder of camera images and browse them chronologically in a gallery or scrub through them on an animated timeline. Runs as a single Docker container.

**[Live Demo →](https://your-username.github.io/snaptracker)** *(auto-deployed from `main` branch with mock data)*

---

## Features

- **Gallery view** — responsive thumbnail grid, sortable by date
- **Timeline view** — scrub through images with a slider, play as animation, calendar widget for date navigation
- **Fullscreen modal** — image details and EXIF data
- **Multi-user** — admin creates contributors, each gets an API key for uploading images
- **Folder visibility** — contributors can toggle their folder public (visible to other logged-in users)
- **Upload API** — push images to a contributor's folder via API key (e.g. from a Raspberry Pi)

---

## Quick Start (Docker)

### 1. Clone and configure

```bash
git clone https://github.com/your-username/snaptracker
cd snaptracker
cp .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET` (minimum 32 characters):

```
JWT_SECRET=your-very-long-random-secret-string-here
```

### 2. Prepare your snapshot folder

```bash
mkdir snapshots
# Copy or symlink your time-lapse images into this folder
# Images can be named anything — sorted by filename timestamp or file date
```

### 3. Start

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). On first start, **check the terminal** for the auto-generated admin credentials:

```
╔══════════════════════════════════════╗
║   SnapTracker — First Run Setup      ║
║   Username: admin                    ║
║   Password: Xy9#mP2k...              ║
╚══════════════════════════════════════╝
```

Log in and change the password via the Admin panel.

---

## Configuration

All settings via environment variables (set in `.env` for Docker):

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | **required** | Min 32 chars. Keep secret! |
| `SNAPSHOTS_PATH` | `./snapshots` | Host path to your snapshot images (mounted read-only) |
| `PORT` | `3000` | Host port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origin for CORS |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max upload file size |

---

## Uploading Images via API

Contributors can push images to their folder using their API key:

```bash
curl -X POST \
  -H "X-Api-Key: your-contributor-api-key" \
  -F "image=@/path/to/photo.jpg" \
  http://localhost:3000/api/v1/upload
```

Example script for a Raspberry Pi cron job:

```bash
#!/bin/bash
FILE="/tmp/$(date +%Y-%m-%d_%H-%M-%S).jpg"
libcamera-still -o "$FILE"
curl -s -X POST \
  -H "X-Api-Key: $SNAPTRACKER_API_KEY" \
  -F "image=@$FILE" \
  http://your-server:3000/api/v1/upload
rm "$FILE"
```

**Supported formats:** JPEG, PNG, WebP, TIFF (max 50 MB by default)

---

## Image Sorting

Images are sorted chronologically. Timestamp is parsed from the filename first (fallback: file modification time):

| Filename pattern | Example |
|-----------------|---------|
| `YYYY-MM-DD_HH-MM-SS` | `2024-03-15_14-30-00.jpg` |
| `YYYYMMDD_HHMMSS` | `20240315_143000.jpg` |
| `YYYY-MM-DDTHH:MM:SS` | `2024-03-15T14:30:00.jpg` |
| Unix timestamp (10 digits) | `1710510600.jpg` |
| Fallback | file modification time |

---

## User Management

1. Log in as **admin**
2. Go to **Admin** in the nav bar
3. Click **Add Contributor** — a username + auto-generated password and API key are shown once
4. Share the credentials with the contributor
5. Toggle **Public** to let other logged-in users view that contributor's images

---

## Docker Volume Layout

| Mount | Type | Description |
|-------|------|-------------|
| `./snapshots` → `/images/admin` | Read-only | Admin's snapshot images |
| `uploads_data` → `/images/uploads` | Read-write | Contributor upload folders |
| `db_data` → `/data` | Read-write | SQLite database + thumbnail cache |

---

## Local Development

Run backend and frontend separately for hot-reloading during development — no Docker needed.

### Prerequisites

- Node.js 20+
- A folder with sample JPEG images

### 1. Start the backend

```bash
cd backend
npm install

# Create a local env file
cat > .env.local << EOF
PORT=3001
JWT_SECRET=dev-secret-at-least-32-characters-long
DB_PATH=./dev.db
IMAGE_ADMIN_PATH=../sample-images
IMAGE_UPLOADS_PATH=./uploads
EOF

# Run with nodemon (auto-restarts on save)
node --env-file=.env.local src/index.js
# or: npx nodemon --env-file=.env.local src/index.js
```

The backend starts at **http://localhost:3001**. Check the terminal for auto-generated admin credentials.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev   # Vite dev server at http://localhost:3000
```

Vite proxies `/api` → `http://localhost:3001` automatically. Open [http://localhost:3000](http://localhost:3000).

### 3. Demo mode (no backend needed)

Work on UI without a running backend — uses mock data with picsum.photos images:

```bash
cd frontend
VITE_DEMO_MODE=true npm run dev
```

Log in with any username/password. Two mock folders are available (admin + alice).

### 4. Integration test with Docker

```bash
# From repo root — builds everything and runs as production:
docker compose up --build
```

### Development tips

| Tip | Detail |
|-----|--------|
| Reset database | Delete `backend/dev.db` to trigger first-run seed again |
| Add test images | Put JPEGs in `sample-images/` (gitignored) |
| Backend hot-reload | Uses `nodemon` — restarts on any `.js` change in `backend/src/` |
| Frontend hot-reload | Vite HMR — instant updates, no page refresh needed |
| Thumbnail cache | Stored in `backend/thumbnails/` (gitignored), regenerated on demand |

---

## GitHub Pages Demo

Every push to `main` automatically builds and deploys a demo version to GitHub Pages.

To enable it:
1. Push the repo to GitHub
2. Go to **Settings → Pages** → set source to **Deploy from a branch** → select `gh-pages`
3. The demo URL will be: `https://your-username.github.io/snaptracker`

The demo uses mock data (no real images, no backend). Any login credentials are accepted.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Vite |
| State | Zustand, TanStack Query |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Images | sharp (thumbnails + metadata), exifr (EXIF) |
| Auth | JWT sessions + API key |
| Container | Docker, docker-compose |
