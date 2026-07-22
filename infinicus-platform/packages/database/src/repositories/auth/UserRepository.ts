import { withTransaction } from '../../client.js';
import { UserNotFoundError, UserAlreadyExistsError } from './errors.js';

export interface User {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

const VALID_STATUSES = ['pending', 'active', 'suspended', 'disabled', 'deleted'];

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    emailVerifiedAt: row.email_verified_at as Date | null,
    status: row.status as string,
    lastLoginAt: row.last_login_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    deletedAt: row.deleted_at as Date | null,
  };
}

/**
 * identity.users is a global registry (no tenant_id, no RLS) — every
 * operation here uses the plain withTransaction, never withTenantTransaction.
 */
export class UserRepository {
  async createUser(input: CreateUserInput): Promise<User> {
    return withTransaction(async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT id FROM identity.users WHERE email = $1', [input.email]
      );
      if (existing.rows.length > 0) {
        throw new UserAlreadyExistsError('User', `email already registered: ${input.email}`);
      }
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO identity.users (email, password_hash, status)
         VALUES ($1,$2,'pending') RETURNING *`,
        [input.email, input.passwordHash]
      );
      await client.query(
        `INSERT INTO identity.user_profiles (user_id) VALUES ($1)`,
        [result.rows[0].id]
      );
      return rowToUser(result.rows[0]);
    });
  }

  async getById(id: string): Promise<User> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM identity.users WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new UserNotFoundError('User', id);
      return rowToUser(result.rows[0]);
    });
  }

  async getByEmail(email: string): Promise<User> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM identity.users WHERE email = $1', [email]);
      if (result.rows.length === 0) throw new UserNotFoundError('User', email);
      return rowToUser(result.rows[0]);
    });
  }

  /** Never exposed alongside the rest of the User record — read explicitly and only for credential verification. */
  async getPasswordHash(id: string): Promise<string | null> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT password_hash FROM identity.users WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new UserNotFoundError('User', id);
      return result.rows[0].password_hash as string | null;
    });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    return withTransaction(async (client) => {
      const result = await client.query('UPDATE identity.users SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
      if (result.rowCount === 0) throw new UserNotFoundError('User', id);
    });
  }

  async markEmailVerified(id: string): Promise<User> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE identity.users SET email_verified_at = now() WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new UserNotFoundError('User', id);
      return rowToUser(result.rows[0]);
    });
  }

  async recordLogin(id: string): Promise<void> {
    return withTransaction(async (client) => {
      await client.query('UPDATE identity.users SET last_login_at = now() WHERE id = $1', [id]);
    });
  }

  private async transition(id: string, toStatus: string): Promise<User> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new UserNotFoundError('User', id);
    }
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE identity.users SET status = $2${toStatus === 'deleted' ? ', deleted_at = now()' : ''} WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new UserNotFoundError('User', id);
      return rowToUser(result.rows[0]);
    });
  }

  async activate(id: string): Promise<User> {
    return this.transition(id, 'active');
  }

  async suspend(id: string): Promise<User> {
    return this.transition(id, 'suspended');
  }

  async disable(id: string): Promise<User> {
    return this.transition(id, 'disabled');
  }

  async softDelete(id: string): Promise<User> {
    return this.transition(id, 'deleted');
  }
}
