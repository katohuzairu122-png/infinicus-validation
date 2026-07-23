import { withTransaction } from '../../client.js';
import { AlertEventNotFoundError } from './errors.js';

export type AlertSeverity = 'warning' | 'critical';

export interface AlertEvent {
  id: string;
  alertName: string;
  severity: AlertSeverity;
  message: string;
  metadata: Record<string, unknown>;
  triggeredAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface TriggerAlertInput {
  alertName: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

function rowToAlertEvent(row: Record<string, unknown>): AlertEvent {
  return {
    id: row.id as string,
    alertName: row.alert_name as string,
    severity: row.severity as AlertSeverity,
    message: row.message as string,
    metadata: row.metadata as Record<string, unknown>,
    triggeredAt: row.triggered_at as Date,
    resolvedAt: (row.resolved_at as Date | null) ?? null,
    createdAt: row.created_at as Date,
  };
}

/**
 * observability.alert_events has no RLS — an alert is platform
 * operational metadata, not tenant business data (same reasoning as
 * DeploymentEventRepository/SecretRotationEventRepository).
 */
export class AlertEventRepository {
  async trigger(input: TriggerAlertInput): Promise<AlertEvent> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO observability.alert_events (alert_name, severity, message, metadata)
         VALUES ($1,$2,$3,$4)
         RETURNING *`,
        [input.alertName, input.severity, input.message, JSON.stringify(input.metadata ?? {})]
      );
      return rowToAlertEvent(result.rows[0]);
    });
  }

  async resolve(id: string): Promise<AlertEvent> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE observability.alert_events SET resolved_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) throw new AlertEventNotFoundError('AlertEvent', id);
      return rowToAlertEvent(result.rows[0]);
    });
  }

  async listActive(limit = 50): Promise<AlertEvent[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM observability.alert_events WHERE resolved_at IS NULL ORDER BY triggered_at DESC LIMIT $1`,
        [limit]
      );
      return result.rows.map(rowToAlertEvent);
    });
  }

  async listForAlertName(alertName: string, limit = 50): Promise<AlertEvent[]> {
    return withTransaction(async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM observability.alert_events WHERE alert_name = $1 ORDER BY triggered_at DESC LIMIT $2`,
        [alertName, limit]
      );
      return result.rows.map(rowToAlertEvent);
    });
  }
}
