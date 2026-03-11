# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install backend dependencies (production only)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend into Express static dir
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Rebuild native modules for Alpine (sharp)
RUN cd backend && npm rebuild sharp 2>/dev/null || true

# Create required directories and non-root user
RUN addgroup -S snapuser && adduser -S snapuser -G snapuser && \
    mkdir -p /data /images/admin /images/uploads && \
    chown -R snapuser:snapuser /data /images/uploads

USER snapuser

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "src/index.js"]
