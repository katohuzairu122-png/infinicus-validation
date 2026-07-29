# BUILD-24 — Secrets and Configuration Management: Operating Procedure

## Rotating the application database credential

```bash
ADMIN_DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<db>" \
APP_ROLE="app_test_user" \
DB_HOST="<host>" DB_PORT="5432" DB_NAME="<db>" \
ENVIRONMENT="production" \
  ./infrastructure/deployment/scripts/rotate-db-credential.sh
```

- Generates a random password via `openssl rand` unless `NEW_PASSWORD` is supplied.
- Sets `VALID UNTIL` to `ROTATION_POLICY_DAYS` from now (default 90) — Postgres refuses login past that timestamp, server-side.
- Records the rotation in `platform.secret_rotation_events` via `secret-rotation-audit.cjs record`.
- Prints the new `DATABASE_URL` **once**, to stdout — the operator's responsibility to store it in the actual secret manager immediately. The script itself never persists the plaintext password anywhere.
- After rotation: update the running application's `DATABASE_URL` (or its secret-manager-backed source) and restart/redeploy — the old credential is invalid the instant `ALTER ROLE` commits.

## Checking secret expiration

```bash
DATABASE_URL="<admin-or-app-connection-string>" \
  node infrastructure/deployment/scripts/secret-rotation-audit.cjs check-expiration DATABASE_URL production 14
```

Exit 0: no rotation recorded yet, or the latest rotation's `expires_at` is more than 14 days away.
Exit 1 (with a printed reason): the latest rotation has no recorded expiry, has already expired, or expires within the given warning window. Wire into a scheduled check (out of scope for this build to automate — see known-limitations) or run manually before a deployment.

## Validating configuration before deploying

`loadConfig()` runs automatically on every application startup (`apps/api/src/server.ts`) — a genuinely misconfigured environment (missing `DATABASE_URL`, non-numeric `PORT`, or a production process pointed at a local/test-looking credential) fails the process immediately with a clear `ConfigurationError`, not a confusing downstream failure.

## Checking for browser secret leakage

```bash
node infrastructure/deployment/scripts/check-no-browser-secrets.mjs
```

Runs automatically in CI (`.github/workflows/ci.yml`'s `validate` job, after `Build`). Exit 0: clean. Exit 1: prints every violation (file + reason) to stderr.

## Updating the secret inventory

Whenever a new environment variable is introduced in server-side code:
1. Add it to `packages/configuration/src/secrets.ts`'s `SECRET_INVENTORY`.
2. Add the matching entry to `.env.example`.
3. If it's a secret and might ever be referenced from `apps/web`/`apps/admin`, the browser-secret check picks it up automatically (it reads `SECRET_INVENTORY` at runtime — no separate list to maintain).
