import { readdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url);

/**
 * A minimal migration runner: applies pending `.sql` files in order, one transaction per file.
 * (The equivalent of ClassifiedAds.Migrator in the .NET repo, without an ORM.)
 */
export async function migrate(pool: pg.Pool, log: (message: string) => void = () => {}): Promise<void> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       text        PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const applied = new Set(
    (await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((row) => row.name),
  );
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      log(`applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Run directly: npm run db:migrate
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set (see .env.example).');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString });
  try {
    await migrate(pool, console.log);
    console.log('migrations up to date');
  } finally {
    await pool.end();
  }
}
