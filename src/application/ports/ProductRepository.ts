import type { Product } from '../../domain/product/Product';
import type { ProductCode } from '../../domain/product/ProductCode';

/**
 * Port (outbound): Application **defines** what it needs, Infrastructure **provides** it.
 * This is Dependency Inversion — use cases depend on this interface, not on Postgres.
 *
 * The interface holds exactly what use cases need (Interface Segregation).
 * It never returns `IQueryable`/a query builder like `IRepository` in the .NET repo → the ORM does not leak out.
 *
 * Every implementation must pass the same contract test suite: `ProductRepository.contract.ts` (step 3).
 */
export interface ProductRepository {
  findById(id: string): Promise<Product | null>;

  findByCode(code: ProductCode): Promise<Product | null>;

  /** Ordered by `createdAt` ascending, then by `id`. */
  list(): Promise<Product[]>;

  /** Adds a new Product. Throws `ConflictError` on a duplicate `id` or `code`. */
  add(product: Product): Promise<void>;

  /**
   * Saves changes to an existing Product. Throws `NotFoundError` if it does not exist.
   * `add`/`update` are separate instead of one `AddOrUpdate` that guesses intent from the id.
   */
  update(product: Product): Promise<void>;
}
