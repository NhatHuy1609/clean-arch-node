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
| `src/domain` | Entities, value objects, business rules | Nothing (not even npm libraries) |
| `src/application` | Use cases + **ports** (interfaces) | `domain` |
| `src/infrastructure` | **Adapters** implementing ports (Postgres, in-memory, clock…) | `application`, `domain`, npm |
| `src/presentation` | HTTP (Express): parse request → call use case → send response | `application`, `domain`, npm |
| `src/main.ts` | Composition root: picks adapters, wires everything | Everything |

The rules are enforced by [dependency-cruiser](.dependency-cruiser.cjs). Run `npm run arch` to see them.

> ⚠️ dependency-cruiser does not support TypeScript 7 yet. With TS 7 it reports "no violations" because it
> **scans no files at all**. That is why this project pins `typescript@^6`.

## Roadmap (one commit per step, read with `git log -p`)

| Step | Content | Concepts |
|---|---|---|
| 0 | Project skeleton + architecture rules | Dependency Rule, fitness functions |
| 1 | Domain: `Product`, `ProductCode` | Entity, value object, invariant, SRP |
| 2 | Application: ports + use cases + in-memory adapter | DIP, ISP, use case |
| 3 | PostgreSQL adapter + shared contract test | LSP, Ports & Adapters |
| 4 | HTTP (Express) + composition root | Thin controllers, error mapping, Composition Root |

## Commands

```bash
npm install
npm run verify      # typecheck + architecture rules + tests
```
