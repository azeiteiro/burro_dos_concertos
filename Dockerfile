# ===== Stage 1: Builder =====
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies (Debian-based)
RUN apt-get update -y && \
    apt-get install -y openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY prisma ./prisma

# Install ALL dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client with the new schema
RUN pnpm exec prisma generate

# Copy source and build
COPY src ./src
RUN pnpm build

# ===== Stage 2: Production (Alpine) =====
FROM node:22-alpine AS production

WORKDIR /app

# Install runtime dependencies (Alpine uses apk)
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install ONLY production dependencies, skip scripts
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Generate Prisma client for production
RUN pnpm exec prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Clean up
RUN rm -rf /root/.npm /root/.cache /tmp/*

ENV NODE_ENV=production

CMD ["node", "dist/bot.js"]