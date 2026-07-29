import { withTransaction } from '../../client.js';
import { PermissionNotFoundError } from './errors.js';

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
}

function rowToPermission(row: Record<string, unknown>): Permission {
  return {
    id: row.id as string,
    code: row.code as string,
    resource: row.resource as string,
    action: row.action as string,
    description: row.description as string | null,
  };
}

/** tenancy.permissions and tenancy.role_permissions are global reference data — no tenant_id column, no RLS. */
export class PermissionRepository {
  async listAll(): Promise<Permission[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.permissions ORDER BY code');
      return result.rows.map(rowToPermission);
    });
  }

  async getByCode(code: string): Promise<Permission> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM tenancy.permissions WHERE code = $1', [code]);
      if (result.rows.length === 0) throw new PermissionNotFoundError('Permission', code);
      return rowToPermission(result.rows[0]);
    });
  }

  async listForRole(roleId: string): Promise<Permission[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT p.* FROM tenancy.permissions p
         JOIN tenancy.role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = $1 ORDER BY p.code`,
        [roleId]
      );
      return result.rows.map(rowToPermission);
    });
  }

  async roleHasPermission(roleId: string, permissionCode: string): Promise<boolean> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT 1 FROM tenancy.role_permissions rp
         JOIN tenancy.permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1 AND p.code = $2`,
        [roleId, permissionCode]
      );
      return result.rows.length > 0;
    });
  }
}
