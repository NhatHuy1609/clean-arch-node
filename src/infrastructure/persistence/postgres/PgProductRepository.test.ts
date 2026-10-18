import pg from 'pg';
import { afterAll, beforeAll, describe } from 'vitest';
import { describeProductRepositoryContract } from '../ProductRepository.contract';
import { migrate } from './migrate';
import { PgProductRepository } from './PgProductRepository';

const connectionString = process.env.DATABASE_URL;

// Needs a real PostgreSQL: `npm run db:up`, then set DATABASE_URL (see .env.example).
// Without DATABASE_URL this suite is skipped, not failed.
describe.skipIf(!connectionString)('PgProductRepository (PostgreSQL)', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString });
    await migrate(pool);
  });

  afterAll(async () => {
    await pool?.end();
  });

  describeProductRepositoryContract('postgres', async () => {
    await pool.query('TRUNCATE products');
    return new PgProductRepository(pool);
  });
});
