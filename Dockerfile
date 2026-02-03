# ===== Stage 1: Builder =====
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies (Debian-based)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency files (root and workspace)
COPY package.json pnpm-lock.yaml tsconfig.json pnpm-workspace.yaml ./
COPY prisma ./prisma

# Copy web app files
COPY web/package.json web/tsconfig.json web/tsconfig.node.json web/vite.config.ts ./web/
COPY web/src ./web/src
COPY web/index.html ./web/
COPY web/public ./web/public

# Install ALL dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client with the new schema
RUN pnpm exec prisma generate

# Build Mini App with production API URL
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN cd web && pnpm run build

# Copy source and build bot
COPY src ./src
RUN pnpm build

# ===== Stage 2: Production (Alpine) =====
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies (Alpine uses apk)
RUN apk add --no-cache openssl

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set NODE_ENV before install to skip husky in prepare script
ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Fetch only production dependencies to store (faster)
RUN pnpm fetch --prod

# Install production dependencies using offline mode
RUN pnpm install --prod --frozen-lockfile --offline

# Generate Prisma client in production (prisma must be in dependencies)
RUN pnpm exec prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy built Mini App from builder
COPY --from=builder /app/web/dist ./web/dist

# Aggressive cleanup - remove pnpm and all caches
RUN rm -rf \
    /root/.local/share/pnpm \
    /root/.npm \
    /root/.cache \
    /tmp/* \
    /app/.pnpm-store \
    $(which pnpm) \
    /root/.cache/node/corepack

CMD ["node", "dist/bot.js"]