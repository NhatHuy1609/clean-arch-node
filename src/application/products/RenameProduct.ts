import { NotFoundError } from '../errors';
import type { Clock } from '../ports/Clock';
import type { ProductRepository } from '../ports/ProductRepository';
import { toProductDto, type ProductDto } from './ProductDto';

export interface RenameProductInput {
  id: string;
  name: string;
}

/**
 * The common shape of a state-changing use case:
 * load the aggregate → call business behaviour (the entity validates itself) → save → return a DTO.
 * The use case **orchestrates**; the rules live in the entity.
 */
export class RenameProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RenameProductInput): Promise<ProductDto> {
    const product = await this.products.findById(input.id);
    if (!product) throw new NotFoundError('Product', input.id);

    product.rename(input.name, this.clock.now());

    await this.products.update(product);
    return toProductDto(product);
  }
}
