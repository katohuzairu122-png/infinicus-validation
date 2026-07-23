# BUILD-24 — Secrets and Configuration Management: Security Controls

## Fail-closed startup

`loadConfig()` throws `ConfigurationError` (not a warning, not a silent default) for: a missing required secret, a non-numeric optional field, or — new in this build — a production process whose `DATABASE_URL` matches a known local/CI credential pattern. The application process never reaches a listening state in any of these cases.

## No secrets in source

`SECRET_INVENTORY` and `.env.example` document *names* and *shapes*, never real values — `.env.example` uses placeholder credentials (`changeme`). Verified: `git grep` for the actual local disposable test credentials (`local_admin_pw`, `local_app_pw`, `ci_admin_pw`, `ci_app_pw`) across every file this build touched returns zero matches outside test fixtures and this documentation's own description of the *pattern-matching* logic (which contains the literal strings as detection patterns, not as live credentials — the same pattern already established by `grant-app-role.sh`'s own documentation in BUILD-23).

## No secrets in logs

`createLogger()`'s default redaction (`DEFAULT_REDACT_PATHS`) applies to every logger this platform constructs, with no caller opt-in required — live-verified (packages/observability/tests/logger.test.ts) that `config.databaseUrl`, `config.adminDatabaseUrl`, and `req.headers.authorization` are replaced with `[REDACTED]` regardless of their actual value, while unrelated fields (`route`, `statusCode`) pass through unchanged.

## No secrets in errors

`redactSecretValues(text, provider)` scrubs a configured secret's literal runtime value out of arbitrary text — live-verified (packages/configuration/tests/secrets.test.ts) against a value embedded mid-string, appearing multiple times, and the no-secret-present case (text passed through unchanged).

## No secrets in browser bundles

`check-no-browser-secrets.mjs` statically scans `apps/web`/`apps/admin` source for any `NEXT_PUBLIC_`-prefixed reference to a secret-classified variable — live-verified against a deliberately-violating fixture (caught) and the real, clean `apps/web`/`apps/admin` source (passed). Wired into CI so a future regression fails the build, not merely a code-review catch.

## Least privilege (reused from BUILD-22/23, not duplicated)

`grant-app-role.sh` grants the application role exactly `SELECT, INSERT, UPDATE, DELETE` + `EXECUTE` per schema, excluding `public` (vestigial, off-limits — see its own header comment). `rotate-db-credential.sh` requires `ADMIN_DATABASE_URL` (an elevated role) to execute `ALTER ROLE`; the application's own `DATABASE_URL` role has no privilege to alter its own or any other role's password.

## Rotation and expiration enforced, not just documented

`rotate-db-credential.sh`'s `VALID UNTIL` is enforced by Postgres itself at authentication time — live-verified (see test-evidence-build24.md): a role rotated with an already-past `VALID UNTIL` genuinely refuses a subsequent login attempt (`FATAL: password authentication failed`), not merely a documented policy nobody checks. `secret-rotation-audit.cjs check-expiration` gives a scriptable, exit-code-driven signal for this ahead of actual expiry.

## Tenant isolation

Not applicable to this build's scope — `platform.secret_rotation_events` is deliberately platform-scoped (no `tenant_id`/RLS), matching `platform.deployment_events`/`system_settings`/`feature_flags`. No tenant-facing code paths were touched.
