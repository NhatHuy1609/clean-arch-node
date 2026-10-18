import { ConflictError, NotFoundError } from '../../../application/errors';
import type { ProductRepository } from '../../../application/ports/ProductRepository';
import { Product, type ProductSnapshot } from '../../../domain/product/Product';
import type { ProductCode } from '../../../domain/product/ProductCode';

/**
 * The first adapter for the `ProductRepository` port: in-memory storage.
 * Used by use-case unit tests and to run the app without a database (`PERSISTENCE=memory`).
 *
 * Stores **snapshots** (copies), not Product objects: just like a real database,
 * changing a loaded Product without calling `update()` has no effect.
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly rows = new Map<string, ProductSnapshot>();

  async findById(id: string): Promise<Product | null> {
    const row = this.rows.get(id);
    return row ? Product.restore(row) : null;
  }

  async findByCode(code: ProductCode): Promise<Product | null> {
    for (const row of this.rows.values()) {
      if (row.code === code.value) return Product.restore(row);
    }
    return null;
  }

  async list(): Promise<Product[]> {
    return [...this.rows.values()]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .map((row) => Product.restore(row));
  }

  async add(product: Product): Promise<void> {
    const row = product.toSnapshot();
    if (this.rows.has(row.id)) {
      throw new ConflictError(`Product id "${row.id}" already exists.`);
    }
    if ([...this.rows.values()].some((existing) => existing.code === row.code)) {
      throw new ConflictError(`Product code "${row.code}" already exists.`);
    }
    this.rows.set(row.id, row);
  }

  async update(product: Product): Promise<void> {
    if (!this.rows.has(product.id)) throw new NotFoundError('Product', product.id);
    this.rows.set(product.id, product.toSnapshot());
  }
}
