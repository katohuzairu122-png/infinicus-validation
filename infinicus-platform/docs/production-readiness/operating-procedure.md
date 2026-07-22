# BUILD-18 — Authentication and Authorization: Operating Procedure

## Applying the migration

This build adds exactly one migration on top of the frozen `0001`–`0136`
range:

```bash
cd infinicus-platform/packages/database
pnpm build   # compiles src/ to dist/ (migrate.ts reads dist at runtime)
ADMIN_DATABASE_URL="postgresql://<admin-role>:<password>@<host>:5432/<db>" \
  node -e "
    const { createPool, closePool } = require('./dist/client.js');
    const { runMigrations } = require('./dist/migrate.js');
    (async () => {
      createPool({ connectionString: process.env.ADMIN_DATABASE_URL });
      await runMigrations();
      await closePool();
    })().catch(e => { console.error(e); process.exit(1); });
  "
```

`runMigrations()` is idempotent — it reads `_migrations` first and
`skip`s anything already applied. Re-running it is always safe.

## Registering a user (application code path)

```ts
import { AuthenticationService } from '@infinicus/authentication';

const auth = new AuthenticationService();
const user = await auth.register(email, password); // status: 'pending'
// A separate, deliberate activation step is required before login works —
// e.g. email verification completing, or an admin/invitation flow.
await usersRepo.activate(user.id);
```

## Logging in and validating a session

```ts
const { user, session, rawSessionToken } = await auth.login(email, password, {
  ipAddress: req.ip, userAgent: req.headers['user-agent'],
});
// rawSessionToken is returned exactly once — store it in an HTTP-only
// cookie or equivalent; only its hash is persisted server-side.

// On each subsequent request:
const { user, session } = await auth.validateSession(rawSessionToken);
// Throws (never returns null) on any invalid/expired/revoked/inactive case.
```

## Assigning roles and checking permissions

```ts
import { AuthorizationService } from '@infinicus/authorization';

const authz = new AuthorizationService();
await authz.assignRole(ctx, membershipId, 'member'); // or owner/admin/viewer
await authz.authorize(ctx, 'bi:write'); // throws PermissionDeniedError if not granted
```

`ctx` is a `TenantContext` (`{ tenantId, workspaceId, userId }`) — it
must be established (e.g. via subdomain/workspace-slug routing) before
any tenant-scoped repository call, per the RLS architecture shared with
every prior persistence-stage build.

## Inviting a new member

```ts
const { invitation, rawToken } = await authz.createInvitation(ctx, inviteeEmail);
// Send rawToken to the invitee out-of-band (e.g. email link). It encodes
// tenantId:workspaceId:secret and is never persisted — only its hash is.

// On acceptance (after the invitee has an active user account):
const membership = await authz.acceptInvitation(rawToken, inviteeUserId);
// Parses tenant/workspace directly from rawToken, creates + activates
// the membership. No role is assigned automatically — assign one
// separately via authz.assignRole().
```

## Revoking access

```ts
await auth.revokeSession(sessionId);              // single session
await auth.revokeAllUserSessions(userId);          // every session for a user
await authz.revokeRole(ctx, membershipId, 'admin'); // single role grant
await authz.revokeInvitation(ctx, invitationId);    // pending invitation
```

`changePassword` also revokes every existing session for the user as a
defense-in-depth side effect — this is intentional, not a bug, and
callers should expect the user to be logged out everywhere after a
password change.

## Operational monitoring

Every authentication/authorization decision of security interest is
recorded in `audit.access_events` (`login`, `logout`, `failed_auth`,
`permission_denied`, `session_revocation`, plus `sensitive_data_access`
and `api_key_usage` for future use by other layers). Query via
`AccessEventRepository.listForUser(userId, tenantId?)` — pass the known
tenant to see tenant-scoped events alongside tenant-less
(pre-authentication) ones; omit it to see only tenant-less events.
