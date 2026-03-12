#!/bin/sh
set -e

echo "Running migrations..."

# Try to run migrations
if ! npx prisma migrate deploy 2>&1 | tee /tmp/migrate.log; then
  # Check if it's the P3005 error (database not empty)
  if grep -q "P3005" /tmp/migrate.log; then
    echo "Database needs baseline. Marking existing migrations as applied..."

    # Baseline the first two migrations (already in production)
    npx prisma migrate resolve --applied "20251009152454_init"
    npx prisma migrate resolve --applied "20251015150018_add_user_role"

    # Now run migrations again to apply the latest one
    echo "Running migrations after baseline..."
    npx prisma migrate deploy
  else
    # Some other error, exit with failure
    exit 1
  fi
fi

echo "Migrations completed successfully"
