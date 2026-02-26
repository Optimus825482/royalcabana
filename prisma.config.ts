import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js .env.local dosyasını yükle
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
