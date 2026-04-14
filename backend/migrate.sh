#!/bin/bash
set -e

# Use defaults if not set
PG_USER="${POSTGRES_USER:-postgres}"
PG_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
PG_DB="${POSTGRES_DB:-taskflow}"

export PGPASSWORD="$PG_PASSWORD"

echo "Running database migrations..."
echo "Using user: $PG_USER, db: $PG_DB"

# Wait for PostgreSQL to be ready
until psql -h db -U "$PG_USER" -d "$PG_DB" -c '\q'; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

echo "PostgreSQL is ready!"

# Apply migrations
MIGRATIONS_PATH="/app/migrations"

# Up migrations
echo "Applying migrations..."
for migration in $(ls -v $MIGRATIONS_PATH/*.up.sql 2>/dev/null || echo ""); do
  echo "Running: $migration"
  psql -h db -U "$PG_USER" -d "$PG_DB" -f "$migration"
done

# Seed data
if [ -f "$MIGRATIONS_PATH/seed.sql" ]; then
  echo "Seeding database..."
  psql -h db -U "$PG_USER" -d "$PG_DB" -f "$MIGRATIONS_PATH/seed.sql"
fi

echo "Migrations completed!"
