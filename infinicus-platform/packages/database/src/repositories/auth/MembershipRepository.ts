import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { MembershipNotFoundError, MembershipAlreadyExistsError } from './errors.js';

export interface Membership {
  id: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  status: string;
  joinedAt: Date | null;
  createdAt: Date;
}

const VALID_STATUSES = ['invited', 'active', 'suspended', 'removed'];

function rowToMembership(row: Record<string, unknown>): Membership {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    userId: row.user_id as string,
    status: row.status as string,
    joinedAt: row.joined_at as Date | null,
    createdAt: row.created_at as Date,
  };
}

export class MembershipRepository {
  async create(ctx: TenantContext, userId: string): Promise<Membership> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT id FROM tenancy.memberships WHERE user_id = $1 AND workspace_id = $2', [userId, ctx.workspaceId]
      );
      if (existing.rows.length > 0) {
        throw new MembershipAlreadyExistsError('Membership', `user ${userId} already a member of workspace ${ctx.workspaceId}`);
      }
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO tenancy.memberships (tenant_id, workspace_id, user_id, created_by)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, userId, ctx.userId]
      );
      return rowToMembership(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<Membership> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.memberships WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new MembershipNotFoundError('Membership', id);
      return rowToMembership(result.rows[0]);
    });
  }

  async getByUserAndWorkspace(ctx: TenantContext, userId: string): Promise<Membership> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM tenancy.memberships WHERE user_id = $1 AND workspace_id = $2', [userId, ctx.workspaceId]
      );
      if (result.rows.length === 0) throw new MembershipNotFoundError('Membership', userId);
      return rowToMembership(result.rows[0]);
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string): Promise<Membership> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new MembershipNotFoundError('Membership', id);
    }
    return withTenantTransaction(ctx, async (client) => {
      const extra = toStatus === 'active' ? ', joined_at = COALESCE(joined_at, now())' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE tenancy.memberships SET status = $2${extra} WHERE id = $1 RETURNING *`, [id, toStatus]
      );
      if (result.rows.length === 0) throw new MembershipNotFoundError('Membership', id);
      return rowToMembership(result.rows[0]);
    });
  }

  async activate(ctx: TenantContext, id: string): Promise<Membership> {
    return this.transition(ctx, id, 'active');
  }

  async suspend(ctx: TenantContext, id: string): Promise<Membership> {
    return this.transition(ctx, id, 'suspended');
  }

  async remove(ctx: TenantContext, id: string): Promise<Membership> {
    return this.transition(ctx, id, 'removed');
  }

  async assignRole(ctx: TenantContext, membershipId: string, roleId: string, businessId: string | null = null): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO tenancy.membership_roles (membership_id, role_id, business_id, assigned_by)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (membership_id, role_id) DO NOTHING`,
        [membershipId, roleId, businessId, ctx.userId]
      );
    });
  }

  async revokeRole(ctx: TenantContext, membershipId: string, roleId: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        'DELETE FROM tenancy.membership_roles WHERE membership_id = $1 AND role_id = $2', [membershipId, roleId]
      );
    });
  }

  async listRoleIds(ctx: TenantContext, membershipId: string): Promise<string[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT role_id FROM tenancy.membership_roles WHERE membership_id = $1', [membershipId]
      );
      return result.rows.map((r) => r.role_id as string);
    });
  }
}
