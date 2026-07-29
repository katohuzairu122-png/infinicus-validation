import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ValidationError, InvalidTransitionError } from './errors.js';

export interface AnomalyRule {
  id: string;
  businessId: string;
  ruleCode: string;
  status: string;
  latestVersion: number;
}

export interface AnomalyRuleVersion {
  id: string;
  anomalyRuleId: string;
  versionNumber: number;
  detectionMethod: string;
  defaultSeverity: string;
}

export interface AnomalyDetection {
  id: string;
  anomalyRuleVersionId: string;
  businessId: string;
  severity: string;
  status: string;
  detectedValue: number | null;
  detectedAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  correlationId: string;
}

const VALID_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
const DETECTION_TRANSITIONS: Record<string, string[]> = {
  open: ['acknowledged', 'dismissed'],
  acknowledged: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
};

function rowToRule(row: Record<string, unknown>): AnomalyRule {
  return { id: row.id as string, businessId: row.business_id as string, ruleCode: row.rule_code as string, status: row.status as string, latestVersion: row.latest_version as number };
}

function rowToRuleVersion(row: Record<string, unknown>): AnomalyRuleVersion {
  return { id: row.id as string, anomalyRuleId: row.anomaly_rule_id as string, versionNumber: row.version_number as number, detectionMethod: row.detection_method as string, defaultSeverity: row.default_severity as string };
}

function rowToDetection(row: Record<string, unknown>): AnomalyDetection {
  return {
    id: row.id as string,
    anomalyRuleVersionId: row.anomaly_rule_version_id as string,
    businessId: row.business_id as string,
    severity: row.severity as string,
    status: row.status as string,
    detectedValue: row.detected_value === null ? null : parseFloat(String(row.detected_value)),
    detectedAt: row.detected_at as Date,
    acknowledgedAt: row.acknowledged_at as Date | null,
    resolvedAt: row.resolved_at as Date | null,
    correlationId: row.correlation_id as string,
  };
}

export class AnomalyRepository {
  async createRule(ctx: TenantContext, businessId: string, ruleCode: string, detectionMethod: string, defaultSeverity: string, ruleSpecification: Record<string, unknown> = {}): Promise<{ rule: AnomalyRule; version: AnomalyRuleVersion }> {
    if (!VALID_SEVERITIES.includes(defaultSeverity)) throw new ValidationError('AnomalyRule', [`unknown severity: ${defaultSeverity}`]);
    return withTenantTransaction(ctx, async (client) => {
      const rule = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.anomaly_rules (tenant_id, workspace_id, business_id, rule_code, latest_version)
         VALUES ($1,$2,$3,$4,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, ruleCode]
      );
      const version = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.anomaly_rule_versions
           (anomaly_rule_id, tenant_id, workspace_id, business_id, version_number, detection_method, rule_specification, default_severity)
         VALUES ($1,$2,$3,$4,1,$5,$6,$7)
         RETURNING *`,
        [rule.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, detectionMethod, JSON.stringify(ruleSpecification), defaultSeverity]
      );
      return { rule: rowToRule(rule.rows[0]), version: rowToRuleVersion(version.rows[0]) };
    });
  }

  async findRuleById(ctx: TenantContext, id: string): Promise<AnomalyRule> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.anomaly_rules WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('AnomalyRule', id);
      return rowToRule(result.rows[0]);
    });
  }

  async recordDetection(ctx: TenantContext, anomalyRuleVersionId: string, businessId: string, severity: string, detectedValue: number | null, expectedRange: Record<string, unknown> = {}): Promise<AnomalyDetection> {
    if (!VALID_SEVERITIES.includes(severity)) throw new ValidationError('AnomalyDetection', [`unknown severity: ${severity}`]);
    return withTenantTransaction(ctx, async (client) => {
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.anomaly_detections
           (anomaly_rule_version_id, tenant_id, workspace_id, business_id, severity, detected_value, expected_range, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [anomalyRuleVersionId, ctx.tenantId, ctx.workspaceId, businessId, severity, detectedValue, JSON.stringify(expectedRange), correlationId]
      );
      await client.query(
        `INSERT INTO business_intelligence.anomaly_status_history (anomaly_detection_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,NULL,'open',$5)`,
        [result.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, correlationId]
      );
      return rowToDetection(result.rows[0]);
    });
  }

  async findDetectionById(ctx: TenantContext, id: string): Promise<AnomalyDetection> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.anomaly_detections WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('AnomalyDetection', id);
      return rowToDetection(result.rows[0]);
    });
  }

  async acknowledge(ctx: TenantContext, id: string, actorId: string): Promise<AnomalyDetection> {
    return this.transition(ctx, id, 'acknowledged', actorId, undefined);
  }

  async resolve(ctx: TenantContext, id: string, actorId: string, resolutionNotes: string): Promise<AnomalyDetection> {
    return this.transition(ctx, id, 'resolved', actorId, resolutionNotes);
  }

  async dismiss(ctx: TenantContext, id: string, actorId: string, reason: string): Promise<AnomalyDetection> {
    return this.transition(ctx, id, 'dismissed', actorId, reason);
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, actorId: string, notes: string | undefined): Promise<AnomalyDetection> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.anomaly_detections WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('AnomalyDetection', id);
      const fromStatus = current.rows[0].status as string;
      if (!DETECTION_TRANSITIONS[fromStatus]?.includes(toStatus)) throw new InvalidTransitionError('AnomalyDetection', fromStatus, toStatus);
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_intelligence.anomaly_detections
         SET status = $2,
             acknowledged_at = CASE WHEN $2 = 'acknowledged' THEN now() ELSE acknowledged_at END,
             acknowledged_by = CASE WHEN $2 = 'acknowledged' THEN $3::uuid ELSE acknowledged_by END,
             resolved_at = CASE WHEN $2 = 'resolved' THEN now() ELSE resolved_at END,
             resolution_notes = COALESCE($4, resolution_notes)
         WHERE id = $1
         RETURNING *`,
        [id, toStatus, actorId, notes ?? null]
      );
      await client.query(
        `INSERT INTO business_intelligence.anomaly_status_history (anomaly_detection_id, tenant_id, workspace_id, business_id, from_status, to_status, actor_id, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, actorId, notes ?? null, result.rows[0].correlation_id]
      );
      return rowToDetection(result.rows[0]);
    });
  }

  async recordEvidence(ctx: TenantContext, anomalyDetectionId: string, businessId: string, evidenceType: string, evidenceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_intelligence.anomaly_evidence (anomaly_detection_id, tenant_id, workspace_id, business_id, evidence_type, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [anomalyDetectionId, ctx.tenantId, ctx.workspaceId, businessId, evidenceType, JSON.stringify(evidenceReference)]
      );
    });
  }
}
