import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ServiceAccountNotFoundError } from './errors.js';

export interface ServiceAccount {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

function rowToServiceAccount(row: Record<string, unknown>): ServiceAccount {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: row.description as string | null,
    status: row.status as string,
    lastUsedAt: row.last_used_at as Date | null,
    createdAt: row.created_at as Date,
  };
}

export class ServiceAccountRepository {
  async create(ctx: TenantContext, name: string, description: string | null = null): Promise<ServiceAccount> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO identity.service_accounts (tenant_id, workspace_id, name, description, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, name, description, ctx.userId]
      );
      return rowToServiceAccount(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ServiceAccount> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM identity.service_accounts WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ServiceAccountNotFoundError('ServiceAccount', id);
      return rowToServiceAccount(result.rows[0]);
    });
  }

  async suspend(ctx: TenantContext, id: string): Promise<ServiceAccount> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE identity.service_accounts SET status = 'suspended' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new ServiceAccountNotFoundError('ServiceAccount', id);
      return rowToServiceAccount(result.rows[0]);
    });
  }

  async reactivate(ctx: TenantContext, id: string): Promise<ServiceAccount> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE identity.service_accounts SET status = 'active' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new ServiceAccountNotFoundError('ServiceAccount', id);
      return rowToServiceAccount(result.rows[0]);
    });
  }

  async disable(ctx: TenantContext, id: string): Promise<ServiceAccount> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE identity.service_accounts SET status = 'disabled' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new ServiceAccountNotFoundError('ServiceAccount', id);
      return rowToServiceAccount(result.rows[0]);
    });
  }

  async listForWorkspace(ctx: TenantContext): Promise<ServiceAccount[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM identity.service_accounts WHERE workspace_id = $1 ORDER BY created_at DESC', [ctx.workspaceId]
      );
      return result.rows.map(rowToServiceAccount);
    });
  }
}
