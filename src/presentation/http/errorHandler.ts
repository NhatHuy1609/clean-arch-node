import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { ConflictError, NotFoundError } from '../../application/errors';
import { DomainError } from '../../domain/shared/DomainError';

/**
 * The ONLY place that knows "which error ↔ which HTTP status" — the equivalent of GlobalExceptionHandler in the .NET repo.
 * Domain and Application throw errors in their own language; translating them to HTTP is this layer's job.
 *
 *   ZodError / bad JSON  → 400  (request has the wrong shape)
 *   DomainError          → 422  (right shape, but breaks a business rule)
 *   NotFoundError        → 404
 *   ConflictError        → 409
 *   anything else        → 500  (internal details are not leaked)
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return problem(res, 400, 'invalid_request', 'Request body is invalid.', {
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }
  if (isJsonSyntaxError(error)) {
    return problem(res, 400, 'invalid_json', 'Request body is not valid JSON.');
  }
  if (error instanceof DomainError) {
    return problem(res, 422, error.code, error.message);
  }
  if (error instanceof NotFoundError) {
    return problem(res, 404, 'not_found', error.message);
  }
  if (error instanceof ConflictError) {
    return problem(res, 409, 'conflict', error.message);
  }

  console.error(error);
  return problem(res, 500, 'internal_error', 'An unexpected error occurred.');
};

export const notFoundHandler: RequestHandler = (req, res) => {
  problem(res, 404, 'route_not_found', `Cannot ${req.method} ${req.path}`);
};

/** Error format per RFC 9457 (Problem Details), like ProblemDetails in ASP.NET Core. */
function problem(res: Response, status: number, code: string, detail: string, extra: object = {}): void {
  res.status(status).type('application/problem+json').json({ status, code, detail, ...extra });
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError && (error as { type?: string }).type === 'entity.parse.failed';
}
