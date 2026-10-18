import pg from 'pg';
import type { ProductRepository } from './application/ports/ProductRepository';
import { CreateProduct } from './application/products/CreateProduct';
import { GetProduct } from './application/products/GetProduct';
import { ListProducts } from './application/products/ListProducts';
import { RenameProduct } from './application/products/RenameProduct';
import { InMemoryProductRepository } from './infrastructure/persistence/in-memory/InMemoryProductRepository';
import { PgProductRepository } from './infrastructure/persistence/postgres/PgProductRepository';
import { RandomUuidGenerator } from './infrastructure/system/RandomUuidGenerator';
import { SystemClock } from './infrastructure/system/SystemClock';
import { createApp } from './presentation/http/app';

/**
 * COMPOSITION ROOT — the only place that knows every concrete implementation
 * (the equivalent of Program.cs in ClassifiedAds.WebAPI).
 *
 * Switching PERSISTENCE=memory ↔ postgres only swaps the adapter here;
 * not a single line in domain/, application/ or presentation/ changes.
 */

const port = Number(process.env.PORT ?? 3000);
const persistence = process.env.PERSISTENCE ?? 'memory';

let products: ProductRepository;
let pool: pg.Pool | undefined;

if (persistence === 'postgres') {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('PERSISTENCE=postgres requires DATABASE_URL (see .env.example).');
  pool = new pg.Pool({ connectionString });
  products = new PgProductRepository(pool);
} else if (persistence === 'memory') {
  products = new InMemoryProductRepository();
} else {
  throw new Error(`Unknown PERSISTENCE "${persistence}". Use "memory" or "postgres".`);
}

const clock = new SystemClock();
const ids = new RandomUuidGenerator();

const app = createApp({
  products: {
    createProduct: new CreateProduct(products, ids, clock),
    getProduct: new GetProduct(products),
    listProducts: new ListProducts(products),
    renameProduct: new RenameProduct(products, clock),
  },
});

const server = app.listen(port, () => {
  console.log(`clean-arch-node listening on http://localhost:${port} (persistence: ${persistence})`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void (pool?.end() ?? Promise.resolve()).then(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
