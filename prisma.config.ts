import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js .env.local dosyasını yükle (yoksa process.env'den okur)
config({ path: ".env.local" });

const resolveDatabaseUrl = (): string | undefined => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.POSTGRES_HOST ?? process.env.PGHOST;
  const port = process.env.POSTGRES_PORT ?? process.env.PGPORT ?? "5432";
  const database = process.env.POSTGRES_DB ?? process.env.PGDATABASE;
  const user = process.env.POSTGRES_USER ?? process.env.PGUSER;
  const password = process.env.POSTGRES_PASSWORD ?? process.env.PGPASSWORD;

  if (host && database && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  return undefined;
};

const databaseUrl = resolveDatabaseUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
