# BUILD-20 — Customer Decision Workflows: Configuration

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | `apps/web` (via `lib/db.ts`) | Same `app_test_user`-equivalent, RLS-enforced connection string as every prior build. Required for `next dev`/`next build`/`next start`; `apps/web` throws a clear error at request time if unset. |

No new secret or credential was introduced. No `ADMIN_DATABASE_URL` is
used by the application at runtime (only by this session's own manual
fixture-seeding scripts during development, never committed).

## Package configuration

- New package: `packages/workflow` (`@infinicus/workflow`), mirroring
  `packages/onboarding`'s `package.json`/`tsconfig.json` shape, including
  the `"require"` export condition fix pattern established in BUILD-18/19.
- `apps/web/package.json` — rewritten from the bare TypeScript placeholder
  to a real Next.js 15 App Router application: added `next`, `react`,
  `react-dom`, `@types/react`, `@types/react-dom` dependencies; added
  `@infinicus/database` and `@infinicus/workflow` workspace dependencies;
  replaced the `tsc`-based `build`/`dev` scripts with `next build`/
  `next dev`/`next start`; added `vitest` for the package's own unit
  tests. The old `src/index.ts` placeholder was removed in favor of the
  `app/` directory Next.js requires.
- `apps/web/tsconfig.json` — replaced with a standard Next.js App Router
  tsconfig (`moduleResolution: bundler`, `jsx: preserve`, the `next`
  plugin) — it does **not** extend the monorepo's shared
  `tsconfig.base.json`, since that config's `module: Node16` setting is
  incompatible with Next.js's own bundler-driven module resolution. This
  is the one place in the monorepo where a package's tsconfig
  intentionally diverges from the shared base, and is standard practice
  for a Next.js app inside a TypeScript monorepo.
- `turbo.json` — added a `@infinicus/web#build` task override with
  `outputs: [".next/**", "!.next/cache/**"]`, since Next.js's build
  output directory (`.next/`) differs from every other package's `dist/`
  (the default `build` task's configured output), which previously
  caused a turbo cache-miss warning.
- `.gitignore` — added `.next/` and `next-env.d.ts` (Next.js's
  auto-regenerated build output and type-reference stub), alongside the
  already-ignored `dist/`/`.turbo/`.

## Tenant context — placeholder pending real authentication

No login/session UI exists yet (see Known Limitations). `apps/web`
resolves a `TenantContext` (`tenantId`, `workspaceId`, `userId`) from
explicit, visible query parameters
(`?tenantId=&workspaceId=&userId=`) rather than a session cookie. Every
internal link in the app carries these forward automatically
(`lib/context.ts`'s `ctxQuery` helper); a business-selection page shown
without them presents a plain form to enter them directly, with a
visible notice explaining why. This is a deliberate, documented
placeholder — not a security control — clearly labeled in the UI itself
so it cannot be mistaken for a real authentication mechanism.

## No new secrets, tunable constants, or admin-configurable policy

This build introduces no new environment-configurable behavior beyond
`DATABASE_URL` — no feature flags, no tunable thresholds, matching its
scope as a view/orchestration layer over already-configured domains.
