# BUILD-21 — Governed Application API: Operating Procedure

## Running the server

```bash
cd infinicus-platform/apps/api
DATABASE_URL="postgresql://<app-role>:<password>@<host>:5432/<db>" pnpm build && pnpm start
# or, for local development (typecheck watch only — no dev server/reload script exists yet):
DATABASE_URL="postgresql://<app-role>:<password>@<host>:5432/<db>" pnpm dev
```

Apply migrations `0001`–`0145` before first run (this build adds
`0142`–`0145`, creating the `api` schema — see
`infinicus-platform/packages/database/src/migrate.ts`'s `runMigrations()`).

## Walking through a governed request (curl)

```bash
# 1. Register (starts pending; activation is out of this build's scope — see known-limitations)
curl -X POST localhost:3000/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"Correct-Horse-9!"}'

# 2. Log in — returns a bearer session token
curl -X POST localhost:3000/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"Correct-Horse-9!"}'
# => { "user": {...}, "sessionId": "...", "rawSessionToken": "..." }

# 3. Onboard a new tenant (no Idempotency-Key required — see security-controls-build21.md)
curl -X POST localhost:3000/v1/onboarding \
  -H "authorization: Bearer <rawSessionToken>" -H 'content-type: application/json' \
  -d '{"tenantName":"Acme","tenantSlug":"acme","workspaceName":"Default","workspaceSlug":"default"}'

# 4. List businesses for a tenant/workspace (requires an ACTIVE membership)
curl localhost:3000/v1/businesses \
  -H "authorization: Bearer <rawSessionToken>" \
  -H "x-tenant-id: <tenantId>" -H "x-workspace-id: <workspaceId>"

# 5. Submit an ABA decision (requires aba:write permission + Idempotency-Key)
curl -X POST localhost:3000/v1/businesses/<businessId>/decisions \
  -H "authorization: Bearer <rawSessionToken>" \
  -H "x-tenant-id: <tenantId>" -H "x-workspace-id: <workspaceId>" \
  -H "idempotency-key: <any-unique-string>" -H 'content-type: application/json' \
  -d '{"intakePackageId":"...","reviewCode":"r1","summary":"...","approverUserId":"...","assignmentCode":"a1","decisionCode":"d1","outcome":"approve"}'
```

Every response carries `X-Correlation-Id` (echoing the caller's value if
supplied, otherwise generated) and every non-2xx response body is
`{ "error": { "code", "message", "correlationId" } }`.

## OpenAPI documentation

`GET /documentation` serves an interactive Swagger UI; `GET
/documentation/json` serves the raw generated OpenAPI 3 spec — both
derived directly from the same Zod schemas that validate each route, so
the documentation cannot drift from the actual validation behavior.

## Composing the underlying services directly (non-HTTP callers)

Nothing changed here — `@infinicus/authentication`, `@infinicus/authorization`,
`@infinicus/onboarding`, and `@infinicus/workflow` remain independently
usable exactly as documented in BUILD-18/19/20's own operating
procedures. This build adds an HTTP surface in front of them; it does
not replace direct programmatic use.

## Operational monitoring

Every request produces one structured audit log line (via
`@infinicus/observability`'s `logAuditEntry`) with
`correlationId, tenantId, userId, method, route, statusCode, durationMs`
— a lighter-weight, always-on complement to BUILD-18's
`audit.access_events` table (which only covers a fixed set of security
event types: login/logout/failed_auth/permission_denied/etc.). No new
outbox events were introduced — every state-changing write this API
exposes goes through the domain repository that already owns event
emission for that stage.

## Verifying the server runs and functions correctly

Verified via `apps/api/tests/api.integration.test.ts`, which boots the
real Fastify application (`buildApp()`) and exercises every route
through `app.inject()` against a live PostgreSQL database — this is
full-stack request/response/database execution, not a mock. Because this
build is a backend HTTP API rather than a browser UI, the
"start the dev server and use the feature in a browser" verification
step that applied to BUILD-20 does not apply the same way here; live
database execution through the real application object was treated as
the equivalent bar and was met.
