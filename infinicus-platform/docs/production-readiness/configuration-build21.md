# BUILD-21 — Governed Application API: Configuration

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | `apps/api` (via `loadConfig()`) | RLS-enforced application connection string, same convention as every prior build. `loadConfig()` throws `ConfigurationError` (fail-closed) if unset. |
| `PORT` | `apps/api` | Optional, defaults to `3000`. Must parse as an integer if set — `loadConfig()` throws `ConfigurationError` otherwise. |
| `LOG_LEVEL` | `apps/api` | Optional, defaults to `'info'`. Passed to both Fastify's internal logger and `@infinicus/observability`'s audit logger. |
| `RATE_LIMIT_MAX` | `apps/api` | Optional, defaults to `100`. Max requests per window per `@fastify/rate-limit`'s default key (client IP). |
| `RATE_LIMIT_WINDOW_MS` | `apps/api` | Optional, defaults to `60000` (1 minute). |
| `NODE_ENV` | `apps/api` (`loadConfig()`'s `env` field) | Standard Node environment marker; not currently branched on anywhere in `apps/api` itself. |

No new secret or credential was introduced. `ADMIN_DATABASE_URL` is used
only by this session's own manual fixture-seeding and the live
integration test's admin fixture pool — never by the running
application, never committed.

## `packages/configuration` — rewritten from a stub

Previously `loadConfig()` threw `not yet implemented` unconditionally.
Now a real, fail-closed env-var loader:

```ts
export interface InfinicusConfig {
  env: string;
  databaseUrl: string;
  port: number;
  logLevel: string;
  rateLimitMax: number;
  rateLimitWindowMs: number;
}
export function loadConfig(env = process.env): InfinicusConfig
```

Throws `ConfigurationError` for a missing `DATABASE_URL` or a
non-numeric `PORT`. The stale Supabase-era fields the stub previously
declared (`supabaseUrl`, `supabaseKey`, `sentryDsn`) were deleted as
unused artifacts from an earlier architectural phase — this repository
is pure PostgreSQL end to end, confirmed by inspecting the entire
persistence stack before making the change.

Added `@types/node` as an explicit devDependency (previously only
present transitively/hoisted) since `loadConfig()` now genuinely uses
`NodeJS.ProcessEnv`/`process.env`.

## `packages/observability` — rewritten from an empty placeholder

Previously `export {}`. Now wraps `pino`:

```ts
export function createLogger(options: CreateLoggerOptions): Logger
export function withCorrelationId(logger: MinimalLogger, correlationId: string): MinimalLogger
export function logAuditEntry(logger: MinimalLogger, entry: AuditLogEntry): void
```

`MinimalLogger` is a deliberately narrow structural interface
(`info(obj, msg?)`, `child(bindings)`) rather than `pino.Logger` itself,
so both a raw pino instance and a framework's own request-scoped logger
(e.g. Fastify's `FastifyBaseLogger`, structurally close to but not
type-identical to `pino.Logger`) can be passed in without a cast — see
`security-controls-build21.md` for why this mattered in practice. Added
`pino: ^9.0.0` as a runtime dependency.

## `apps/api` — package configuration

- `main: ./dist/server.js`; `start: node dist/server.js` runs the
  compiled server.
- New runtime dependencies: `fastify: ^5.0.0`, `fastify-plugin: ^5.0.0`,
  `@fastify/rate-limit: ^11.0.0`, `@fastify/swagger: ^9.0.0`,
  `@fastify/swagger-ui: ^6.0.0`, `fastify-type-provider-zod: ^4.0.0`,
  `zod: ^3.23.0` (the package's first genuine use of Zod — previously
  only a declared-but-unused dependency of `packages/database`).
  `fastify-type-provider-zod@4.0.2` was chosen specifically over the
  newer v5+ line (which requires `zod >=3.25.67`) to avoid bumping the
  existing `zod ^3.23.0` constraint elsewhere in the monorepo;
  version-compatibility was verified via `npm view` before pinning.
- New workspace dependencies: `@infinicus/onboarding`, `@infinicus/workflow`
  (previously only `@infinicus/database`/`@infinicus/authentication`/
  `@infinicus/authorization` were declared, unused).
- `@types/node` and `pg`/`@types/pg` added as devDependencies — the
  former because `server.ts` uses `process.env`/`process.exit`, the
  latter because the live integration test opens its own admin `Pool`
  for fixture setup (the running application itself never imports `pg`
  directly; it only ever goes through `@infinicus/database`'s
  `createPool()`).
- `apps/api/tsconfig.json` is unchanged — it still extends the shared
  `tsconfig.base.json`, confirmed appropriate since this is a plain
  Node/Fastify server, not a bundler situation like `apps/web`'s Next.js
  app.

## No new secrets, tunable constants, or admin-configurable policy beyond the above

Rate-limit thresholds and log level are the only new environment-tunable
behavior; both are safe, non-secret operational knobs with sane
defaults.
