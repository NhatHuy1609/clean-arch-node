import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../../test-support/FixedClock';
import { SequentialIdGenerator } from '../../../test-support/SequentialIdGenerator';
import { InMemoryProductRepository } from '../../infrastructure/persistence/in-memory/InMemoryProductRepository';
import { CreateProduct } from './CreateProduct';
import { ListProducts } from './ListProducts';

describe('ListProducts', () => {
  it('lists products in creation order', async () => {
    const products = new InMemoryProductRepository();
    const clock = new FixedClock();
    const createProduct = new CreateProduct(products, new SequentialIdGenerator(), clock);

    await createProduct.execute({ code: 'B-1', name: 'Second' });
    clock.set('2025-12-31T00:00:00Z');
    await createProduct.execute({ code: 'A-1', name: 'First' });

    const names = (await new ListProducts(products).execute()).map((p) => p.name);

    expect(names).toEqual(['First', 'Second']);
  });
});
