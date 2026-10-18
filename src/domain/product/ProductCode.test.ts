import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/DomainError';
import { ProductCode } from './ProductCode';

describe('ProductCode', () => {
  it('normalizes to trimmed upper case', () => {
    expect(ProductCode.create('  pd-001 ').value).toBe('PD-001');
  });

  it.each(['', 'A', '-AB', 'PD 001', 'PD_001', 'Á01', 'X'.repeat(21)])('rejects %j', (raw) => {
    expect(() => ProductCode.create(raw)).toThrow(DomainError);
  });

  it('compares by value', () => {
    expect(ProductCode.create('pd-1').equals(ProductCode.create('PD-1'))).toBe(true);
    expect(ProductCode.create('PD-1').equals(ProductCode.create('PD-2'))).toBe(false);
  });
});
