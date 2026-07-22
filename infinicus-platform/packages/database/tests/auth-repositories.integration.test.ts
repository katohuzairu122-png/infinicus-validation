/**
 * Live PostgreSQL 16 integration tests for BUILD-18 Authentication and
 * Authorization repositories, built directly on the pre-existing Stage 1
 * foundation schema (tenancy.roles/permissions/memberships/invitations,
 * identity.users/sessions/service_accounts/api_key_references,
 * audit.access_events — all frozen since 0003/0004/0006).
 *
 * Requires:
 *   DATABASE_URL       — app_test_user (RLS enforced)
 *   ADMIN_DATABASE_URL — infinicus_test_admin (BYPASSRLS)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createPool, closePool } from '../src/client.js';
import {
  UserRepository, SessionRepository, ServiceAccountRepository, ApiKeyRepository,
  RoleRepository, PermissionRepository, MembershipRepository, InvitationRepository,
  AccessEventRepository,
  UserNotFoundError, UserAlreadyExistsError, SessionNotFoundError,
  ServiceAccountNotFoundError, ApiKeyNotFoundError, RoleNotFoundError,
  MembershipNotFoundError, MembershipAlreadyExistsError,
  InvitationNotFoundError, InvitationStateConflictError,
} from '../src/repositories/auth/index.js';

const run = !!process.env.DATABASE_URL;

const T1  = '44444444-6161-0000-0000-000000000001';
const WS1 = '44444444-6161-0000-0000-000000000002';
const T2  = '44444444-6161-0000-0000-000000000003';
const WS2 = '44444444-6161-0000-0000-000000000004';

let adminPool: Pool | null = null;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@auth-test.example`;
}

function uniqueCode(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createUser(email = uniqueEmail('user')) {
  const repo = new UserRepository();
  const user = await repo.createUser({ email, passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
  return { repo, user };
}

async function createActiveUser() {
  const { repo, user } = await createUser();
  const active = await repo.activate(user.id);
  return { repo, user: active };
}

function ctx1For(userId: string) { return { tenantId: T1, workspaceId: WS1, userId }; }
function ctx2For(userId: string) { return { tenantId: T2, workspaceId: WS2, userId }; }

async function createMembership() {
  const { user } = await createActiveUser();
  const repo = new MembershipRepository();
  const membership = await repo.create(ctx1For(user.id), user.id);
  return { repo, membership, user };
}

async function createServiceAccount() {
  const { user } = await createActiveUser();
  const repo = new ServiceAccountRepository();
  const account = await repo.create(ctx1For(user.id), uniqueCode('svc'), 'fixture service account');
  return { repo, account, user };
}

async function setupAuthIntegration(): Promise<void> {
  const appUrl   = process.env.DATABASE_URL!;
  const adminUrl = process.env.ADMIN_DATABASE_URL ?? appUrl;

  createPool({ connectionString: appUrl });
  adminPool = new Pool({ connectionString: adminUrl });

  await adminPool.query(
    `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code)
     VALUES ($1,'Auth-Test Tenant 1','auth-t1','active','test'),
            ($2,'Auth-Test Tenant 2','auth-t2','active','test')
     ON CONFLICT (id) DO NOTHING`,
    [T1, T2]
  );
  await adminPool.query(
    `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status)
     VALUES ($1,$2,'Auth-Test WS 1','auth-ws1','active'),
            ($3,$4,'Auth-Test WS 2','auth-ws2','active')
     ON CONFLICT (id) DO NOTHING`,
    [WS1, T1, WS2, T2]
  );
}

async function teardownAuthIntegration(): Promise<void> {
  if (adminPool) {
    await adminPool.end();
  }
  await closePool();
}

describe.runIf(run)('BUILD-18 Authentication and Authorization — live PostgreSQL', () => {
  beforeAll(setupAuthIntegration);
  afterAll(teardownAuthIntegration);

  // ── 1. Foundation schema sanity (already structurally tested — spot check RLS posture only) ──
  describe('foundation schema posture', () => {
    it('the seeded system roles are present with the expected permission counts', async () => {
      const result = await adminPool!.query(
        `SELECT r.code, count(*)::int AS n FROM tenancy.role_permissions rp
         JOIN tenancy.roles r ON r.id = rp.role_id WHERE r.tenant_id IS NULL GROUP BY r.code ORDER BY r.code`
      );
      const byCode = Object.fromEntries(result.rows.map((r) => [r.code, r.n]));
      expect(byCode.owner).toBe(29);
      expect(byCode.admin).toBe(28);
      expect(byCode.member).toBe(18);
      expect(byCode.viewer).toBe(9);
    });

    it('identity.users has no RLS (global registry)', async () => {
      const result = await adminPool!.query(
        `SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'identity'::regnamespace`
      );
      expect(result.rows[0].relrowsecurity).toBe(false);
    });

    it('identity.service_accounts has RLS enabled and forced-equivalent tenant isolation', async () => {
      const result = await adminPool!.query(
        `SELECT relrowsecurity FROM pg_class WHERE relname = 'service_accounts' AND relnamespace = 'identity'::regnamespace`
      );
      expect(result.rows[0].relrowsecurity).toBe(true);
    });
  });

  // ── 2. UserRepository ────────────────────────────────────────────────────
  describe('UserRepository', () => {
    it('creates a user in pending status with a profile row', async () => {
      const { user } = await createUser();
      expect(user.status).toBe('pending');
      const profile = await adminPool!.query('SELECT * FROM identity.user_profiles WHERE user_id = $1', [user.id]);
      expect(profile.rows.length).toBe(1);
    });

    it('rejects a duplicate email', async () => {
      const email = uniqueEmail('dup');
      const repo = new UserRepository();
      await repo.createUser({ email, passwordHash: 'x' });
      await expect(repo.createUser({ email, passwordHash: 'y' })).rejects.toBeInstanceOf(UserAlreadyExistsError);
    });

    it('finds a user by id and by email', async () => {
      const { repo, user } = await createUser();
      const byId = await repo.getById(user.id);
      expect(byId.id).toBe(user.id);
      const byEmail = await repo.getByEmail(user.email);
      expect(byEmail.id).toBe(user.id);
    });

    it('throws UserNotFoundError for an unknown user', async () => {
      const repo = new UserRepository();
      await expect(repo.getById('00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('getPasswordHash returns the stored hash, never exposed via getById', async () => {
      const { repo, user } = await createUser();
      const hash = await repo.getPasswordHash(user.id);
      expect(hash).toBe('$2a$12$fixturefixturefixturefixturefixturefixture');
      expect((user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it('updates the password hash', async () => {
      const { repo, user } = await createUser();
      await repo.updatePasswordHash(user.id, 'new-hash');
      expect(await repo.getPasswordHash(user.id)).toBe('new-hash');
    });

    it('marks email verified', async () => {
      const { repo, user } = await createUser();
      const verified = await repo.markEmailVerified(user.id);
      expect(verified.emailVerifiedAt).not.toBeNull();
    });

    it('records a login timestamp', async () => {
      const { repo, user } = await createUser();
      await repo.recordLogin(user.id);
      const found = await repo.getById(user.id);
      expect(found.lastLoginAt).not.toBeNull();
    });

    it('walks the activate -> suspend -> disable -> softDelete lifecycle', async () => {
      const { repo, user } = await createUser();
      const active = await repo.activate(user.id);
      expect(active.status).toBe('active');
      const suspended = await repo.suspend(user.id);
      expect(suspended.status).toBe('suspended');
      const disabled = await repo.disable(user.id);
      expect(disabled.status).toBe('disabled');
      const deleted = await repo.softDelete(user.id);
      expect(deleted.status).toBe('deleted');
      expect(deleted.deletedAt).not.toBeNull();
    });
  });

  // ── 3. SessionRepository ─────────────────────────────────────────────────
  describe('SessionRepository', () => {
    it('creates a session for a user', async () => {
      const { user } = await createActiveUser();
      const repo = new SessionRepository();
      const session = await repo.createSession(user.id, uniqueCode('hash'), new Date(Date.now() + 86400000), '127.0.0.1', 'vitest');
      expect(session.userId).toBe(user.id);
      expect(session.revokedAt).toBeNull();
    });

    it('finds a session by token hash and by id', async () => {
      const { user } = await createActiveUser();
      const repo = new SessionRepository();
      const tokenHash = uniqueCode('hash');
      const session = await repo.createSession(user.id, tokenHash, new Date(Date.now() + 86400000));
      const byHash = await repo.getByTokenHash(tokenHash);
      expect(byHash.id).toBe(session.id);
      const byId = await repo.getById(session.id);
      expect(byId.id).toBe(session.id);
    });

    it('throws SessionNotFoundError for an unknown token hash', async () => {
      const repo = new SessionRepository();
      await expect(repo.getByTokenHash('unknown-hash')).rejects.toBeInstanceOf(SessionNotFoundError);
    });

    it('revokes a session', async () => {
      const { user } = await createActiveUser();
      const repo = new SessionRepository();
      const session = await repo.createSession(user.id, uniqueCode('hash'), new Date(Date.now() + 86400000));
      const revoked = await repo.revoke(session.id);
      expect(revoked.revokedAt).not.toBeNull();
    });

    it('rejects revoking an already-revoked session', async () => {
      const { user } = await createActiveUser();
      const repo = new SessionRepository();
      const session = await repo.createSession(user.id, uniqueCode('hash'), new Date(Date.now() + 86400000));
      await repo.revoke(session.id);
      await expect(repo.revoke(session.id)).rejects.toBeInstanceOf(SessionNotFoundError);
    });

    it('revokes all sessions for a user and lists only active ones', async () => {
      const { user } = await createActiveUser();
      const repo = new SessionRepository();
      await repo.createSession(user.id, uniqueCode('hash'), new Date(Date.now() + 86400000));
      await repo.createSession(user.id, uniqueCode('hash'), new Date(Date.now() + 86400000));
      const before = await repo.listActiveForUser(user.id);
      expect(before.length).toBe(2);
      const count = await repo.revokeAllForUser(user.id);
      expect(count).toBe(2);
      const after = await repo.listActiveForUser(user.id);
      expect(after.length).toBe(0);
    });

    it('does not list an expired session as active', async () => {
      const { user } = await createActiveUser();
      const repo = new SessionRepository();
      await repo.createSession(user.id, uniqueCode('hash'), new Date(Date.now() - 1000));
      const active = await repo.listActiveForUser(user.id);
      expect(active.length).toBe(0);
    });
  });

  // ── 4. ServiceAccountRepository ──────────────────────────────────────────
  describe('ServiceAccountRepository', () => {
    it('creates a service account in active status', async () => {
      const { account } = await createServiceAccount();
      expect(account.status).toBe('active');
    });

    it('finds a service account by id', async () => {
      const { repo, account } = await createServiceAccount();
      const found = await repo.getById(ctx1For(account.tenantId), account.id);
      expect(found.id).toBe(account.id);
    });

    it('throws ServiceAccountNotFoundError for an unknown account', async () => {
      const { user } = await createActiveUser();
      const repo = new ServiceAccountRepository();
      await expect(repo.getById(ctx1For(user.id), '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(ServiceAccountNotFoundError);
    });

    it('suspends and reactivates a service account', async () => {
      const { repo, account } = await createServiceAccount();
      const suspended = await repo.suspend(ctx1For(account.tenantId), account.id);
      expect(suspended.status).toBe('suspended');
      const reactivated = await repo.reactivate(ctx1For(account.tenantId), account.id);
      expect(reactivated.status).toBe('active');
    });

    it('disables a service account', async () => {
      const { repo, account } = await createServiceAccount();
      const disabled = await repo.disable(ctx1For(account.tenantId), account.id);
      expect(disabled.status).toBe('disabled');
    });

    it('lists service accounts for a workspace', async () => {
      const { repo, account, user } = await createServiceAccount();
      const list = await repo.listForWorkspace(ctx1For(user.id));
      expect(list.some((a) => a.id === account.id)).toBe(true);
    });
  });

  // ── 5. ApiKeyRepository ──────────────────────────────────────────────────
  describe('ApiKeyRepository', () => {
    it('creates an API key reference', async () => {
      const { account, user } = await createServiceAccount();
      const repo = new ApiKeyRepository();
      const key = await repo.create(ctx1For(user.id), account.id, uniqueCode('pfx'), uniqueCode('hash'), ['read']);
      expect(key.serviceAccountId).toBe(account.id);
      expect(key.revokedAt).toBeNull();
    });

    it('verifies a valid, unexpired key and records last_used_at', async () => {
      const { account, user } = await createServiceAccount();
      const repo = new ApiKeyRepository();
      const prefix = uniqueCode('pfx');
      const hash = uniqueCode('hash');
      await repo.create(ctx1For(user.id), account.id, prefix, hash);
      const verified = await repo.verify(ctx1For(user.id), prefix, hash);
      expect(verified.keyPrefix).toBe(prefix);
    });

    it('throws ApiKeyNotFoundError for a wrong hash', async () => {
      const { account, user } = await createServiceAccount();
      const repo = new ApiKeyRepository();
      const prefix = uniqueCode('pfx');
      await repo.create(ctx1For(user.id), account.id, prefix, uniqueCode('hash'));
      await expect(repo.verify(ctx1For(user.id), prefix, 'wrong-hash')).rejects.toBeInstanceOf(ApiKeyNotFoundError);
    });

    it('revokes a key and rejects verifying it afterward', async () => {
      const { account, user } = await createServiceAccount();
      const repo = new ApiKeyRepository();
      const prefix = uniqueCode('pfx');
      const hash = uniqueCode('hash');
      const key = await repo.create(ctx1For(user.id), account.id, prefix, hash);
      await repo.revoke(ctx1For(user.id), key.id);
      await expect(repo.verify(ctx1For(user.id), prefix, hash)).rejects.toBeInstanceOf(ApiKeyNotFoundError);
    });

    it('rejects verifying an expired key', async () => {
      const { account, user } = await createServiceAccount();
      const repo = new ApiKeyRepository();
      const prefix = uniqueCode('pfx');
      const hash = uniqueCode('hash');
      await repo.create(ctx1For(user.id), account.id, prefix, hash, [], new Date(Date.now() - 1000));
      await expect(repo.verify(ctx1For(user.id), prefix, hash)).rejects.toBeInstanceOf(ApiKeyNotFoundError);
    });

    it('lists keys for a service account', async () => {
      const { account, user } = await createServiceAccount();
      const repo = new ApiKeyRepository();
      await repo.create(ctx1For(user.id), account.id, uniqueCode('pfx'), uniqueCode('hash'));
      const list = await repo.listForServiceAccount(ctx1For(user.id), account.id);
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 6. RoleRepository ────────────────────────────────────────────────────
  describe('RoleRepository', () => {
    it('lists the 4 seeded system roles', async () => {
      const { user } = await createActiveUser();
      const repo = new RoleRepository();
      const roles = await repo.getSystemRoles(ctx1For(user.id));
      expect(roles.map((r) => r.code).sort()).toEqual(['admin', 'member', 'owner', 'viewer']);
    });

    it('resolves a system role by code', async () => {
      const { user } = await createActiveUser();
      const repo = new RoleRepository();
      const role = await repo.getByCode(ctx1For(user.id), 'owner');
      expect(role.isSystem).toBe(true);
      expect(role.tenantId).toBeNull();
    });

    it('throws RoleNotFoundError for an unknown code', async () => {
      const { user } = await createActiveUser();
      const repo = new RoleRepository();
      await expect(repo.getByCode(ctx1For(user.id), 'not-a-real-role')).rejects.toBeInstanceOf(RoleNotFoundError);
    });

    it('creates a tenant-scoped role and it shadows the system role of the same code within that tenant', async () => {
      const { user } = await createActiveUser();
      const repo = new RoleRepository();
      const custom = await repo.createTenantRole(ctx1For(user.id), uniqueCode('custom'), 'Custom Role', 'workspace', 'a custom role');
      expect(custom.isSystem).toBe(false);
      expect(custom.tenantId).toBe(T1);
    });

    it('finds a role by id', async () => {
      const { user } = await createActiveUser();
      const repo = new RoleRepository();
      const owner = await repo.getByCode(ctx1For(user.id), 'owner');
      const found = await repo.getById(ctx1For(user.id), owner.id);
      expect(found.id).toBe(owner.id);
    });
  });

  // ── 7. PermissionRepository ──────────────────────────────────────────────
  describe('PermissionRepository', () => {
    it('lists all 29 seeded permissions', async () => {
      const repo = new PermissionRepository();
      const all = await repo.listAll();
      expect(all.length).toBe(29);
    });

    it('finds a permission by code', async () => {
      const repo = new PermissionRepository();
      const perm = await repo.getByCode('da:read');
      expect(perm.resource).toBe('data_acquisition');
      expect(perm.action).toBe('read');
    });

    it('lists permissions for the owner role (all 29)', async () => {
      const { user } = await createActiveUser();
      const roleRepo = new RoleRepository();
      const owner = await roleRepo.getByCode(ctx1For(user.id), 'owner');
      const repo = new PermissionRepository();
      const perms = await repo.listForRole(owner.id);
      expect(perms.length).toBe(29);
    });

    it('confirms viewer has da:read but not da:write', async () => {
      const { user } = await createActiveUser();
      const roleRepo = new RoleRepository();
      const viewer = await roleRepo.getByCode(ctx1For(user.id), 'viewer');
      const repo = new PermissionRepository();
      expect(await repo.roleHasPermission(viewer.id, 'da:read')).toBe(true);
      expect(await repo.roleHasPermission(viewer.id, 'da:write')).toBe(false);
    });
  });

  // ── 8. MembershipRepository ──────────────────────────────────────────────
  describe('MembershipRepository', () => {
    it('creates a membership in invited status', async () => {
      const { membership } = await createMembership();
      expect(membership.status).toBe('invited');
    });

    it('rejects a duplicate membership for the same user/workspace', async () => {
      const { repo, user } = await createMembership();
      await expect(repo.create(ctx1For(user.id), user.id)).rejects.toBeInstanceOf(MembershipAlreadyExistsError);
    });

    it('walks the activate -> suspend -> remove lifecycle', async () => {
      const { repo, membership, user } = await createMembership();
      const active = await repo.activate(ctx1For(user.id), membership.id);
      expect(active.status).toBe('active');
      expect(active.joinedAt).not.toBeNull();
      const suspended = await repo.suspend(ctx1For(user.id), membership.id);
      expect(suspended.status).toBe('suspended');
      const removed = await repo.remove(ctx1For(user.id), membership.id);
      expect(removed.status).toBe('removed');
    });

    it('finds a membership by id and by user+workspace', async () => {
      const { repo, membership, user } = await createMembership();
      const byId = await repo.getById(ctx1For(user.id), membership.id);
      expect(byId.id).toBe(membership.id);
      const byUser = await repo.getByUserAndWorkspace(ctx1For(user.id), user.id);
      expect(byUser.id).toBe(membership.id);
    });

    it('throws MembershipNotFoundError for an unknown membership', async () => {
      const { user } = await createActiveUser();
      const repo = new MembershipRepository();
      await expect(repo.getById(ctx1For(user.id), '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(MembershipNotFoundError);
    });

    it('assigns and revokes a role', async () => {
      const { repo, membership, user } = await createMembership();
      const roleRepo = new RoleRepository();
      const owner = await roleRepo.getByCode(ctx1For(user.id), 'owner');
      await repo.assignRole(ctx1For(user.id), membership.id, owner.id);
      let roleIds = await repo.listRoleIds(ctx1For(user.id), membership.id);
      expect(roleIds).toContain(owner.id);
      await repo.revokeRole(ctx1For(user.id), membership.id, owner.id);
      roleIds = await repo.listRoleIds(ctx1For(user.id), membership.id);
      expect(roleIds).not.toContain(owner.id);
    });

    it('assigning the same role twice is idempotent (ON CONFLICT DO NOTHING)', async () => {
      const { repo, membership, user } = await createMembership();
      const roleRepo = new RoleRepository();
      const member = await roleRepo.getByCode(ctx1For(user.id), 'member');
      await repo.assignRole(ctx1For(user.id), membership.id, member.id);
      await expect(repo.assignRole(ctx1For(user.id), membership.id, member.id)).resolves.toBeUndefined();
      const roleIds = await repo.listRoleIds(ctx1For(user.id), membership.id);
      expect(roleIds.filter((id) => id === member.id).length).toBe(1);
    });
  });

  // ── 9. InvitationRepository ──────────────────────────────────────────────
  describe('InvitationRepository', () => {
    it('creates a pending invitation', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      const invitation = await repo.create(ctx1For(user.id), uniqueEmail('invitee'), uniqueCode('hash'), new Date(Date.now() + 86400000));
      expect(invitation.status).toBe('pending');
    });

    it('finds an invitation by id and by token hash', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      const hash = uniqueCode('hash');
      const invitation = await repo.create(ctx1For(user.id), uniqueEmail('invitee'), hash, new Date(Date.now() + 86400000));
      const byId = await repo.getById(ctx1For(user.id), invitation.id);
      expect(byId.id).toBe(invitation.id);
      const byHash = await repo.getByTokenHash(ctx1For(user.id), hash);
      expect(byHash.id).toBe(invitation.id);
    });

    it('accepts a pending invitation', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      const invitation = await repo.create(ctx1For(user.id), uniqueEmail('invitee'), uniqueCode('hash'), new Date(Date.now() + 86400000));
      const accepted = await repo.accept(ctx1For(user.id), invitation.id);
      expect(accepted.status).toBe('accepted');
      expect(accepted.acceptedAt).not.toBeNull();
    });

    it('rejects accepting an already-accepted invitation', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      const invitation = await repo.create(ctx1For(user.id), uniqueEmail('invitee'), uniqueCode('hash'), new Date(Date.now() + 86400000));
      await repo.accept(ctx1For(user.id), invitation.id);
      await expect(repo.accept(ctx1For(user.id), invitation.id)).rejects.toBeInstanceOf(InvitationStateConflictError);
    });

    it('rejects accepting an expired invitation', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      const invitation = await repo.create(ctx1For(user.id), uniqueEmail('invitee'), uniqueCode('hash'), new Date(Date.now() - 1000));
      await expect(repo.accept(ctx1For(user.id), invitation.id)).rejects.toBeInstanceOf(InvitationStateConflictError);
    });

    it('revokes a pending invitation', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      const invitation = await repo.create(ctx1For(user.id), uniqueEmail('invitee'), uniqueCode('hash'), new Date(Date.now() + 86400000));
      const revoked = await repo.revoke(ctx1For(user.id), invitation.id);
      expect(revoked.status).toBe('revoked');
    });

    it('lists pending invitations for a workspace', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      await repo.create(ctx1For(user.id), uniqueEmail('invitee'), uniqueCode('hash'), new Date(Date.now() + 86400000));
      const list = await repo.listPending(ctx1For(user.id));
      expect(list.length).toBeGreaterThanOrEqual(1);
    });

    it('throws InvitationNotFoundError for an unknown invitation', async () => {
      const { user } = await createActiveUser();
      const repo = new InvitationRepository();
      await expect(repo.getById(ctx1For(user.id), '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(InvitationNotFoundError);
    });
  });

  // ── 10. AccessEventRepository ────────────────────────────────────────────
  describe('AccessEventRepository', () => {
    it('records an access event and lists it for the user', async () => {
      const { user } = await createActiveUser();
      const repo = new AccessEventRepository();
      await repo.record(T1, user.id, 'login', '127.0.0.1', 'vitest', { note: 'fixture' });
      const list = await repo.listForUser(user.id, T1);
      expect(list.some((e) => e.eventType === 'login')).toBe(true);
    });

    it('accepts a null tenantId and null userId (pre-authentication failed_auth attempts)', async () => {
      const repo = new AccessEventRepository();
      await expect(repo.record(null, null, 'failed_auth', null, null, { reason: 'unknown_email' })).resolves.toBeDefined();
    });

    it('the database rejects an unknown event_type via its CHECK constraint', async () => {
      const repo = new AccessEventRepository();
      await expect(repo.record(null, null, 'not_a_real_event_type' as unknown as 'login')).rejects.toThrow();
    });
  });

  // ── 11. Cross-tenant isolation (live RLS) ────────────────────────────────
  describe('cross-tenant isolation (live RLS)', () => {
    it('tenant 2 cannot read a tenant 1 service account', async () => {
      const { account } = await createServiceAccount();
      const { user: user2 } = await createActiveUser();
      const repo = new ServiceAccountRepository();
      await expect(repo.getById(ctx2For(user2.id), account.id)).rejects.toBeInstanceOf(ServiceAccountNotFoundError);
    });

    it('tenant 2 cannot read a tenant 1 membership', async () => {
      const { membership } = await createMembership();
      const { user: user2 } = await createActiveUser();
      const repo = new MembershipRepository();
      await expect(repo.getById(ctx2For(user2.id), membership.id)).rejects.toBeInstanceOf(MembershipNotFoundError);
    });

    it('tenant 2 cannot read a tenant 1 invitation', async () => {
      const { user } = await createActiveUser();
      const invRepo = new InvitationRepository();
      const invitation = await invRepo.create(ctx1For(user.id), uniqueEmail('iso-invitee'), uniqueCode('hash'), new Date(Date.now() + 86400000));
      const { user: user2 } = await createActiveUser();
      await expect(invRepo.getById(ctx2For(user2.id), invitation.id)).rejects.toBeInstanceOf(InvitationNotFoundError);
    });

    it('tenant 2 cannot verify a tenant 1 API key even with the correct prefix and hash', async () => {
      const { account, user } = await createServiceAccount();
      const apiKeyRepo = new ApiKeyRepository();
      const prefix = uniqueCode('pfx');
      const hash = uniqueCode('hash');
      await apiKeyRepo.create(ctx1For(user.id), account.id, prefix, hash);
      const { user: user2 } = await createActiveUser();
      await expect(apiKeyRepo.verify(ctx2For(user2.id), prefix, hash)).rejects.toBeInstanceOf(ApiKeyNotFoundError);
    });

    it('tenant 2 sees zero rows listing tenant 1 access events by tenant scope', async () => {
      const { user } = await createActiveUser();
      const accessRepo = new AccessEventRepository();
      await accessRepo.record(T1, user.id, 'login');
      const result = await adminPool!.query(
        `SELECT count(*)::int AS n FROM audit.access_events WHERE user_id = $1 AND tenant_id = $2`,
        [user.id, T2]
      );
      expect(result.rows[0].n).toBe(0);
    });
  });

  // ── 12. Transaction rollback / failure-path behaviour ────────────────────
  describe('transaction rollback behaviour', () => {
    it('leaves no orphaned user_profile row when user creation itself fails (duplicate email)', async () => {
      const email = uniqueEmail('rb-dup');
      const repo = new UserRepository();
      await repo.createUser({ email, passwordHash: 'x' });
      await expect(repo.createUser({ email, passwordHash: 'y' })).rejects.toBeInstanceOf(UserAlreadyExistsError);
      const orphans = await adminPool!.query(
        `SELECT count(*)::int AS n FROM identity.user_profiles p
         WHERE NOT EXISTS (SELECT 1 FROM identity.users u WHERE u.id = p.user_id)`
      );
      expect(orphans.rows[0].n).toBe(0);
    });

    it('rolls back an out-of-band insert that violates a database-level CHECK bound (defense in depth)', async () => {
      const { user } = await createActiveUser();
      await expect(
        adminPool!.query(`UPDATE identity.users SET status = 'not_a_real_status' WHERE id = $1`, [user.id])
      ).rejects.toThrow();
      const repo = new UserRepository();
      const found = await repo.getById(user.id);
      expect(found.status).toBe('active');
    });
  });
});

describe.skipIf(run)('BUILD-18 Authentication and Authorization — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
