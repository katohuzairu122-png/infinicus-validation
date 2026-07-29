import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ApiKeyNotFoundError } from './errors.js';

export interface ApiKeyReference {
  id: string;
  serviceAccountId: string;
  keyPrefix: string;
  scopes: readonly string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

function rowToApiKey(row: Record<string, unknown>): ApiKeyReference {
  return {
    id: row.id as string,
    serviceAccountId: row.service_account_id as string,
    keyPrefix: row.key_prefix as string,
    scopes: row.scopes as string[],
    expiresAt: row.expires_at as Date | null,
    revokedAt: row.revoked_at as Date | null,
    lastUsedAt: row.last_used_at as Date | null,
    createdAt: row.created_at as Date,
  };
}

/**
 * identity.api_key_references is RLS-scoped through its owning service
 * account's tenant (see api_key_references_isolation in
 * 0011_create_rls_policies.sql), so every lookup — including verification —
 * requires an already-known TenantContext. Tenant resolution for an
 * incoming API key request must happen upstream (e.g. from a workspace
 * slug in the request routing), before this repository is called.
 */
export class ApiKeyRepository {
  async create(ctx: TenantContext, serviceAccountId: string, keyPrefix: string, keyHash: string, scopes: readonly string[] = [], expiresAt: Date | null = null): Promise<ApiKeyReference> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO identity.api_key_references (service_account_id, key_prefix, key_hash, scopes, expires_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [serviceAccountId, keyPrefix, keyHash, JSON.stringify(scopes), expiresAt, ctx.userId]
      );
      return rowToApiKey(result.rows[0]);
    });
  }

  async verify(ctx: TenantContext, keyPrefix: string, keyHash: string): Promise<ApiKeyReference> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM identity.api_key_references
         WHERE key_prefix = $1 AND key_hash = $2 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`,
        [keyPrefix, keyHash]
      );
      if (result.rows.length === 0) throw new ApiKeyNotFoundError('ApiKeyReference', keyPrefix);
      await client.query('UPDATE identity.api_key_references SET last_used_at = now() WHERE id = $1', [result.rows[0].id]);
      return rowToApiKey(result.rows[0]);
    });
  }

  async revoke(ctx: TenantContext, id: string): Promise<ApiKeyReference> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE identity.api_key_references SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new ApiKeyNotFoundError('ApiKeyReference', id);
      return rowToApiKey(result.rows[0]);
    });
  }

  async listForServiceAccount(ctx: TenantContext, serviceAccountId: string): Promise<ApiKeyReference[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM identity.api_key_references WHERE service_account_id = $1 ORDER BY created_at DESC', [serviceAccountId]
      );
      return result.rows.map(rowToApiKey);
    });
  }
}
