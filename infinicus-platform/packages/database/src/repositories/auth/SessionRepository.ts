import { withTransaction } from '../../client.js';
import { SessionNotFoundError } from './errors.js';

export interface Session {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    ipAddress: row.ip_address as string | null,
    userAgent: row.user_agent as string | null,
    expiresAt: row.expires_at as Date,
    revokedAt: row.revoked_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * identity.sessions has no tenant_id column and no RLS — a session
 * identifies a user, not a tenant. Tenant/workspace context is established
 * per-request afterward via a separate membership lookup.
 */
export class SessionRepository {
  async createSession(userId: string, sessionTokenHash: string, expiresAt: Date, ipAddress?: string, userAgent?: string): Promise<Session> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO identity.sessions (user_id, session_token_hash, ip_address, user_agent, expires_at)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [userId, sessionTokenHash, ipAddress ?? null, userAgent ?? null, expiresAt]
      );
      return rowToSession(result.rows[0]);
    });
  }

  async getByTokenHash(sessionTokenHash: string): Promise<Session> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM identity.sessions WHERE session_token_hash = $1', [sessionTokenHash]
      );
      if (result.rows.length === 0) throw new SessionNotFoundError('Session', sessionTokenHash);
      return rowToSession(result.rows[0]);
    });
  }

  async getById(id: string): Promise<Session> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM identity.sessions WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new SessionNotFoundError('Session', id);
      return rowToSession(result.rows[0]);
    });
  }

  async revoke(id: string): Promise<Session> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE identity.sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new SessionNotFoundError('Session', id);
      return rowToSession(result.rows[0]);
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    return withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE identity.sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]
      );
      return result.rowCount ?? 0;
    });
  }

  async listActiveForUser(userId: string): Promise<Session[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM identity.sessions WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows.map(rowToSession);
    });
  }
}
