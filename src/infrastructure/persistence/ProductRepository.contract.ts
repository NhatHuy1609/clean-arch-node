import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../application/errors';
import type { ProductRepository } from '../../application/ports/ProductRepository';
import { Product } from '../../domain/product/Product';
import { ProductCode } from '../../domain/product/ProductCode';

/**
 * Contract test: ONE suite, run against EVERY `ProductRepository` adapter.
 * This is how we *prove* Liskov Substitution: any adapter that passes it can be
 * used by the use cases without them knowing or changing.
 *
 * `createRepository` must return an empty repository every time it is called.
 */
export function describeProductRepositoryContract(
  adapterName: string,
  createRepository: () => Promise<ProductRepository>,
): void {
  describe(`ProductRepository contract: ${adapterName}`, () => {
    let repository: ProductRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    const T0 = new Date('2026-01-01T00:00:00.000Z');
    const T1 = new Date('2026-01-02T00:00:00.000Z');
    const newProduct = (code = 'PD-001', now = T0, id: string = randomUUID()) =>
      Product.create({ id, code, name: `Product ${code}`, description: 'desc', now });

    it('finds an added product by id with all fields intact', async () => {
      const product = newProduct();
      await repository.add(product);

      const found = await repository.findById(product.id);

      expect(found?.toSnapshot()).toEqual(product.toSnapshot());
    });

    it('returns null for unknown ids, including ids that are not UUIDs', async () => {
      expect(await repository.findById(randomUUID())).toBeNull();
      expect(await repository.findById('not-a-uuid')).toBeNull();
    });

    it('finds a product by code', async () => {
      const product = newProduct('PD-777');
      await repository.add(product);

      expect((await repository.findByCode(ProductCode.create('pd-777')))?.id).toBe(product.id);
      expect(await repository.findByCode(ProductCode.create('NOPE'))).toBeNull();
    });

    it('rejects a second product with the same code (race-condition backstop)', async () => {
      await repository.add(newProduct('PD-001'));

      await expect(repository.add(newProduct('PD-001'))).rejects.toThrow(ConflictError);
    });

    it('rejects a second product with the same id', async () => {
      const id = randomUUID();
      await repository.add(newProduct('PD-001', T0, id));

      await expect(repository.add(newProduct('PD-002', T0, id))).rejects.toThrow(ConflictError);
    });

    it('persists changes only when update() is called', async () => {
      const product = newProduct();
      await repository.add(product);

      const loaded = (await repository.findById(product.id))!;
      loaded.rename('Renamed', T1);
      expect((await repository.findById(product.id))?.name).toBe(product.name);

      await repository.update(loaded);
      const reloaded = await repository.findById(product.id);
      expect(reloaded?.name).toBe('Renamed');
      expect(reloaded?.updatedAt).toEqual(T1);
    });

    it('throws NotFoundError when updating a product that does not exist', async () => {
      await expect(repository.update(newProduct())).rejects.toThrow(NotFoundError);
      await expect(repository.update(newProduct('PD-002', T0, 'not-a-uuid'))).rejects.toThrow(NotFoundError);
    });

    it('lists products by createdAt, then id', async () => {
      const later = newProduct('B-1', T1);
      const earlierA = newProduct('C-1', T0, '00000000-0000-4000-8000-00000000000a');
      const earlierB = newProduct('A-1', T0, '00000000-0000-4000-8000-00000000000b');
      for (const product of [later, earlierB, earlierA]) await repository.add(product);

      const ids = (await repository.list()).map((product) => product.id);

      expect(ids).toEqual([earlierA.id, earlierB.id, later.id]);
    });
  });
}
