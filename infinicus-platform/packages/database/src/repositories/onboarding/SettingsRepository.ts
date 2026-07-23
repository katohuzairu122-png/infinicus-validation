import { withTransaction } from '../../client.js';

export type SettingsScope = 'platform' | 'tenant' | 'workspace' | 'business';

export interface Setting {
  scope: SettingsScope;
  scopeId: string | null;
  key: string;
  value: unknown;
  updatedAt: Date;
}

function rowToSetting(row: Record<string, unknown>): Setting {
  return {
    scope: row.scope as SettingsScope,
    scopeId: row.scope_id as string | null,
    key: row.key as string,
    value: row.value,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * platform.system_settings has no RLS (it also serves platform-wide,
 * scope_id-less settings) — callers are responsible for only ever
 * requesting a scope/scopeId pair the current session is authorized for.
 */
export class SettingsRepository {
  async setMany(scope: SettingsScope, scopeId: string | null, settings: Record<string, unknown>): Promise<Setting[]> {
    return withTransaction(async (client) => {
      const rows: Setting[] = [];
      for (const [key, value] of Object.entries(settings)) {
        const result = await client.query<Record<string, unknown>>(
          `INSERT INTO platform.system_settings (scope, scope_id, key, value)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (scope, scope_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
           RETURNING *`,
          [scope, scopeId, key, JSON.stringify(value)]
        );
        rows.push(rowToSetting(result.rows[0]));
      }
      return rows;
    });
  }

  async getAll(scope: SettingsScope, scopeId: string | null): Promise<Setting[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        scopeId === null
          ? 'SELECT * FROM platform.system_settings WHERE scope = $1 AND scope_id IS NULL'
          : 'SELECT * FROM platform.system_settings WHERE scope = $1 AND scope_id = $2',
        scopeId === null ? [scope] : [scope, scopeId]
      );
      return result.rows.map(rowToSetting);
    });
  }
}
