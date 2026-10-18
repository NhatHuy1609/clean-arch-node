import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/DomainError';
import { Product } from './Product';

const T0 = new Date('2026-01-01T00:00:00Z');
const T1 = new Date('2026-01-02T00:00:00Z');

const newProduct = () => Product.create({ id: 'p-1', code: 'pd-001', name: '  iPhone  ', now: T0 });

describe('Product.create', () => {
  it('creates a valid product with normalized values', () => {
    const product = newProduct();

    expect(product.toSnapshot()).toEqual({
      id: 'p-1',
      code: 'PD-001',
      name: 'iPhone',
      description: '',
      createdAt: T0,
      updatedAt: null,
    });
  });

  it.each([
    ['empty name', { name: '   ' }, 'product.invalid_name'],
    ['too long name', { name: 'x'.repeat(201) }, 'product.invalid_name'],
    ['too long description', { description: 'x'.repeat(2001) }, 'product.invalid_description'],
    ['invalid code', { code: '!' }, 'product.invalid_code'],
  ])('rejects %s', (_, override, code) => {
    const create = () => Product.create({ id: 'p-1', code: 'PD-001', name: 'ok', now: T0, ...override });

    expect(create).toThrow(DomainError);
    expect(create).toThrow(expect.objectContaining({ code }));
  });
});

describe('Product.rename', () => {
  it('changes the name and stamps updatedAt', () => {
    const product = newProduct();

    product.rename('iPhone 17', T1);

    expect(product.name).toBe('iPhone 17');
    expect(product.updatedAt).toEqual(T1);
  });

  it('is a no-op when the name does not change', () => {
    const product = newProduct();

    product.rename(' iPhone ', T1);

    expect(product.updatedAt).toBeNull();
  });

  it('keeps the old name when the new one is invalid', () => {
    const product = newProduct();

    expect(() => product.rename('', T1)).toThrow(DomainError);
    expect(product.name).toBe('iPhone');
  });
});

describe('Product snapshot', () => {
  it('round-trips through restore', () => {
    const original = newProduct();
    original.changeDescription('Flagship phone', T1);

    const restored = Product.restore(original.toSnapshot());

    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
  });

  it('does not leak internal state through snapshots or getters', () => {
    const product = newProduct();

    product.toSnapshot().createdAt.setFullYear(1999);
    product.createdAt.setFullYear(1999);

    expect(product.createdAt).toEqual(T0);
  });
});
