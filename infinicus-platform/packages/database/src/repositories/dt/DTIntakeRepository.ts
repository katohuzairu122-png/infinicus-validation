import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, DTIntakeValidationError } from './errors.js';

export interface DTIntakePackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  biPublicationPackageId: string;
  intakeCode: string;
  status: string;
  rejectionReason: string | null;
  schemaVersion: string;
  idempotencyKey: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceivePackageInput {
  businessId: string;
  biPublicationPackageId: string;
  intakeCode: string;
  schemaVersion?: string;
  idempotencyKey: string;
  correlationId?: string;
}

const VALID_STATUSES = ['received', 'validated', 'accepted', 'processing', 'completed', 'rejected', 'failed'];

function rowToPackage(row: Record<string, unknown>): DTIntakePackage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    biPublicationPackageId: row.bi_publication_package_id as string,
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

export class DTIntakeRepository {
  /** Idempotent: replays the existing package when the (business, biPublicationPackageId) pair already exists. */
  async receivePackage(ctx: TenantContext, input: ReceivePackageInput): Promise<{ package: DTIntakePackage; idempotentReplay: boolean }> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_digital_twin.dt_intake_packages
         WHERE business_id = $1 AND (bi_publication_package_id = $2 OR idempotency_key = $3)`,
        [input.businessId, input.biPublicationPackageId, input.idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return { package: rowToPackage(existing.rows[0]), idempotentReplay: true };
      }
      const correlationId = input.correlationId ?? randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.dt_intake_packages
           (tenant_id, workspace_id, business_id, bi_publication_package_id, intake_code, schema_version, idempotency_key, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, input.businessId, input.biPublicationPackageId, input.intakeCode,
         input.schemaVersion ?? '1.0', input.idempotencyKey, correlationId]
      );
      await client.query(
        `INSERT INTO business_digital_twin.dt_intake_processing_status_history
           (intake_package_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,NULL,'received',$5)`,
        [result.rows[0].id, ctx.tenantId, ctx.workspaceId, input.businessId, correlationId]
      );
      return { package: rowToPackage(result.rows[0]), idempotentReplay: false };
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, reason?: string): Promise<DTIntakePackage> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new DTIntakeValidationError('DTIntakePackage', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_digital_twin.dt_intake_packages WHERE id = $1', [id]
      );
      if (current.rows.length === 0) throw new NotFoundError('DTIntakePackage', id);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.dt_intake_packages
         SET status = $2, rejection_reason = $3
         WHERE id = $1
         RETURNING *`,
        [id, toStatus, toStatus === 'rejected' ? (reason ?? null) : null]
      );
      await client.query(
        `INSERT INTO business_digital_twin.dt_intake_processing_status_history
           (intake_package_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null, result.rows[0].correlation_id]
      );
      return rowToPackage(result.rows[0]);
    });
  }

  async acceptPackage(ctx: TenantContext, id: string): Promise<DTIntakePackage> {
    return this.transition(ctx, id, 'accepted');
  }

  async rejectPackage(ctx: TenantContext, id: string, reason: string): Promise<DTIntakePackage> {
    return this.transition(ctx, id, 'rejected', reason);
  }

  async markProcessing(ctx: TenantContext, id: string): Promise<DTIntakePackage> {
    return this.transition(ctx, id, 'processing');
  }

  async completePackage(ctx: TenantContext, id: string): Promise<DTIntakePackage> {
    return this.transition(ctx, id, 'completed');
  }

  async failPackage(ctx: TenantContext, id: string, reason: string): Promise<DTIntakePackage> {
    return this.transition(ctx, id, 'failed', reason);
  }

  async getById(ctx: TenantContext, id: string): Promise<DTIntakePackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_digital_twin.dt_intake_packages WHERE id = $1', [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('DTIntakePackage', id);
      return rowToPackage(result.rows[0]);
    });
  }

  async getBySourcePackage(ctx: TenantContext, businessId: string, biPublicationPackageId: string): Promise<DTIntakePackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_digital_twin.dt_intake_packages WHERE business_id = $1 AND bi_publication_package_id = $2',
        [businessId, biPublicationPackageId]
      );
      if (result.rows.length === 0) throw new NotFoundError('DTIntakePackage', biPublicationPackageId);
      return rowToPackage(result.rows[0]);
    });
  }
}
