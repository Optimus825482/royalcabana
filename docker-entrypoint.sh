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
const { URL } = require('url');
const net = require('net');
const dbUrl = new URL(process.env.DATABASE_URL);
const socket = net.createConnection({
  host: dbUrl.hostname,
  port: dbUrl.port ? Number(dbUrl.port) : 5432,
});
socket.setTimeout(2000);
socket.on('connect', () => { socket.end(); process.exit(0); });
socket.on('timeout', () => { socket.destroy(); process.exit(1); });
socket.on('error', () => process.exit(1));
" 2>/dev/null; do
  sleep 2
done
echo "✅ PostgreSQL ready"

echo "🔄 Running migrations..."
node_modules/.bin/prisma migrate deploy

if [ "${RUN_SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "🌱 Running seed..."
  node_modules/.bin/tsx prisma/seed.ts || echo "⚠️  Seed skipped (already seeded)"
else
  echo "🌱 Seed on startup disabled (set RUN_SEED_ON_STARTUP=true to enable)"
fi

echo "🚀 Starting Next.js..."
echo "ℹ️  NEXTAUTH_URL=${NEXTAUTH_URL:-NOT SET}"
echo "ℹ️  NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-NOT SET}"
exec node server.js
