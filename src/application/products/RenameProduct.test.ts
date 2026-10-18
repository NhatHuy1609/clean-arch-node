import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../test-support/FixedClock';
import { SequentialIdGenerator } from '../../../test-support/SequentialIdGenerator';
import { DomainError } from '../../domain/shared/DomainError';
import { InMemoryProductRepository } from '../../infrastructure/persistence/in-memory/InMemoryProductRepository';
import { NotFoundError } from '../errors';
import { CreateProduct } from './CreateProduct';
import { RenameProduct } from './RenameProduct';

describe('RenameProduct', () => {
  let products: InMemoryProductRepository;
  let clock: FixedClock;
  let createProduct: CreateProduct;
  let renameProduct: RenameProduct;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    clock = new FixedClock('2026-03-01T10:00:00Z');
    createProduct = new CreateProduct(products, new SequentialIdGenerator(), clock);
    renameProduct = new RenameProduct(products, clock);
  });

  it('renames and persists the change', async () => {
    const { id } = await createProduct.execute({ code: 'PD-001', name: 'iPhone' });
    clock.advance(60_000);

    const dto = await renameProduct.execute({ id, name: 'iPhone 17' });

    expect(dto.name).toBe('iPhone 17');
    expect(dto.updatedAt).toBe('2026-03-01T10:01:00.000Z');
    expect((await products.findById(id))?.name).toBe('iPhone 17');
  });

  it('fails loudly for an unknown id instead of silently doing nothing', async () => {
    await expect(renameProduct.execute({ id: 'missing', name: 'x' })).rejects.toThrow(NotFoundError);
  });

  it('keeps the stored product unchanged when the new name is invalid', async () => {
    const { id } = await createProduct.execute({ code: 'PD-001', name: 'iPhone' });

    await expect(renameProduct.execute({ id, name: '  ' })).rejects.toThrow(DomainError);
    expect((await products.findById(id))?.name).toBe('iPhone');
  });
});
