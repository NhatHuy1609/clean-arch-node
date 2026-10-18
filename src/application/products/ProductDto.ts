import type { Product } from '../../domain/product/Product';

/**
 * What a use case returns to the outside: a plain object, safe to serialize.
 * The presentation layer therefore never needs to (and should not) touch entities.
 */
export interface ProductDto {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string | null;
}

export function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    code: product.code.value,
    name: product.name,
    description: product.description,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt?.toISOString() ?? null,
  };
}
