import { withTransaction } from '../../client.js';
import { SecretRotationEventNotFoundError } from './errors.js';

export type SecretRotationEnvironment = 'local' | 'test' | 'staging' | 'production';

export interface SecretRotationEvent {
  id: string;
  secretName: string;
  environment: SecretRotationEnvironment;
  rotatedBy: string;
  rotatedAt: Date;
  expiresAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

export interface RecordRotationInput {
  secretName: string;
  environment: SecretRotationEnvironment;
  rotatedBy: string;
  expiresAt?: Date;
  notes?: string;
}

function rowToRotationEvent(row: Record<string, unknown>): SecretRotationEvent {
  return {
    id: row.id as string,
    secretName: row.secret_name as string,
    environment: row.environment as SecretRotationEnvironment,
    rotatedBy: row.rotated_by as string,
    rotatedAt: row.rotated_at as Date,
    expiresAt: (row.expires_at as Date | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as Date,
  };
}

/**
 * platform.secret_rotation_events has no RLS — a secret rotation is
 * platform infrastructure metadata, not tenant business data (same
 * reasoning as DeploymentEventRepository). Append-only: there is no
 * update/transition method, matching the table's append-only design.
 */
export class SecretRotationEventRepository {
  async record(input: RecordRotationInput): Promise<SecretRotationEvent> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO platform.secret_rotation_events (secret_name, environment, rotated_by, expires_at, notes)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [input.secretName, input.environment, input.rotatedBy, input.expiresAt ?? null, input.notes ?? null]
      );
      return rowToRotationEvent(result.rows[0]);
    });
  }

  async getById(id: string): Promise<SecretRotationEvent> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM platform.secret_rotation_events WHERE id = $1', [id]
      );
      if (result.rows.length === 0) throw new SecretRotationEventNotFoundError('SecretRotationEvent', id);
      return rowToRotationEvent(result.rows[0]);
    });
  }

  async listForSecret(secretName: string, environment: SecretRotationEnvironment, limit = 50): Promise<SecretRotationEvent[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM platform.secret_rotation_events
         WHERE secret_name = $1 AND environment = $2
         ORDER BY rotated_at DESC
         LIMIT $3`,
        [secretName, environment, limit]
      );
      return result.rows.map(rowToRotationEvent);
    });
  }

  async latestForSecret(secretName: string, environment: SecretRotationEnvironment): Promise<SecretRotationEvent | null> {
    const rows = await this.listForSecret(secretName, environment, 1);
    return rows[0] ?? null;
  }
}
