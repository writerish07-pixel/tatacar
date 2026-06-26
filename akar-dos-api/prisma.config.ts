import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration. The datasource URL is consumed here by the schema
 * engine (migrate / db pull). At runtime the application connects through the
 * `pg` driver adapter (src/prisma/prisma.service.ts) — Rust-free client.
 */
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: './prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
