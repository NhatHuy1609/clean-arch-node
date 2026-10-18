import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../../test-support/FixedClock';
import { SequentialIdGenerator } from '../../../test-support/SequentialIdGenerator';
import { InMemoryProductRepository } from '../../infrastructure/persistence/in-memory/InMemoryProductRepository';
import { NotFoundError } from '../errors';
import { CreateProduct } from './CreateProduct';
import { GetProduct } from './GetProduct';

describe('GetProduct', () => {
  it('returns the product as a DTO', async () => {
    const products = new InMemoryProductRepository();
    const created = await new CreateProduct(products, new SequentialIdGenerator(), new FixedClock()).execute({
      code: 'PD-001',
      name: 'iPhone',
    });

    expect(await new GetProduct(products).execute(created.id)).toEqual(created);
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(new GetProduct(new InMemoryProductRepository()).execute('missing')).rejects.toThrow(NotFoundError);
  });
});
