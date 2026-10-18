import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../test-support/FixedClock';
import { SequentialIdGenerator } from '../../../test-support/SequentialIdGenerator';
import { DomainError } from '../../domain/shared/DomainError';
import { InMemoryProductRepository } from '../../infrastructure/persistence/in-memory/InMemoryProductRepository';
import { ConflictError } from '../errors';
import { CreateProduct } from './CreateProduct';

describe('CreateProduct', () => {
  let products: InMemoryProductRepository;
  let createProduct: CreateProduct;

  beforeEach(() => {
    // A miniature "composition root" for the test: wire the use case with fake adapters.
    products = new InMemoryProductRepository();
    createProduct = new CreateProduct(products, new SequentialIdGenerator(), new FixedClock('2026-03-01T10:00:00Z'));
  });

  it('creates and stores a product, returning a DTO', async () => {
    const dto = await createProduct.execute({ code: 'pd-001', name: 'iPhone', description: 'Phone' });

    expect(dto).toEqual({
      id: 'id-1',
      code: 'PD-001',
      name: 'iPhone',
      description: 'Phone',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: null,
    });
    expect(await products.findById('id-1')).not.toBeNull();
  });

  it('rejects a duplicate code, regardless of case', async () => {
    await createProduct.execute({ code: 'PD-001', name: 'iPhone' });

    await expect(createProduct.execute({ code: 'pd-001', name: 'Other' })).rejects.toThrow(ConflictError);
  });

  it('lets domain rules reject invalid input and stores nothing', async () => {
    await expect(createProduct.execute({ code: 'PD-001', name: '' })).rejects.toThrow(DomainError);

    expect(await products.list()).toEqual([]);
  });
});
