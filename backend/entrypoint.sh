#!/bin/sh

# ========================================================
# 🚀 TASKFLOW PRODUCTION ENTRYPOINT
# ========================================================

# Exit immediately if a command exits with a non-zero status
set -e

echo "🟢 Waiting for services to stabilize..."
# Small delay to ensure DB and Redis are ready to accept connections
# after their healthchecks pass.
sleep 3

echo "📦 Running Database Migrations..."
npm run typeorm migration:run -- -d dist/common/db/data-source.js

echo "🌱 Seeding initial data..."
# This ensures test@example.com and dummy projects are available
node dist/run-seeder.js

echo "🚀 Starting NestJS Backend in Production Mode..."
# Use 'exec' to ensure signals (SIGTERM/SIGINT) are passed to the node process
exec npm run start:prod
