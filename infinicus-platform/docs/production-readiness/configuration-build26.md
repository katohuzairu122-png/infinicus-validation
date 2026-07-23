# BUILD-26 — Security, Privacy, and Retention: Configuration

## No new required environment variables

`DATABASE_URL`/`ADMIN_DATABASE_URL` (BUILD-24's inventory) are the only credentials this build's new tooling needs.

## `delete-tenant-data.mjs`

```bash
DATABASE_URL="postgresql://app_test_user:pw@host:5432/db" \
ADMIN_DATABASE_URL="postgresql://admin_role:pw@host:5432/db" \
TENANT_ID="<uuid>" \
DELETED_BY="<actor>" \
  node infrastructure/database/scripts/delete-tenant-data.mjs
```

`DATABASE_URL` must be the RLS-restricted application role — the script refuses to run against a superuser/BYPASSRLS connection (same safety check as `export-tenant.sh`). `ADMIN_DATABASE_URL` is used only for schema introspection (discovering tenant-scoped tables and their FK graph) and the final `tenancy.tenants`/`tenancy.workspaces` rows, which are not themselves tenant-scoped tables.

## `dast-scan.sh`

```bash
BASE_URL="http://localhost:3000" node infrastructure/deployment/scripts/dast-scan.sh
```

No configuration beyond the target `BASE_URL` — every check is self-contained.

## `check-dependency-vulnerabilities.mjs`

No configuration — reads `pnpm audit --json` directly. The allowlist (which advisories are accepted and why) is a constant in the script itself, not externally configurable, so every exception is version-controlled and requires a code review to change.

## `package.json`'s `pnpm.overrides`/`pnpm.auditConfig`

```json
"pnpm": {
  "overrides": { "postcss": ">=8.5.10" },
  "auditConfig": { "ignoreCves": ["CVE-2026-47429", "GHSA-f88m-g3jw-g9cj"] }
}
```

`postcss` is safely override-able to its patched version (a build-time CSS-processing tool, no runtime reachability, and the override doesn't touch vitest's own internal `vite` dependency — see "a real regression caught and reverted" in test-evidence-build26.md for why `vite`/`esbuild` are *not* overridden here). `auditConfig.ignoreCves` only matches CVE-numbered advisories (not GHSA-only ones, like `sharp`'s) — `check-dependency-vulnerabilities.mjs`'s own allowlist is the authoritative, complete mechanism; this config is a secondary, partial convenience for anyone running `pnpm audit` directly.
