import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './errorHandler';
import { productRoutes, type ProductUseCases } from './products/productRoutes';

export interface AppDependencies {
  products: ProductUseCases;
}

/**
 * Builds the Express app from pre-wired use cases. The app creates no dependencies itself —
 * it receives them all, so tests can pass in-memory adapters while `main.ts` passes Postgres.
 */
export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/products', productRoutes(deps.products));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
