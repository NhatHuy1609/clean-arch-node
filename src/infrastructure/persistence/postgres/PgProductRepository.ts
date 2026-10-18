import type pg from 'pg';
import { ConflictError, NotFoundError } from '../../../application/errors';
import type { ProductRepository } from '../../../application/ports/ProductRepository';
import { Product } from '../../../domain/product/Product';
import type { ProductCode } from '../../../domain/product/ProductCode';

interface ProductRow {
  id: string;
  code: string;
  name: string;
  description: string;
  created_at: Date;
  updated_at: Date | null;
}

const COLUMNS = 'id, code, name, description, created_at, updated_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION = '23505';

/**
 * PostgreSQL adapter for the `ProductRepository` port, written in plain SQL (`pg` driver).
 * Row ↔ entity mapping lives entirely here — Domain and Application never know SQL exists.
 *
 * Notice where this adapter has to work to behave like InMemoryProductRepository
 * (Liskov Substitution): non-UUID ids, unique constraint errors... The contract test enforces it.
 */
export class PgProductRepository implements ProductRepository {
  constructor(private readonly db: pg.Pool) {}

  async findById(id: string): Promise<Product | null> {
    // A uuid column throws on non-UUID strings; to the caller that simply means "not found".
    if (!UUID.test(id)) return null;
    const { rows } = await this.db.query<ProductRow>(`SELECT ${COLUMNS} FROM products WHERE id = $1`, [id]);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByCode(code: ProductCode): Promise<Product | null> {
    const { rows } = await this.db.query<ProductRow>(`SELECT ${COLUMNS} FROM products WHERE code = $1`, [code.value]);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async list(): Promise<Product[]> {
    const { rows } = await this.db.query<ProductRow>(`SELECT ${COLUMNS} FROM products ORDER BY created_at, id`);
    return rows.map(toEntity);
  }

  async add(product: Product): Promise<void> {
    const s = product.toSnapshot();
    try {
      await this.db.query(
        `INSERT INTO products (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6)`,
        [s.id, s.code, s.name, s.description, s.createdAt, s.updatedAt],
      );
    } catch (error) {
      // Translate infrastructure errors into the application's language — callers need not know Postgres error codes.
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          error.constraint === 'products_code_key'
            ? `Product code "${s.code}" already exists.`
            : `Product id "${s.id}" already exists.`,
        );
      }
      throw error;
    }
  }

  async update(product: Product): Promise<void> {
    const s = product.toSnapshot();
    const result = UUID.test(s.id)
      ? await this.db.query('UPDATE products SET name = $2, description = $3, updated_at = $4 WHERE id = $1', [
          s.id,
          s.name,
          s.description,
          s.updatedAt,
        ])
      : { rowCount: 0 };
    if (result.rowCount === 0) throw new NotFoundError('Product', s.id);
  }
}

function toEntity(row: ProductRow): Product {
  return Product.restore({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function isUniqueViolation(error: unknown): error is { code: string; constraint?: string } {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === UNIQUE_VIOLATION;
}
