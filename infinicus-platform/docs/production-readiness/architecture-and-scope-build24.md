# BUILD-24 — Secrets and Configuration Management: Architecture and Scope

## Purpose

Deliver the platform's secrets-and-configuration-management production-readiness capability: a declarative inventory of every environment variable server-side code reads, classified secret vs non-secret; environment separation enforced at startup (not just documented); a swappable secret-provider abstraction; a rotation/expiration audit trail with a live-tested rotation script; log and error redaction; and a genuinely enforced browser-secret-prevention check.

## In scope (spec §2)

- **Secret inventory** — `packages/configuration/src/secrets.ts`'s `SECRET_INVENTORY`: every environment variable read by `apps/api`/`packages/database`/deployment scripts, verified against actual source (not guessed), each classified `secret`/`non-secret` with an owner and rotation policy.
- **Environment separation** — `loadConfig()`'s existing `env` resolution (`development`/`test`/`staging`/`production`), now paired with a fail-closed production guard: refuses to start if `DATABASE_URL` matches a known local/CI credential pattern while `NODE_ENV=production`.
- **Managed secret store** — `SecretProvider` interface + `EnvSecretProvider` implementation. The only implementation this sandboxed environment can genuinely exercise (see known-limitations); a production deployment swaps in another implementation (Vault, AWS Secrets Manager, Doppler, ...) of the same interface without touching any call site.
- **Least privilege** — reused, not duplicated: `infrastructure/database/scripts/grant-app-role.sh` (BUILD-23) already enforces this; this build documents it rather than re-implementing it.
- **Rotation** — `infrastructure/deployment/scripts/rotate-db-credential.sh`: rotates the app database role's password via `ALTER ROLE ... VALID UNTIL`, records the rotation via `secret-rotation-audit.cjs`. Live-tested end to end (see test-evidence).
- **Expiration** — `platform.secret_rotation_events` (migration `0147`) + `secret-rotation-audit.cjs check-expiration`: flags a secret whose latest rotation is expired, within a warning window, or has no recorded expiry at all.
- **Startup validation** — `validateSecretInventory()`: aggregates every missing required secret into one error (instead of failing on the first), plus the production-credential guard above.
- **Redaction** — two independent, complementary mechanisms: `packages/observability`'s `createLogger()` now redacts known-sensitive JSON paths (`config.databaseUrl`, `req.headers.authorization`, etc.) regardless of value by default; `packages/configuration`'s `redactSecretValues()` scrubs a configured secret's literal runtime value out of free-form text (error messages, stack traces) where there is no fixed path to redact ahead of time.
- **Browser-secret prevention** — `infrastructure/deployment/scripts/check-no-browser-secrets.mjs`: statically scans `apps/web`/`apps/admin` source for (a) any `NEXT_PUBLIC_`-prefixed reference to a secret-classified variable (would ship it to every browser) and (b) any `'use client'` file reading a secret variable directly without that prefix (always `undefined` at runtime — a real bug even though not a leak). Wired into CI.
- **Configuration schema** — `SECRET_INVENTORY` itself, plus `InfinicusConfig`'s existing typed shape in `loadConfig()`.

## Out of scope

- Integrating a real cloud secret manager (Vault, AWS Secrets Manager, Doppler) — no such service is reachable from this sandboxed environment (same class of constraint as BUILD-22/23's container-registry limitation). `SecretProvider` is the seam a real integration attaches to.
- Automatic/scheduled rotation (a cron trigger for `rotate-db-credential.sh`) — this build delivers the rotation mechanism and its audit trail as a manually-invoked, live-verified script, mirroring BUILD-22's PITR-drill treatment (documented and proven, not automated).
- User-facing API key issuance/rotation (`identity.api_key_references`, `ApiKeyRepository`) — already covered by BUILD-18; a distinct concern (tenant-issued credentials) from this build's scope (platform/infrastructure secrets the application itself depends on).
- Any later-build functionality (BUILD-25 observability/metrics, BUILD-26 security/privacy beyond secrets, etc.).

## Architecture

```
packages/configuration/src/
  errors.ts     — ConfigurationError (single source of truth)
  secrets.ts    — SECRET_INVENTORY, SecretProvider, EnvSecretProvider,
                  validateSecretInventory, looksLikeLocalOrTestCredential,
                  redactSecretValues, SECRET_REDACTION_LOG_PATHS
  index.ts      — loadConfig() (production-guard added), re-exports secrets.ts

packages/observability/src/index.ts
  — createLogger() gains default path-based redaction (imports
    SECRET_REDACTION_LOG_PATHS from @infinicus/configuration, an
    existing dependency)

packages/database/src/repositories/secrets/
  — SecretRotationEventRepository (record/getById/listForSecret/latestForSecret)
    against platform.secret_rotation_events (migration 0147)

infrastructure/deployment/scripts/
  rotate-db-credential.sh       — live DB-role password rotation
  secret-rotation-audit.cjs     — CLI: record / check-expiration
  check-no-browser-secrets.mjs  — static browser-leak scan, wired into CI
```

`platform.secret_rotation_events` is platform-scoped (no `tenant_id`/RLS), matching the precedent set by `platform.deployment_events` (BUILD-23), `platform.system_settings`/`feature_flags` (migration `0005`), and `_migrations` itself — none of these are tenant business data.

## Dependency

BUILD-23 (completed).
