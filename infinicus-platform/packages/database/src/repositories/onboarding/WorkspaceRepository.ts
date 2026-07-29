import { withTransaction, type TenantContext } from '../../client.js';
import { WorkspaceNotFoundError, WorkspaceSlugConflictError } from './errors.js';

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  createdBy: string;
}

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505'
    && 'constraint' in err && (err as { constraint: unknown }).constraint === constraint;
}

/**
 * workspaces_isolation only checks tenant_id = current_setting('app.tenant_id')
 * — unlike tenants_isolation it does not require the new row's own id to be
 * pre-declared, so create() only needs the tenant's id, not a full TenantContext.
 */
export class WorkspaceRepository {
  async create(tenantId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', input.createdBy]);
      try {
        const result = await client.query<Record<string, unknown>>(
          `INSERT INTO tenancy.workspaces (tenant_id, name, slug, created_by)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [tenantId, input.name, input.slug, input.createdBy]
        );
        return rowToWorkspace(result.rows[0]);
      } catch (err) {
        if (isUniqueViolation(err, 'workspaces_tenant_slug_unique')) {
          throw new WorkspaceSlugConflictError('Workspace', `slug already taken in this tenant: ${input.slug}`);
        }
        throw err;
      }
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<Workspace> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', ctx.tenantId]);
      const result = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.workspaces WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new WorkspaceNotFoundError('Workspace', id);
      return rowToWorkspace(result.rows[0]);
    });
  }

  async listForTenant(tenantId: string): Promise<Workspace[]> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM tenancy.workspaces WHERE tenant_id = $1 ORDER BY created_at', [tenantId]
      );
      return result.rows.map(rowToWorkspace);
    });
  }
}
