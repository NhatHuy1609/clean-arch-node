import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { FixedClock } from '../../../../test-support/FixedClock';
import { SequentialIdGenerator } from '../../../../test-support/SequentialIdGenerator';
import { CreateProduct } from '../../../application/products/CreateProduct';
import { GetProduct } from '../../../application/products/GetProduct';
import { ListProducts } from '../../../application/products/ListProducts';
import { RenameProduct } from '../../../application/products/RenameProduct';
import { InMemoryProductRepository } from '../../../infrastructure/persistence/in-memory/InMemoryProductRepository';
import { createApp } from '../app';

// HTTP tests run through all the real layers, swapping only the database for the in-memory adapter.
// The setup below is a miniature composition root.
function buildApp() {
  const products = new InMemoryProductRepository();
  const clock = new FixedClock('2026-03-01T10:00:00Z');
  const ids = new SequentialIdGenerator('p-');
  return createApp({
    products: {
      createProduct: new CreateProduct(products, ids, clock),
      getProduct: new GetProduct(products),
      listProducts: new ListProducts(products),
      renameProduct: new RenameProduct(products, clock),
    },
  });
}

describe('HTTP /products', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
  });

  it('POST creates a product → 201 with Location', async () => {
    const res = await request(app).post('/products').send({ code: 'pd-001', name: 'iPhone' });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe('/products/p-1');
    expect(res.body).toMatchObject({ id: 'p-1', code: 'PD-001', name: 'iPhone', updatedAt: null });
  });

  it('POST with a wrongly shaped body → 400 invalid_request', async () => {
    const res = await request(app).post('/products').send({ code: 123 });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.code).toBe('invalid_request');
    expect(res.body.issues.map((issue: { path: string }) => issue.path)).toEqual(['code', 'name']);
  });

  it('POST with malformed JSON → 400 invalid_json', async () => {
    const res = await request(app).post('/products').set('Content-Type', 'application/json').send('{"code":');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_json');
  });

  it('POST breaking a domain rule → 422 with the domain error code', async () => {
    const res = await request(app).post('/products').send({ code: 'PD-001', name: '   ' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('product.invalid_name');
  });

  it('POST with a duplicate code → 409', async () => {
    await request(app).post('/products').send({ code: 'PD-001', name: 'iPhone' });

    const res = await request(app).post('/products').send({ code: 'pd-001', name: 'Other' });

    expect(res.status).toBe(409);
  });

  it('GET lists and GET /:id returns one product', async () => {
    await request(app).post('/products').send({ code: 'PD-001', name: 'iPhone' });

    const list = await request(app).get('/products');
    const one = await request(app).get('/products/p-1');

    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(one.status).toBe(200);
    expect(one.body.name).toBe('iPhone');
  });

  it('GET /:id for an unknown id → 404', async () => {
    const res = await request(app).get('/products/missing');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
  });

  it('PATCH /:id renames the product', async () => {
    await request(app).post('/products').send({ code: 'PD-001', name: 'iPhone' });

    const res = await request(app).patch('/products/p-1').send({ name: 'iPhone 17' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('iPhone 17');
    expect((await request(app).get('/products/p-1')).body.name).toBe('iPhone 17');
  });

  it('PATCH /:id for an unknown id → 404', async () => {
    const res = await request(app).patch('/products/missing').send({ name: 'x' });

    expect(res.status).toBe(404);
  });

  it('unknown routes → 404 route_not_found', async () => {
    const res = await request(app).delete('/products/p-1');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('route_not_found');
  });
});
