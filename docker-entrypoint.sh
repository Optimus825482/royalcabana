#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  if [ -n "$POSTGRES_DB" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
    POSTGRES_HOST_VALUE="${POSTGRES_HOST:-localhost}"
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST_VALUE}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
    echo "ℹ️  DATABASE_URL generated from POSTGRES_* env vars (host=${POSTGRES_HOST_VALUE})"
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
npx tsx prisma/seed.ts || echo "⚠️  Seed skipped (already seeded)"

echo "🚀 Starting Next.js..."
echo "ℹ️  NEXTAUTH_URL=${NEXTAUTH_URL:-NOT SET}"
echo "ℹ️  NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-NOT SET}"
exec node server.js
