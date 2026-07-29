import { withTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';

export interface EmailVerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class EmailVerificationTokenNotFoundError extends NotFoundError {}

function rowToToken(row: Record<string, unknown>): EmailVerificationToken {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tokenHash: row.token_hash as string,
    expiresAt: row.expires_at as Date,
    usedAt: row.used_at as Date | null,
    createdAt: row.created_at as Date,
  };
}

/**
 * identity.email_verification_tokens has no tenant_id and no RLS, same as
 * identity.sessions — only the token's hash is ever persisted, the caller
 * generates and hashes the raw token itself (see packages/authentication's
 * tokens.ts, already used identically for session tokens).
 */
export class EmailVerificationTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<EmailVerificationToken> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO identity.email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1,$2,$3) RETURNING *`,
        [userId, tokenHash, expiresAt]
      );
      return rowToToken(result.rows[0]);
    });
  }

  async getByTokenHash(tokenHash: string): Promise<EmailVerificationToken> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM identity.email_verification_tokens WHERE token_hash = $1', [tokenHash]
      );
      if (result.rows.length === 0) throw new EmailVerificationTokenNotFoundError('EmailVerificationToken', tokenHash);
      return rowToToken(result.rows[0]);
    });
  }

  /** Marks the token consumed. Callers must have already checked expiry/prior use before calling this — it does not re-check. */
  async markUsed(id: string): Promise<void> {
    return withTransaction(async (client) => {
      await client.query('UPDATE identity.email_verification_tokens SET used_at = now() WHERE id = $1', [id]);
    });
  }
}
