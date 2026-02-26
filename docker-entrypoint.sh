#!/bin/sh
set -e

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
