import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Load .env (if present) so PostgreSQL tests see DATABASE_URL. Without .env, Postgres tests are skipped.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
