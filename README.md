# clean-arch-node

A learning project for **Clean Architecture + SOLID** in Node.js/TypeScript, rebuilding the ideas of
[Practical.CleanArchitecture](https://github.com/phongnguyend/Practical.CleanArchitecture) (.NET) at a small scale:
one `Product` aggregate, with Express and PostgreSQL.

## Dependency rule

```
presentation ─┐
              ├─► application ─► domain
infrastructure┘
main.ts (composition root) knows everything
```

| Folder | Role | May depend on |
|---|---|---|
| [`src/domain`](src/domain) | Entities, value objects, business rules | Nothing (not even npm libraries or Node built-ins) |
| [`src/application`](src/application) | Use cases + **ports** (interfaces) | `domain` |
| [`src/infrastructure`](src/infrastructure) | **Adapters** implementing ports (Postgres, in-memory, clock…) | `application`, `domain`, npm |
| [`src/presentation`](src/presentation) | HTTP (Express): parse request → call use case → send response | `application`, `domain`, npm |
| [`src/main.ts`](src/main.ts) | Composition root: picks adapters, wires everything | Everything |

The rules are enforced by [dependency-cruiser](.dependency-cruiser.cjs): `npm run arch`.

> ⚠️ dependency-cruiser does not support TypeScript 7 yet. With TS 7 it reports "no violations" because it
> **scans no files at all**. That is why this project pins `typescript@^6`.

## Running it

Requires Node ≥ 22 and Docker (for PostgreSQL).

```bash
npm install
cp .env.example .env
npm run db:up          # PostgreSQL 17 on port 5433
npm run db:migrate
npm start              # http://localhost:3000
```

To run without Docker, set `PERSISTENCE=memory` in `.env`. No other file changes.

```bash
curl -i -X POST localhost:3000/products -H "Content-Type: application/json" -d '{"code":"pd-001","name":"iPhone"}'
curl localhost:3000/products
curl -X PATCH localhost:3000/products/<id> -H "Content-Type: application/json" -d '{"name":"iPhone 17"}'
```

| Request | Result |
|---|---|
| Wrong types / missing fields, malformed JSON | `400` (zod / body parser) |
| Right shape but breaks a business rule (empty name, bad code format) | `422` + domain error code, e.g. `product.invalid_name` |
| Unknown id | `404` |
| Duplicate code | `409` |

## Checks

```bash
npm run verify   # typecheck + architecture rules + all tests
```

The PostgreSQL tests ([PgProductRepository.test.ts](src/infrastructure/persistence/postgres/PgProductRepository.test.ts))
only run when `DATABASE_URL` is set (read from `.env`); otherwise they are **skipped**.

## Concept → file map

| Concept | In this project | In Practical.CleanArchitecture |
|---|---|---|
| Dependency Rule enforced by tests | [.dependency-cruiser.cjs](.dependency-cruiser.cjs) | `ClassifiedAds.ArchTests` |
| Rich entity with invariants | [Product.ts](src/domain/product/Product.ts) | `Product.cs` (anemic, only `get; set;`) |
| Value object | [ProductCode.ts](src/domain/product/ProductCode.ts) | none |
| Ports (DIP, ISP) | [ProductRepository.ts](src/application/ports/ProductRepository.ts), [Clock.ts](src/application/ports/Clock.ts), [IdGenerator.ts](src/application/ports/IdGenerator.ts) | `IRepository<T>`, `IDateTimeProvider` |
| Use case (SRP, single intent) | [CreateProduct.ts](src/application/products/CreateProduct.ts), [RenameProduct.ts](src/application/products/RenameProduct.ts) | `AddUpdateProductCommand` + Handler |
| DTO leaving the use case | [ProductDto.ts](src/application/products/ProductDto.ts) | `ProductModel` (mapped in the controller) |
| Adapters (Ports & Adapters) | [InMemoryProductRepository.ts](src/infrastructure/persistence/in-memory/InMemoryProductRepository.ts), [PgProductRepository.ts](src/infrastructure/persistence/postgres/PgProductRepository.ts) | `Repository.cs` (EF Core) |
| Contract test proving LSP | [ProductRepository.contract.ts](src/infrastructure/persistence/ProductRepository.contract.ts) | none |
| Thin controller | [productRoutes.ts](src/presentation/http/products/productRoutes.ts) | `ProductsController.Post` |
| Error → HTTP mapping | [errorHandler.ts](src/presentation/http/errorHandler.ts) | `GlobalExceptionHandler` |
| Composition root | [main.ts](src/main.ts) | `ClassifiedAds.WebAPI/Program.cs` |
| Migrations | [migrate.ts](src/infrastructure/persistence/postgres/migrate.ts) | `ClassifiedAds.Migrator` |

## Flow of a `POST /products` request

1. [productRoutes.ts](src/presentation/http/products/productRoutes.ts): zod checks the body shape, then calls `createProduct.execute(input)`.
2. [CreateProduct.ts](src/application/products/CreateProduct.ts): gets an `id` from `IdGenerator` and the time from `Clock`, then calls `Product.create(...)`.
3. [Product.ts](src/domain/product/Product.ts): checks invariants and throws `DomainError` if any is broken.
4. The use case checks for a duplicate code through the port, then calls `products.add(product)`.
5. The adapter chosen in [main.ts](src/main.ts) (`PgProductRepository` or `InMemoryProductRepository`) stores a snapshot.
6. The use case returns a `ProductDto`; the route sends `201` + `Location`. Any error on the way ends up in [errorHandler.ts](src/presentation/http/errorHandler.ts).

## Roadmap (one commit per step, read with `git log -p`)

| Step | Content | Concepts | |
|---|---|---|---|
| 0 | Project skeleton + architecture rules | Dependency Rule, fitness functions | ✅ |
| 1 | Domain: `Product`, `ProductCode` | Entity, value object, invariant, SRP | ✅ |
| 2 | Application: ports + use cases + in-memory adapter | DIP, ISP, use case | ✅ |
| 3 | PostgreSQL adapter + shared contract test | LSP, Ports & Adapters | ✅ |
| 4 | HTTP (Express) + composition root | Thin controllers, error mapping, Composition Root | ✅ |
| 5 | Decorators around use cases (`withLogging`, `withRetry`) | OCP | exercise |
| 6 | Domain events + Unit of Work + Outbox + `worker.ts` | Consistency, a second host sharing the core | exercise |

## Exercises

1. **Go through all four layers:** add a `ChangeProductDescription` use case (the domain already has `changeDescription`). Write the use-case test first, then the route.
2. **Break a rule on purpose:** add `import pg from 'pg'` to a file in `src/application`, run `npm run arch` and read the error.
3. **A third adapter:** write a `JsonFileProductRepository` and run it through `describeProductRepositoryContract`. Once it passes, `main.ts` can use it as is.
4. **Step 5 (OCP):** write `withLogging(useCase)` that wraps any object with an `execute` method, and apply it in `main.ts` without touching any use case.
5. **Step 6:** add a `UnitOfWork` port so `products.add` and `outbox.add` run in one transaction, plus a `src/worker.ts` that reads the outbox with `SELECT ... FOR UPDATE SKIP LOCKED`.
