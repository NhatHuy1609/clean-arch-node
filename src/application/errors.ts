/**
 * Use-case level errors (unlike `DomainError`, which signals a broken entity invariant).
 * Presentation maps them: NotFoundError → 404, ConflictError → 409.
 */
export abstract class ApplicationError extends Error {}

export class NotFoundError extends ApplicationError {
  constructor(
    readonly resource: string,
    readonly id: string,
  ) {
    super(`${resource} "${id}" was not found.`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
