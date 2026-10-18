import { NotFoundError } from '../errors';
import type { ProductRepository } from '../ports/ProductRepository';
import { toProductDto, type ProductDto } from './ProductDto';

export class GetProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<ProductDto> {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundError('Product', id);
    return toProductDto(product);
  }
}
