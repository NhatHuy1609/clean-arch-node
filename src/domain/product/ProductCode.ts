import { DomainError } from '../shared/DomainError';

const PATTERN = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

/**
 * Value object: immutable, compared by value, and **self-validating on creation**.
 * Once you hold a `ProductCode`, it is guaranteed valid — no need to re-check it anywhere else.
 */
export class ProductCode {
  private constructor(readonly value: string) {}

  static create(raw: string): ProductCode {
    const value = raw.trim().toUpperCase();
    if (!PATTERN.test(value)) {
      throw new DomainError(
        'product.invalid_code',
        `Product code "${raw}" must be 2-20 characters of A-Z, 0-9 or "-", not starting with "-".`,
      );
    }
    return new ProductCode(value);
  }

  equals(other: ProductCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
