import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { DecisionEvidenceNotFoundError, ValidationError } from './errors.js';

export interface DecisionEvidence {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  caseId: string;
  evidenceCode: string;
  evidenceType: string;
  latestVersion: number;
}

const EVIDENCE_TYPES = new Set(['simulation_result', 'digital_twin_snapshot', 'business_intelligence_finding', 'external', 'other']);
const LINKED_ENTITY_TYPES = new Set(['alternative', 'recommendation', 'reasoning_step']);

function rowToEvidence(row: Record<string, unknown>): DecisionEvidence {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    caseId: row.case_id as string,
    evidenceCode: row.evidence_code as string,
    evidenceType: row.evidence_type as string,
    latestVersion: row.latest_version as number,
  };
}

export class DecisionEvidenceRepository {
  async recordEvidence(ctx: TenantContext, businessId: string, caseId: string, evidenceCode: string, evidenceType: string): Promise<DecisionEvidence> {
    if (!EVIDENCE_TYPES.has(evidenceType)) {
      throw new ValidationError('DecisionEvidence', [`unknown evidence_type: ${evidenceType}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_evidence (tenant_id, workspace_id, business_id, case_id, evidence_code, evidence_type)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, caseId, evidenceCode, evidenceType]
      );
      return rowToEvidence(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, evidenceId: string, businessId: string, sourceReference: Record<string, unknown>, summary: string, confidence?: number): Promise<{ id: string; versionNumber: number }> {
    if (confidence !== undefined && (confidence < 0 || confidence > 1)) {
      throw new ValidationError('DecisionEvidenceVersion', ['confidence must be between 0 and 1']);
    }
    return withTenantTransaction(ctx, async (client) => {
      const e = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_evidence WHERE id = $1', [evidenceId]);
      if (e.rows.length === 0) throw new DecisionEvidenceNotFoundError('DecisionEvidence', evidenceId);
      const nextVersion = (e.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.decision_evidence_versions
           (evidence_id, tenant_id, workspace_id, business_id, version_number, source_reference, summary, confidence, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,gen_random_uuid()) RETURNING id, version_number`,
        [evidenceId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(sourceReference), summary, confidence ?? null]
      );
      await client.query('UPDATE ai_decision_intelligence.decision_evidence SET latest_version = $2 WHERE id = $1', [evidenceId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addLink(ctx: TenantContext, evidenceVersionId: string, businessId: string, linkedEntityType: string, linkedEntityId: string): Promise<void> {
    if (!LINKED_ENTITY_TYPES.has(linkedEntityType)) {
      throw new ValidationError('DecisionEvidenceLink', [`unknown linked_entity_type: ${linkedEntityType}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_evidence_links (evidence_version_id, tenant_id, workspace_id, business_id, linked_entity_type, linked_entity_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [evidenceVersionId, ctx.tenantId, ctx.workspaceId, businessId, linkedEntityType, linkedEntityId]
      );
    });
  }

  async addQuality(ctx: TenantContext, evidenceVersionId: string, businessId: string, quality: { qualityScore?: number; freshnessSeconds?: number; reliabilityScore?: number }): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.decision_evidence_quality (evidence_version_id, tenant_id, workspace_id, business_id, quality_score, freshness_seconds, reliability_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [evidenceVersionId, ctx.tenantId, ctx.workspaceId, businessId, quality.qualityScore ?? null, quality.freshnessSeconds ?? null, quality.reliabilityScore ?? null]
      );
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DecisionEvidence> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.decision_evidence WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DecisionEvidenceNotFoundError('DecisionEvidence', id);
      return rowToEvidence(result.rows[0]);
    });
  }

  async listByCase(ctx: TenantContext, caseId: string): Promise<DecisionEvidence[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM ai_decision_intelligence.decision_evidence WHERE case_id = $1 ORDER BY created_at', [caseId]
      );
      return result.rows.map(rowToEvidence);
    });
  }
}
