# ── Stage 1: Build React client ──────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /build/client

# Install client dependencies
COPY client/package.json ./
RUN npm install

# Build the React app
COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install server dependencies
COPY server/package.json ./
RUN npm install --omit=dev

# Copy server source
COPY server/index.js ./

# Copy built client into server's static folder
COPY --from=client-builder /build/client/dist ./client/dist

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

# Start
CMD ["node", "index.js"]
