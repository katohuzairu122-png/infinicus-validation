import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';

export interface ApprovalAttestation {
  id: string;
  decisionVersionId: string;
  attestationCode: string;
  statement: string;
  attestedBy: string | null;
}

export interface ApprovalSignature {
  id: string;
  attestationId: string;
  signatureReference: string;
}

function rowToAttestation(row: Record<string, unknown>): ApprovalAttestation {
  return {
    id: row.id as string,
    decisionVersionId: row.decision_version_id as string,
    attestationCode: row.attestation_code as string,
    statement: row.statement as string,
    attestedBy: row.attested_by as string | null,
  };
}

function rowToSignature(row: Record<string, unknown>): ApprovalSignature {
  return {
    id: row.id as string,
    attestationId: row.attestation_id as string,
    signatureReference: row.signature_reference as string,
  };
}

export class ABAAuditRepository {
  async recordAttestation(ctx: TenantContext, businessId: string, decisionVersionId: string, attestationCode: string, statement: string, attestedBy?: string): Promise<ApprovalAttestation> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.approval_attestations (tenant_id, workspace_id, business_id, decision_version_id, attestation_code, statement, attested_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, decisionVersionId, attestationCode, statement, attestedBy ?? null]
      );
      return rowToAttestation(result.rows[0]);
    });
  }

  /** Records a reference to a signature artifact — never raw signature bytes. */
  async recordSignature(ctx: TenantContext, businessId: string, attestationId: string, signatureReference: string): Promise<ApprovalSignature> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.approval_signatures (tenant_id, workspace_id, business_id, attestation_id, signature_reference)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, attestationId, signatureReference]
      );
      return rowToSignature(result.rows[0]);
    });
  }

  async recordAuditEvent(ctx: TenantContext, businessId: string, eventType: string, detail: Record<string, unknown> = {}, decisionId?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.approval_audit_events (tenant_id, workspace_id, business_id, decision_id, event_type, detail)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [ctx.tenantId, ctx.workspaceId, businessId, decisionId ?? null, eventType, JSON.stringify(detail)]
      );
    });
  }

  async listAttestationsForDecisionVersion(ctx: TenantContext, decisionVersionId: string): Promise<ApprovalAttestation[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM approved_business_action.approval_attestations WHERE decision_version_id = $1 ORDER BY created_at',
        [decisionVersionId]
      );
      return result.rows.map(rowToAttestation);
    });
  }
}
