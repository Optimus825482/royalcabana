#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  if [ -n "$POSTGRES_HOST" ] && [ -n "$POSTGRES_DB" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
    echo "ℹ️  DATABASE_URL generated from POSTGRES_* env vars"
  elif [ -n "$PGHOST" ] && [ -n "$PGDATABASE" ] && [ -n "$PGUSER" ] && [ -n "$PGPASSWORD" ]; then
    export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}"
    echo "ℹ️  DATABASE_URL generated from PG* env vars"
  else
    echo "❌ DATABASE_URL not set. Please add DATABASE_URL (or POSTGRES_*/PG* vars) in Coolify environment settings."
    exit 1
  fi
fi

echo "⏳ Waiting for PostgreSQL..."
until node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => { c.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  sleep 2
done
echo "✅ PostgreSQL ready"

echo "🔄 Running migrations..."
node_modules/.bin/prisma migrate deploy

echo "🌱 Running seed..."
node_modules/.bin/ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts || echo "⚠️  Seed skipped (already seeded)"

echo "🚀 Starting Next.js..."
exec node server.js
