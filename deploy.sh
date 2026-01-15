#!/bin/bash

# Deployment script for Digital Ocean staging
# Usage: ./deploy.sh

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from git..."
git fetch origin
git reset --hard origin/master

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm exec prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm exec prisma migrate deploy

# Build the project
echo "🔨 Building project..."
pnpm build

# Restart PM2 process
echo "♻️  Restarting application..."
if pm2 describe burro_dos_concertos_staging > /dev/null 2>&1; then
  pm2 restart burro_dos_concertos_staging
  echo "✅ Application restarted"
else
  pm2 start ecosystem.config.js --only burro_dos_concertos_staging
  echo "✅ Application started"
fi

echo "🎉 Deployment completed successfully!"
