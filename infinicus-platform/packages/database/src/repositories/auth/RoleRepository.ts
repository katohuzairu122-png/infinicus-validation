import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { RoleNotFoundError } from './errors.js';

export interface Role {
  id: string;
  tenantId: string | null;
  code: string;
  name: string;
  description: string | null;
  scope: string;
  isSystem: boolean;
  createdAt: Date;
}

function rowToRole(row: Record<string, unknown>): Role {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string | null,
    code: row.code as string,
    name: row.name as string,
    description: row.description as string | null,
    scope: row.scope as string,
    isSystem: row.is_system as boolean,
    createdAt: row.created_at as Date,
  };
}

/**
 * tenancy.roles' RLS policy admits tenant_id IS NULL (system roles, visible
 * platform-wide) OR tenant_id = the caller's tenant — so withTenantTransaction
 * surfaces both system and tenant-scoped roles correctly in one query.
 */
export class RoleRepository {
  async getSystemRoles(ctx: TenantContext): Promise<Role[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM tenancy.roles WHERE tenant_id IS NULL ORDER BY code'
      );
      return result.rows.map(rowToRole);
    });
  }

  /** Resolves a tenant-scoped role by code, falling back to a system role of the same code. */
  async getByCode(ctx: TenantContext, code: string): Promise<Role> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM tenancy.roles WHERE code = $1 AND (tenant_id = $2 OR tenant_id IS NULL) ORDER BY tenant_id NULLS LAST LIMIT 1`,
        [code, ctx.tenantId]
      );
      if (result.rows.length === 0) throw new RoleNotFoundError('Role', code);
      return rowToRole(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<Role> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.roles WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new RoleNotFoundError('Role', id);
      return rowToRole(result.rows[0]);
    });
  }

  async createTenantRole(ctx: TenantContext, code: string, name: string, scope: string, description: string | null = null): Promise<Role> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO tenancy.roles (tenant_id, code, name, description, scope, is_system)
         VALUES ($1,$2,$3,$4,$5,false) RETURNING *`,
        [ctx.tenantId, code, name, description, scope]
      );
      return rowToRole(result.rows[0]);
    });
  }
}
