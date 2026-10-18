import type { ProductRepository } from '../ports/ProductRepository';
import { toProductDto, type ProductDto } from './ProductDto';

export class ListProducts {
  constructor(private readonly products: ProductRepository) {}

  async execute(): Promise<ProductDto[]> {
    const products = await this.products.list();
    return products.map(toProductDto);
  }
}
