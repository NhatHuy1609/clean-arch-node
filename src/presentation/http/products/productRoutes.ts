import { Router } from 'express';
import { z } from 'zod';
import type { CreateProduct } from '../../../application/products/CreateProduct';
import type { GetProduct } from '../../../application/products/GetProduct';
import type { ListProducts } from '../../../application/products/ListProducts';
import type { RenameProduct } from '../../../application/products/RenameProduct';

export interface ProductUseCases {
  createProduct: CreateProduct;
  getProduct: GetProduct;
  listProducts: ListProducts;
  renameProduct: RenameProduct;
}

// zod only checks the request *shape* (right types, required fields present).
// Business rules (name length, code format...) live in the Domain — they are not repeated here.
const CreateProductBody = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const RenameProductBody = z.object({
  name: z.string(),
});

/**
 * Thin controller — the equivalent of ProductsController.Post in the .NET repo:
 * parse request → call use case → send response. No business logic, no database access.
 * Errors (including from `parse`) are forwarded to `errorHandler` by Express 5 automatically.
 */
export function productRoutes(useCases: ProductUseCases): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const input = CreateProductBody.parse(req.body);
    const product = await useCases.createProduct.execute(input);
    res.status(201).location(`/products/${product.id}`).json(product);
  });

  router.get('/', async (_req, res) => {
    res.json(await useCases.listProducts.execute());
  });

  router.get('/:id', async (req, res) => {
    res.json(await useCases.getProduct.execute(req.params.id));
  });

  router.patch('/:id', async (req, res) => {
    const { name } = RenameProductBody.parse(req.body);
    res.json(await useCases.renameProduct.execute({ id: req.params.id, name }));
  });

  return router;
}
