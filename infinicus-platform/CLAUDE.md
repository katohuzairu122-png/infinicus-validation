# CLAUDE.md — INFINICUS Platform Monorepo

## Repository layout

```
infinicus-platform/
├── apps/
│   ├── web/           @infinicus/web    — public web application
│   ├── admin/         @infinicus/admin  — admin dashboard
│   └── api/           @infinicus/api    — API server / layer orchestrator
├── layers/                              — one package per platform layer
│   ├── data-acquisition/               DAL  ─┐
│   ├── business-operations/            BO    │
│   ├── business-intelligence/          BI    │ handoff chain
│   ├── business-digital-twin/          DT    │ DAL→BO→BI→DT→SIM
│   ├── simulation/                     SIM   │    →ADI→ABA→OM→CL
│   ├── ai-decision-intelligence/       ADI   │
│   ├── approved-business-action/       ABA   │
│   ├── outcome-monitoring/             OM    │
│   └── continuous-learning/            CL   ─┘
├── packages/
│   ├── shared-types/       HandoffEnvelope<T>, LayerResult<T>, LayerId
│   ├── database/           DB client + migrations (Supabase / D1)
│   ├── event-contracts/    Typed cross-layer events
│   ├── handoff-contracts/  Typed boundary schemas (dal-to-bo, bo-to-bi … cl-feedback)
│   ├── authentication/     Supabase session management
│   ├── authorization/      RBAC / ABAC policy enforcement
│   ├── configuration/      Environment-aware config loader
│   ├── observability/      Logging, metrics, Sentry integration
│   └── testing/            Mock factories and layer test harness
├── infrastructure/
│   ├── database/           DB schema, migrations, seed scripts
│   ├── deployment/         Wrangler, Cloudflare Pages, CI/CD configs
│   ├── monitoring/         Alerting rules, dashboards
│   └── backups/            Backup policies and restore scripts
├── docs/                   Architecture docs and ADRs
└── tests/                  Cross-layer integration and E2E tests
```

## Tooling

| Tool | Purpose |
|------|---------|
| **pnpm workspaces** | Dependency management across all packages |
| **Turborepo** | Build pipeline caching (`turbo run build`) |
| **TypeScript 5.4** | All packages — base config in `tsconfig.base.json` |
| **Vitest** | Unit and integration tests |

## Common commands

```bash
# Install all dependencies
pnpm install

# Build everything (respects dependency order)
pnpm build           # or: turbo run build

# Run all tests
pnpm test

# Work on a single layer
cd layers/business-intelligence
pnpm dev

# Add a dependency to one package
pnpm --filter @infinicus/layer-business-intelligence add zod
```

## Layer handoff chain

```
DAL → BO → BI → DT → SIM → ADI → ABA → OM → CL → (feedback loop to DAL)
```

Each layer publishes a typed handoff via its `-24` engine block.
Handoff schemas live in `packages/handoff-contracts/src/`.

## Critical rules

- Never modify simulation formulas, Monte Carlo logic, or input defaults.
- All cross-layer communication must use typed `HandoffEnvelope<T>` from `@infinicus/shared-types`.
- Handoff contracts must be defined in `packages/handoff-contracts` before implementing the boundary.
- Each layer package must pass `tsc --noEmit` before merging.
