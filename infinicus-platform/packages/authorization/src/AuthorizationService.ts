import {
  MembershipRepository, RoleRepository, PermissionRepository, InvitationRepository,
  AccessEventRepository,
  type TenantContext, type Membership, type Invitation,
} from '@infinicus/database';
import { PermissionDeniedError, MembershipNotActiveError } from './errors.js';
import { generateInvitationToken, parseInvitationToken, defaultInvitationExpiry } from './invitationTokens.js';

export interface CreatedInvitation {
  invitation: Invitation;
  rawToken: string;
}

export class AuthorizationService {
  constructor(
    private readonly memberships: MembershipRepository = new MembershipRepository(),
    private readonly roles: RoleRepository = new RoleRepository(),
    private readonly permissions: PermissionRepository = new PermissionRepository(),
    private readonly invitations: InvitationRepository = new InvitationRepository(),
    private readonly accessEvents: AccessEventRepository = new AccessEventRepository()
  ) {}

  /** Resolves the caller's active membership's roles and checks whether any of them grant permissionCode. */
  async hasPermission(ctx: TenantContext, permissionCode: string): Promise<boolean> {
    const membership = await this.memberships.getByUserAndWorkspace(ctx, ctx.userId);
    if (membership.status !== 'active') return false;

    const roleIds = await this.memberships.listRoleIds(ctx, membership.id);
    for (const roleId of roleIds) {
      if (await this.permissions.roleHasPermission(roleId, permissionCode)) return true;
    }
    return false;
  }

  /** Fail-closed: throws PermissionDeniedError (and records a permission_denied audit event) rather than returning a boolean the caller might ignore. */
  async authorize(ctx: TenantContext, permissionCode: string): Promise<void> {
    const membership = await this.memberships.getByUserAndWorkspace(ctx, ctx.userId).catch(() => null);
    if (!membership || membership.status !== 'active') {
      await this.accessEvents.record(ctx.tenantId, ctx.userId, 'permission_denied', null, null, { permissionCode, reason: 'no_active_membership' });
      throw membership ? new MembershipNotActiveError(membership.status) : new PermissionDeniedError(permissionCode);
    }

    const roleIds = await this.memberships.listRoleIds(ctx, membership.id);
    for (const roleId of roleIds) {
      if (await this.permissions.roleHasPermission(roleId, permissionCode)) return;
    }

    await this.accessEvents.record(ctx.tenantId, ctx.userId, 'permission_denied', null, null, { permissionCode, membershipId: membership.id });
    throw new PermissionDeniedError(permissionCode);
  }

  async assignRole(ctx: TenantContext, membershipId: string, roleCode: string, businessId: string | null = null): Promise<void> {
    const role = await this.roles.getByCode(ctx, roleCode);
    await this.memberships.assignRole(ctx, membershipId, role.id, businessId);
  }

  async revokeRole(ctx: TenantContext, membershipId: string, roleCode: string): Promise<void> {
    const role = await this.roles.getByCode(ctx, roleCode);
    await this.memberships.revokeRole(ctx, membershipId, role.id);
  }

  async createInvitation(ctx: TenantContext, email: string): Promise<CreatedInvitation> {
    const { rawToken, tokenHash } = generateInvitationToken(ctx.tenantId, ctx.workspaceId);
    const invitation = await this.invitations.create(ctx, email, tokenHash, defaultInvitationExpiry());
    return { invitation, rawToken };
  }

  /** Parses tenant/workspace out of the token itself, since tenancy.invitations is RLS-scoped and cannot be looked up blind. */
  async acceptInvitation(rawToken: string, userId: string): Promise<Membership> {
    const { tenantId, workspaceId, tokenHash } = parseInvitationToken(rawToken);
    const ctx: TenantContext = { tenantId, workspaceId, userId };

    const invitation = await this.invitations.getByTokenHash(ctx, tokenHash);
    await this.invitations.accept(ctx, invitation.id);

    const membership = await this.memberships.create(ctx, userId);
    return this.memberships.activate(ctx, membership.id);
  }

  async revokeInvitation(ctx: TenantContext, id: string): Promise<Invitation> {
    return this.invitations.revoke(ctx, id);
  }
}
