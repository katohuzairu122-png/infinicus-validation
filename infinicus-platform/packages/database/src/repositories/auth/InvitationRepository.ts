import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { InvitationNotFoundError, InvitationStateConflictError } from './errors.js';

export interface Invitation {
  id: string;
  tenantId: string;
  workspaceId: string;
  email: string;
  status: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

function rowToInvitation(row: Record<string, unknown>): Invitation {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    email: row.email as string,
    status: row.status as string,
    expiresAt: row.expires_at as Date,
    acceptedAt: row.accepted_at as Date | null,
    createdAt: row.created_at as Date,
  };
}

export class InvitationRepository {
  async create(ctx: TenantContext, email: string, invitationTokenHash: string, expiresAt: Date): Promise<Invitation> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO tenancy.invitations (tenant_id, workspace_id, email, invitation_token_hash, expires_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, email, invitationTokenHash, expiresAt, ctx.userId]
      );
      return rowToInvitation(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<Invitation> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.invitations WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new InvitationNotFoundError('Invitation', id);
      return rowToInvitation(result.rows[0]);
    });
  }

  /**
   * tenancy.invitations is RLS-scoped to the caller's tenant, so accepting an
   * invitation requires the tenant/workspace to already be known — the raw
   * invitation token is structured as `${tenantId}:${workspaceId}:${secret}`
   * precisely so the caller can parse ctx out of the token before this call.
   */
  async getByTokenHash(ctx: TenantContext, invitationTokenHash: string): Promise<Invitation> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM tenancy.invitations WHERE invitation_token_hash = $1 AND workspace_id = $2',
        [invitationTokenHash, ctx.workspaceId]
      );
      if (result.rows.length === 0) throw new InvitationNotFoundError('Invitation', invitationTokenHash);
      return rowToInvitation(result.rows[0]);
    });
  }

  async accept(ctx: TenantContext, id: string): Promise<Invitation> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.invitations WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new InvitationNotFoundError('Invitation', id);
      if (current.rows[0].status !== 'pending') {
        throw new InvitationStateConflictError('Invitation', `cannot accept invitation in status ${current.rows[0].status as string}`);
      }
      if ((current.rows[0].expires_at as Date) < new Date()) {
        throw new InvitationStateConflictError('Invitation', 'invitation has expired');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE tenancy.invitations SET status = 'accepted', accepted_at = now() WHERE id = $1 RETURNING *`, [id]
      );
      return rowToInvitation(result.rows[0]);
    });
  }

  async revoke(ctx: TenantContext, id: string): Promise<Invitation> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE tenancy.invitations SET status = 'revoked' WHERE id = $1 AND status = 'pending' RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new InvitationNotFoundError('Invitation', id);
      return rowToInvitation(result.rows[0]);
    });
  }

  async listPending(ctx: TenantContext): Promise<Invitation[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM tenancy.invitations WHERE workspace_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
        [ctx.workspaceId]
      );
      return result.rows.map(rowToInvitation);
    });
  }
}
