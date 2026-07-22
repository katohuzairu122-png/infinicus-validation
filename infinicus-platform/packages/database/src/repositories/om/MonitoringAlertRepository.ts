import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { MonitoringAlertNotFoundError } from './errors.js';

export interface MonitoringAlertRule {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  monitoringPlanId: string;
  ruleCode: string;
  status: string;
  latestVersion: number;
}

export interface MonitoringAlert {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  alertRuleVersionId: string;
  observationId: string | null;
  status: string;
}

const VALID_ALERT_STATUSES = ['acknowledged', 'resolved', 'suppressed'];

function rowToRule(row: Record<string, unknown>): MonitoringAlertRule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    monitoringPlanId: row.monitoring_plan_id as string,
    ruleCode: row.rule_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToAlert(row: Record<string, unknown>): MonitoringAlert {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    alertRuleVersionId: row.alert_rule_version_id as string,
    observationId: row.observation_id as string | null,
    status: row.status as string,
  };
}

export class MonitoringAlertRepository {
  async createRule(ctx: TenantContext, businessId: string, monitoringPlanId: string, ruleCode: string, condition: Record<string, unknown>): Promise<{ rule: MonitoringAlertRule; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const ruleRow = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.monitoring_alert_rules (tenant_id, workspace_id, business_id, monitoring_plan_id, rule_code, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, monitoringPlanId, ruleCode]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.monitoring_alert_rule_versions (alert_rule_id, tenant_id, workspace_id, business_id, version_number, condition, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [ruleRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(condition), randomUUID()]
      );
      return { rule: rowToRule(ruleRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async activateRule(ctx: TenantContext, id: string): Promise<MonitoringAlertRule> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.monitoring_alert_rules SET status = 'active' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new MonitoringAlertNotFoundError('MonitoringAlertRule', id);
      return rowToRule(result.rows[0]);
    });
  }

  async raiseAlert(ctx: TenantContext, businessId: string, alertRuleVersionId: string, observationId: string | null = null): Promise<MonitoringAlert> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.monitoring_alerts (tenant_id, workspace_id, business_id, alert_rule_version_id, observation_id)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, alertRuleVersionId, observationId]
      );
      return rowToAlert(result.rows[0]);
    });
  }

  private async transitionAlert(ctx: TenantContext, id: string, toStatus: string): Promise<MonitoringAlert> {
    if (!VALID_ALERT_STATUSES.includes(toStatus)) {
      throw new MonitoringAlertNotFoundError('MonitoringAlert', id);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.monitoring_alerts SET status = $2 WHERE id = $1 RETURNING *`,
        [id, toStatus]
      );
      if (result.rows.length === 0) throw new MonitoringAlertNotFoundError('MonitoringAlert', id);
      return rowToAlert(result.rows[0]);
    });
  }

  async acknowledgeAlert(ctx: TenantContext, id: string): Promise<MonitoringAlert> {
    return this.transitionAlert(ctx, id, 'acknowledged');
  }

  async resolveAlert(ctx: TenantContext, id: string): Promise<MonitoringAlert> {
    return this.transitionAlert(ctx, id, 'resolved');
  }

  async suppressAlert(ctx: TenantContext, id: string): Promise<MonitoringAlert> {
    return this.transitionAlert(ctx, id, 'suppressed');
  }

  async getRuleById(ctx: TenantContext, id: string): Promise<MonitoringAlertRule> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.monitoring_alert_rules WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new MonitoringAlertNotFoundError('MonitoringAlertRule', id);
      return rowToRule(result.rows[0]);
    });
  }

  async getAlertById(ctx: TenantContext, id: string): Promise<MonitoringAlert> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.monitoring_alerts WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new MonitoringAlertNotFoundError('MonitoringAlert', id);
      return rowToAlert(result.rows[0]);
    });
  }
}
