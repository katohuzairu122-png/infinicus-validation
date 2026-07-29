import { withTransaction } from '../../client.js';
import { DeploymentEventNotFoundError } from './errors.js';

export type DeploymentEnvironment = 'local' | 'test' | 'staging' | 'production';
export type DeploymentStatus = 'started' | 'succeeded' | 'failed' | 'rolled_back';

export interface DeploymentEvent {
  id: string;
  version: string;
  environment: DeploymentEnvironment;
  gitSha: string;
  status: DeploymentStatus;
  deployedBy: string | null;
  notes: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartDeploymentInput {
  version: string;
  environment: DeploymentEnvironment;
  gitSha: string;
  deployedBy?: string;
  notes?: string;
}

function rowToDeploymentEvent(row: Record<string, unknown>): DeploymentEvent {
  return {
    id: row.id as string,
    version: row.version as string,
    environment: row.environment as DeploymentEnvironment,
    gitSha: row.git_sha as string,
    status: row.status as DeploymentStatus,
    deployedBy: (row.deployed_by as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    startedAt: row.started_at as Date,
    completedAt: (row.completed_at as Date | null) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * platform.deployment_events has no RLS — a deployment is platform
 * infrastructure metadata, not tenant business data (same reasoning as
 * platform.system_settings/feature_flags, see SettingsRepository).
 */
export class DeploymentEventRepository {
  async start(input: StartDeploymentInput): Promise<DeploymentEvent> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO platform.deployment_events (version, environment, git_sha, deployed_by, notes)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [input.version, input.environment, input.gitSha, input.deployedBy ?? null, input.notes ?? null]
      );
      return rowToDeploymentEvent(result.rows[0]);
    });
  }

  private async transition(id: string, status: DeploymentStatus, notes?: string): Promise<DeploymentEvent> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE platform.deployment_events
         SET status = $2, completed_at = now(), notes = COALESCE($3, notes)
         WHERE id = $1
         RETURNING *`,
        [id, status, notes ?? null]
      );
      if (result.rows.length === 0) throw new DeploymentEventNotFoundError('DeploymentEvent', id);
      return rowToDeploymentEvent(result.rows[0]);
    });
  }

  async markSucceeded(id: string, notes?: string): Promise<DeploymentEvent> {
    return this.transition(id, 'succeeded', notes);
  }

  async markFailed(id: string, notes?: string): Promise<DeploymentEvent> {
    return this.transition(id, 'failed', notes);
  }

  async markRolledBack(id: string, notes?: string): Promise<DeploymentEvent> {
    return this.transition(id, 'rolled_back', notes);
  }

  async getById(id: string): Promise<DeploymentEvent> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM platform.deployment_events WHERE id = $1', [id]
      );
      if (result.rows.length === 0) throw new DeploymentEventNotFoundError('DeploymentEvent', id);
      return rowToDeploymentEvent(result.rows[0]);
    });
  }

  async listForEnvironment(environment: DeploymentEnvironment, limit = 50): Promise<DeploymentEvent[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM platform.deployment_events
         WHERE environment = $1
         ORDER BY started_at DESC
         LIMIT $2`,
        [environment, limit]
      );
      return result.rows.map(rowToDeploymentEvent);
    });
  }
}
