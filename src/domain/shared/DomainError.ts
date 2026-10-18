/**
 * A broken business rule (invariant).
 * - `code`: a stable string clients/callers can rely on (unchanged when the wording changes).
 * - `message`: a human-readable description.
 * The presentation layer maps this to HTTP 422 — the domain knows nothing about HTTP.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
