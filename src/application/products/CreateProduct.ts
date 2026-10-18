import { Product } from '../../domain/product/Product';
import { ConflictError } from '../errors';
import type { Clock } from '../ports/Clock';
import type { IdGenerator } from '../ports/IdGenerator';
import type { ProductRepository } from '../ports/ProductRepository';
import { toProductDto, type ProductDto } from './ProductDto';

export interface CreateProductInput {
  code: string;
  name: string;
  description?: string;
}

/**
 * "Create Product" use case — the equivalent of AddUpdateProductCommand + Handler in the .NET repo,
 * but with **a single intent**: create. Updating is a separate use case (`RenameProduct`).
 *
 * Every dependency is a port received through the constructor → tested with fake adapters, no DB needed.
 */
export class CreateProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductDto> {
    const product = Product.create({ ...input, id: this.ids.next(), now: this.clock.now() });

    // Check early to return a clear error. Two concurrent requests can still both pass this check,
    // so the repository must also reject duplicate codes (unique constraint) — see the contract test.
    if (await this.products.findByCode(product.code)) {
      throw new ConflictError(`Product code "${product.code.value}" already exists.`);
    }

    await this.products.add(product);
    return toProductDto(product);
  }
}
