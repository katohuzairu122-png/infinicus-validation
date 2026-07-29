import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { MonitoringIncidentNotFoundError } from './errors.js';

export interface MonitoringIncident {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  monitoringAlertId: string;
  status: string;
}

const VALID_STATUSES = ['investigating', 'resolved', 'closed'];

function rowToIncident(row: Record<string, unknown>): MonitoringIncident {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    monitoringAlertId: row.monitoring_alert_id as string,
    status: row.status as string,
  };
}

export class MonitoringIncidentRepository {
  async openIncident(ctx: TenantContext, businessId: string, monitoringAlertId: string): Promise<MonitoringIncident> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.monitoring_incidents (tenant_id, workspace_id, business_id, monitoring_alert_id)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, monitoringAlertId]
      );
      return rowToIncident(result.rows[0]);
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string): Promise<MonitoringIncident> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new MonitoringIncidentNotFoundError('MonitoringIncident', id);
    }
    return withTenantTransaction(ctx, async (client) => {
      const extra = toStatus === 'closed' ? ', closed_at = now()' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.monitoring_incidents SET status = $2${extra} WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new MonitoringIncidentNotFoundError('MonitoringIncident', id);
      return rowToIncident(result.rows[0]);
    });
  }

  async markInvestigating(ctx: TenantContext, id: string): Promise<MonitoringIncident> {
    return this.transition(ctx, id, 'investigating');
  }

  async resolve(ctx: TenantContext, id: string): Promise<MonitoringIncident> {
    return this.transition(ctx, id, 'resolved');
  }

  async close(ctx: TenantContext, id: string): Promise<MonitoringIncident> {
    return this.transition(ctx, id, 'closed');
  }

  async getById(ctx: TenantContext, id: string): Promise<MonitoringIncident> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.monitoring_incidents WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new MonitoringIncidentNotFoundError('MonitoringIncident', id);
      return rowToIncident(result.rows[0]);
    });
  }

  async getByAlert(ctx: TenantContext, monitoringAlertId: string): Promise<MonitoringIncident> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.monitoring_incidents WHERE monitoring_alert_id = $1', [monitoringAlertId]);
      if (result.rows.length === 0) throw new MonitoringIncidentNotFoundError('MonitoringIncident', monitoringAlertId);
      return rowToIncident(result.rows[0]);
    });
  }
}
