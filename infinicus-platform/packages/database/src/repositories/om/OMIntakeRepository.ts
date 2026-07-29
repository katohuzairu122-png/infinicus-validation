import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, OMIntakeValidationError } from './errors.js';

export interface OMIntakePackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  abaPublicationPackageId: string;
  intakeCode: string;
  status: string;
  rejectionReason: string | null;
  schemaVersion: string;
  idempotencyKey: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiveOMPackageInput {
  businessId: string;
  abaPublicationPackageId: string;
  intakeCode: string;
  schemaVersion?: string;
  idempotencyKey: string;
  correlationId?: string;
}

const VALID_STATUSES = ['received', 'validated', 'accepted', 'processing', 'completed', 'rejected', 'failed'];

function rowToPackage(row: Record<string, unknown>): OMIntakePackage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    abaPublicationPackageId: row.aba_publication_package_id as string,
    intakeCode: row.intake_code as string,
    status: row.status as string,
    rejectionReason: row.rejection_reason as string | null,
    schemaVersion: row.schema_version as string,
    idempotencyKey: row.idempotency_key as string,
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class OMIntakeRepository {
  /** Idempotent: replays the existing package when the (business, abaPublicationPackageId) pair or idempotencyKey already exists. */
  async receivePackage(ctx: TenantContext, input: ReceiveOMPackageInput): Promise<{ package: OMIntakePackage; idempotentReplay: boolean }> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        `SELECT * FROM outcome_monitoring.om_intake_packages
         WHERE business_id = $1 AND (aba_publication_package_id = $2 OR idempotency_key = $3)`,
        [input.businessId, input.abaPublicationPackageId, input.idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return { package: rowToPackage(existing.rows[0]), idempotentReplay: true };
      }
      const correlationId = input.correlationId ?? randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.om_intake_packages
           (tenant_id, workspace_id, business_id, aba_publication_package_id, intake_code, schema_version, idempotency_key, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, input.businessId, input.abaPublicationPackageId, input.intakeCode,
         input.schemaVersion ?? '1.0', input.idempotencyKey, correlationId]
      );
      await client.query(
        `INSERT INTO outcome_monitoring.om_intake_status_history
           (intake_package_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,NULL,'received',$5)`,
        [result.rows[0].id, ctx.tenantId, ctx.workspaceId, input.businessId, correlationId]
      );
      return { package: rowToPackage(result.rows[0]), idempotentReplay: false };
    });
  }

  async addVersion(ctx: TenantContext, intakePackageId: string, businessId: string, payloadReference: Record<string, unknown>, recordCount: number): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        `SELECT COALESCE(MAX(version_number), 0) AS max_version FROM outcome_monitoring.om_intake_package_versions WHERE intake_package_id = $1`,
        [intakePackageId]
      );
      const nextVersion = (existing.rows[0].max_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.om_intake_package_versions
           (intake_package_id, tenant_id, workspace_id, business_id, version_number, payload_reference, record_count, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,gen_random_uuid()) RETURNING id, version_number`,
        [intakePackageId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(payloadReference), recordCount]
      );
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async addSourceReference(ctx: TenantContext, intakePackageId: string, businessId: string, sourceSystem: string, sourceReference: Record<string, unknown>): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO outcome_monitoring.om_intake_source_references
           (intake_package_id, tenant_id, workspace_id, business_id, source_system, source_reference)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [intakePackageId, ctx.tenantId, ctx.workspaceId, businessId, sourceSystem, JSON.stringify(sourceReference)]
      );
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, reason?: string): Promise<OMIntakePackage> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new OMIntakeValidationError('OMIntakePackage', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>(
        'SELECT * FROM outcome_monitoring.om_intake_packages WHERE id = $1', [id]
      );
      if (current.rows.length === 0) throw new NotFoundError('OMIntakePackage', id);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.om_intake_packages
         SET status = $2, rejection_reason = $3
         WHERE id = $1
         RETURNING *`,
        [id, toStatus, toStatus === 'rejected' ? (reason ?? null) : null]
      );
      await client.query(
        `INSERT INTO outcome_monitoring.om_intake_status_history
           (intake_package_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null, result.rows[0].correlation_id]
      );
      return rowToPackage(result.rows[0]);
    });
  }

  async acceptPackage(ctx: TenantContext, id: string): Promise<OMIntakePackage> {
    return this.transition(ctx, id, 'accepted');
  }

  async rejectPackage(ctx: TenantContext, id: string, reason: string): Promise<OMIntakePackage> {
    return this.transition(ctx, id, 'rejected', reason);
  }

  async markProcessing(ctx: TenantContext, id: string): Promise<OMIntakePackage> {
    return this.transition(ctx, id, 'processing');
  }

  async completePackage(ctx: TenantContext, id: string): Promise<OMIntakePackage> {
    return this.transition(ctx, id, 'completed');
  }

  async failPackage(ctx: TenantContext, id: string, reason: string): Promise<OMIntakePackage> {
    return this.transition(ctx, id, 'failed', reason);
  }

  async getById(ctx: TenantContext, id: string): Promise<OMIntakePackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM outcome_monitoring.om_intake_packages WHERE id = $1', [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('OMIntakePackage', id);
      return rowToPackage(result.rows[0]);
    });
  }

  async getBySourcePackage(ctx: TenantContext, businessId: string, abaPublicationPackageId: string): Promise<OMIntakePackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM outcome_monitoring.om_intake_packages WHERE business_id = $1 AND aba_publication_package_id = $2',
        [businessId, abaPublicationPackageId]
      );
      if (result.rows.length === 0) throw new NotFoundError('OMIntakePackage', abaPublicationPackageId);
      return rowToPackage(result.rows[0]);
    });
  }
}
