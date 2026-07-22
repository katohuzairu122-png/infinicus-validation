/**
 * Live PostgreSQL 16 integration tests for AuthorizationService, exercising
 * permission checks against the seeded owner/admin/member/viewer system
 * roles, role assignment, and the invitation lifecycle (BUILD-18).
 *
 * Requires:
 *   DATABASE_URL       — app_test_user (RLS enforced)
 *   ADMIN_DATABASE_URL — infinicus_test_admin (BYPASSRLS), for tenant/workspace fixtures
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import {
  createPool, closePool,
  UserRepository, MembershipRepository, AccessEventRepository,
  InvitationStateConflictError,
  type TenantContext,
} from '@infinicus/database';
import { AuthorizationService } from '../src/AuthorizationService.js';
import { PermissionDeniedError, MembershipNotActiveError, InvitationTokenInvalidError } from '../src/errors.js';

const run = !!process.env.DATABASE_URL;

const T1  = '55555555-6161-0000-0000-000000000001';
const WS1 = '55555555-6161-0000-0000-000000000002';

let adminPool: Pool | null = null;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@authzsvc-test.example`;
}

describe.runIf(run)('AuthorizationService — live PostgreSQL', () => {
  const users = new UserRepository();
  const memberships = new MembershipRepository();
  const accessEvents = new AccessEventRepository();
  const service = new AuthorizationService();

  async function createActiveMember(): Promise<{ ctx: TenantContext; membershipId: string }> {
    const user = await users.createUser({ email: uniqueEmail('member'), passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
    const active = await users.activate(user.id);
    const ctx: TenantContext = { tenantId: T1, workspaceId: WS1, userId: active.id };
    const membership = await memberships.create(ctx, active.id);
    await memberships.activate(ctx, membership.id);
    return { ctx, membershipId: membership.id };
  }

  beforeAll(async () => {
    const appUrl = process.env.DATABASE_URL!;
    const adminUrl = process.env.ADMIN_DATABASE_URL ?? appUrl;
    createPool({ connectionString: appUrl });
    adminPool = new Pool({ connectionString: adminUrl });
    await adminPool.query(
      `INSERT INTO tenancy.tenants (id, name, slug, status, plan_code)
       VALUES ($1,'AuthzSvc-Test Tenant','authzsvc-t1','active','test')
       ON CONFLICT (id) DO NOTHING`,
      [T1]
    );
    await adminPool.query(
      `INSERT INTO tenancy.workspaces (id, tenant_id, name, slug, status)
       VALUES ($1,$2,'AuthzSvc-Test WS','authzsvc-ws1','active')
       ON CONFLICT (id) DO NOTHING`,
      [WS1, T1]
    );
  });

  afterAll(async () => {
    if (adminPool) await adminPool.end();
    await closePool();
  });

  describe('authorize / hasPermission against seeded system roles', () => {
    it('an owner-role member is authorized for every permission, including platform:admin', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'owner');
      await expect(service.authorize(ctx, 'platform:admin')).resolves.toBeUndefined();
      await expect(service.hasPermission(ctx, 'bi:write')).resolves.toBe(true);
    });

    it('a viewer-role member is authorized for read permissions but not write permissions', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'viewer');
      await expect(service.hasPermission(ctx, 'bi:read')).resolves.toBe(true);
      await expect(service.hasPermission(ctx, 'bi:write')).resolves.toBe(false);
    });

    it('a viewer-role member is denied write access via authorize() and a permission_denied access event is recorded', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'viewer');
      await expect(service.authorize(ctx, 'bi:write')).rejects.toBeInstanceOf(PermissionDeniedError);
      const events = await accessEvents.listForUser(ctx.userId, ctx.tenantId);
      expect(events.some((e) => e.eventType === 'permission_denied')).toBe(true);
    });

    it('an admin-role member is denied platform:admin (owner-only permission)', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'admin');
      await expect(service.hasPermission(ctx, 'platform:admin')).resolves.toBe(false);
    });

    it('a member-role member has both read and write on business layers', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'member');
      await expect(service.hasPermission(ctx, 'aba:read')).resolves.toBe(true);
      await expect(service.hasPermission(ctx, 'aba:write')).resolves.toBe(true);
      await expect(service.hasPermission(ctx, 'aba:admin')).resolves.toBe(false);
    });

    it('a member with no role assigned yet is authorized for nothing', async () => {
      const { ctx } = await createActiveMember();
      await expect(service.hasPermission(ctx, 'bi:read')).resolves.toBe(false);
    });

    it('throws PermissionDeniedError (not MembershipNotActiveError) when the caller has no membership at all', async () => {
      const user = await users.createUser({ email: uniqueEmail('nomember'), passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
      const active = await users.activate(user.id);
      const ctx: TenantContext = { tenantId: T1, workspaceId: WS1, userId: active.id };
      await expect(service.authorize(ctx, 'bi:read')).rejects.toBeInstanceOf(PermissionDeniedError);
    });

    it('throws MembershipNotActiveError for a suspended membership', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'owner');
      await memberships.suspend(ctx, membershipId);
      await expect(service.authorize(ctx, 'bi:read')).rejects.toBeInstanceOf(MembershipNotActiveError);
    });
  });

  describe('assignRole / revokeRole', () => {
    it('revokeRole removes a previously granted permission set', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'member');
      await expect(service.hasPermission(ctx, 'bo:read')).resolves.toBe(true);
      await service.revokeRole(ctx, membershipId, 'member');
      await expect(service.hasPermission(ctx, 'bo:read')).resolves.toBe(false);
    });

    it('a member can hold two roles simultaneously with the union of their permissions', async () => {
      const { ctx, membershipId } = await createActiveMember();
      await service.assignRole(ctx, membershipId, 'viewer');
      await service.assignRole(ctx, membershipId, 'admin');
      await expect(service.hasPermission(ctx, 'bi:read')).resolves.toBe(true);
      await expect(service.hasPermission(ctx, 'bi:write')).resolves.toBe(true);
    });
  });

  describe('invitation lifecycle', () => {
    it('creates an invitation, accepts it, and results in an active membership with no roles', async () => {
      const { ctx: inviterCtx } = await createActiveMember();
      const { invitation, rawToken } = await service.createInvitation(inviterCtx, uniqueEmail('invitee'));
      expect(invitation.status).toBe('pending');

      const invitee = await users.createUser({ email: uniqueEmail('invitee-acct'), passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
      const activeInvitee = await users.activate(invitee.id);

      const membership = await service.acceptInvitation(rawToken, activeInvitee.id);
      expect(membership.status).toBe('active');
      expect(membership.userId).toBe(activeInvitee.id);

      const acceptCtx: TenantContext = { tenantId: inviterCtx.tenantId, workspaceId: inviterCtx.workspaceId, userId: activeInvitee.id };
      await expect(service.hasPermission(acceptCtx, 'bi:read')).resolves.toBe(false);
    });

    it('rejects acceptance of an already-accepted invitation', async () => {
      const { ctx: inviterCtx } = await createActiveMember();
      const { rawToken } = await service.createInvitation(inviterCtx, uniqueEmail('invitee2'));
      const invitee = await users.createUser({ email: uniqueEmail('invitee2-acct'), passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
      const activeInvitee = await users.activate(invitee.id);

      await service.acceptInvitation(rawToken, activeInvitee.id);
      const invitee2 = await users.createUser({ email: uniqueEmail('invitee2b-acct'), passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
      const activeInvitee2 = await users.activate(invitee2.id);
      await expect(service.acceptInvitation(rawToken, activeInvitee2.id)).rejects.toBeInstanceOf(InvitationStateConflictError);
    });

    it('rejects acceptance of a revoked invitation', async () => {
      const { ctx: inviterCtx } = await createActiveMember();
      const { invitation, rawToken } = await service.createInvitation(inviterCtx, uniqueEmail('invitee3'));
      await service.revokeInvitation(inviterCtx, invitation.id);

      const invitee = await users.createUser({ email: uniqueEmail('invitee3-acct'), passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
      const activeInvitee = await users.activate(invitee.id);
      await expect(service.acceptInvitation(rawToken, activeInvitee.id)).rejects.toBeInstanceOf(InvitationStateConflictError);
    });

    it('rejects acceptance of a malformed raw token before any database lookup', async () => {
      await expect(service.acceptInvitation('not-a-real-token', 'irrelevant-user-id')).rejects.toBeInstanceOf(InvitationTokenInvalidError);
    });
  });
});

describe.skipIf(run)('AuthorizationService — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
