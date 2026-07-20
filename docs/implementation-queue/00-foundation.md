# INFINICUS MONOREPO — PHASE 1 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` repository.

Read and obey the root `CLAUDE.md` before making any changes.

## Objective

Create the monorepo foundation only.

Do not import completed layer ZIPs yet.

Do not build frontend pages.

Do not create the production database schema.

Do not add authentication or external integrations.

## Required root files

Create:

```text
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.base.json
.gitignore
.env.example
README.md
CLAUDE.md
```

Preserve the existing root `CLAUDE.md` if it already exists.

## Required directories

Create:

```text
apps/
├── web/
├── admin/
└── api/

layers/
├── data-acquisition/
├── business-operations/
├── business-intelligence/
├── business-digital-twin/
├── simulation/
├── ai-decision-intelligence/
├── approved-business-action/
├── outcome-monitoring/
└── continuous-learning/

packages/
├── shared-types/
├── database/
├── event-contracts/
├── handoff-contracts/
├── authentication/
├── authorization/
├── configuration/
├── observability/
└── testing/

infrastructure/
├── database/
├── deployment/
├── monitoring/
└── backups/

docs/
tests/
scripts/
```

Add `.gitkeep` files only where required to preserve empty directories.

## Root package configuration

Use:

- pnpm workspaces
- Turborepo
- TypeScript
- ESLint
- Prettier
- Vitest

The root `package.json` must:

- be private;
- declare the package manager;
- include scripts for:
  - `build`
  - `dev`
  - `lint`
  - `typecheck`
  - `test`
  - `format`
  - `format:check`
  - `workspace:validate`
- define only root-level development dependencies;
- avoid application-specific dependencies.

## pnpm workspace

The workspace file must include:

```yaml
packages:
  - "apps/*"
  - "layers/*"
  - "layers/*/*"
  - "packages/*"
```

## Turborepo

Configure tasks for:

- build
- dev
- lint
- typecheck
- test

Requirements:

- `build` depends on upstream builds;
- `dev` is persistent and uncached;
- validation tasks do not emit build artifacts;
- test outputs may include coverage folders.

## TypeScript

The base TypeScript configuration must:

- use strict mode;
- target a modern Node.js runtime;
- support ES modules;
- enable declaration generation;
- enable source maps;
- use consistent casing;
- reject unchecked indexed access;
- reject implicit overrides;
- reject unused locals and parameters where practical;
- avoid application-framework assumptions.

## Environment example

Create `.env.example` using placeholders only.

Include categories for:

```text
NODE_ENV
DATABASE_URL
DIRECT_DATABASE_URL
AUTH_SECRET
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_BUCKET
EVENT_BUS_URL
LOG_LEVEL
```

Do not include real credentials.

## Architecture manifest

Create:

```text
docs/architecture-manifest.md
```

It must list the nine platform layers:

1. Data Acquisition
2. Business Operations
3. Business Intelligence
4. Business Digital Twin
5. Simulation
6. AI Decision Intelligence
7. Approved Business Action
8. Outcome Monitoring
9. Continuous Learning

For each layer, include:

- folder path;
- expected block range;
- master integration block;
- current import status;
- downstream responsibility.

Mark every layer as:

```text
foundation-created
block-import-pending
```

## Workspace validation script

Create:

```text
scripts/validate-workspace.mjs
```

The script must:

1. check that every required root file exists;
2. check that every required directory exists;
3. print each missing path;
4. exit with code `1` when anything is missing;
5. print a success summary and exit with code `0` when valid;
6. use only Node.js standard-library modules.

## Placeholder packages and applications

Do not create full applications.

For each folder under `apps/`, `layers/`, and `packages/`, create only the minimum placeholder files needed to make the workspace understandable.

Use:

```text
README.md
```

Add `package.json` only where required for workspace validation.

Do not add implementation code yet.

## Validation

Run:

```bash
pnpm install
pnpm workspace:validate
pnpm format:check
```

Run lint, typecheck, test, and build only if placeholder packages include executable configurations.

Do not claim success unless the commands pass.

## Stop condition

Stop after the monorepo foundation is created and validated.

Do not continue to:

- import layer blocks;
- design database tables;
- create API endpoints;
- build authentication;
- build frontend pages;
- connect external services.

## Completion report

Return exactly:

```text
Created:
- root files
- directories
- placeholder files

Validation:
- command
- result

Not started:
- layer block import
- canonical data model
- database schema
- authentication
- event backbone
- frontend expansion

Next recommended task:
- create the platform inventory and layer import manifest
```
