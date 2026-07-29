import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ConflictError, ValidationError } from './errors.js';

export interface IntakePackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  boPublicationPackageId: string;
  intakeCode: string;
  domain: string;
  status: string;
  rejectionReason: string | null;
  schemaVersion: string;
  idempotencyKey: string;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntakePackageInput {
  businessId: string;
  boPublicationPackageId: string;
  intakeCode: string;
  domain: string;
  schemaVersion?: string;
  idempotencyKey: string;
  correlationId?: string;
  createdBy?: string;
}

export interface AnalyticalDataset {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  datasetCode: string;
  domain: string;
  name: string;
  status: string;
  latestVersion: number;
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  versionNumber: number;
  effectiveStart: Date;
  effectiveEnd: Date | null;
  qualityScore: number | null;
  completenessScore: number | null;
  publicationStatus: string;
  intakePackageId: string | null;
}

function rowToIntakePackage(row: Record<string, unknown>): IntakePackage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    boPublicationPackageId: row.bo_publication_package_id as string,
    intakeCode: row.intake_code as string,
    domain: row.domain as string,
    status: row.status as string,
    rejectionReason: row.rejection_reason as string | null,
    schemaVersion: row.schema_version as string,
    idempotencyKey: row.idempotency_key as string,
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function rowToDataset(row: Record<string, unknown>): AnalyticalDataset {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    datasetCode: row.dataset_code as string,
    domain: row.domain as string,
    name: row.name as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToDatasetVersion(row: Record<string, unknown>): DatasetVersion {
  return {
    id: row.id as string,
    datasetId: row.dataset_id as string,
    versionNumber: row.version_number as number,
    effectiveStart: row.effective_start as Date,
    effectiveEnd: row.effective_end as Date | null,
    qualityScore: row.quality_score === null ? null : parseFloat(String(row.quality_score)),
    completenessScore: row.completeness_score === null ? null : parseFloat(String(row.completeness_score)),
    publicationStatus: row.publication_status as string,
    intakePackageId: row.intake_package_id as string | null,
  };
}

const VALID_INTAKE_STATUSES = ['received', 'validating', 'validated', 'rejected', 'processed', 'superseded'];

export class IntelligenceIntakeRepository {
  /** Idempotent: replays the existing package when the (business, boPublicationPackageId) pair already exists. */
  async intake(ctx: TenantContext, input: CreateIntakePackageInput): Promise<{ package: IntakePackage; idempotentReplay: boolean }> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_intelligence.intelligence_intake_packages
         WHERE business_id = $1 AND (bo_publication_package_id = $2 OR idempotency_key = $3)`,
        [input.businessId, input.boPublicationPackageId, input.idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return { package: rowToIntakePackage(existing.rows[0]), idempotentReplay: true };
      }
      const correlationId = input.correlationId ?? randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.intelligence_intake_packages
           (tenant_id, workspace_id, business_id, bo_publication_package_id, intake_code, domain,
            schema_version, idempotency_key, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId, input.businessId, input.boPublicationPackageId,
          input.intakeCode, input.domain, input.schemaVersion ?? '1.0', input.idempotencyKey,
          correlationId, input.createdBy ?? null,
        ]
      );
      await client.query(
        `INSERT INTO business_intelligence.intelligence_processing_status_history
           (intake_package_id, tenant_id, workspace_id, business_id, from_status, to_status, correlation_id)
         VALUES ($1,$2,$3,$4,NULL,'received',$5)`,
        [result.rows[0].id, ctx.tenantId, ctx.workspaceId, input.businessId, correlationId]
      );
      return { package: rowToIntakePackage(result.rows[0]), idempotentReplay: false };
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<IntakePackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_intelligence.intelligence_intake_packages WHERE id = $1', [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('IntakePackage', id);
      return rowToIntakePackage(result.rows[0]);
    });
  }

  async transitionStatus(ctx: TenantContext, id: string, toStatus: string, reason?: string): Promise<IntakePackage> {
    if (!VALID_INTAKE_STATUSES.includes(toStatus)) {
      throw new ValidationError('IntakePackage', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_intelligence.intelligence_intake_packages WHERE id = $1', [id]
      );
      if (current.rows.length === 0) throw new NotFoundError('IntakePackage', id);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_intelligence.intelligence_intake_packages
         SET status = $2, rejection_reason = $3
         WHERE id = $1
         RETURNING *`,
        [id, toStatus, toStatus === 'rejected' ? (reason ?? null) : null]
      );
      await client.query(
        `INSERT INTO business_intelligence.intelligence_processing_status_history
           (intake_package_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null, result.rows[0].correlation_id]
      );
      return rowToIntakePackage(result.rows[0]);
    });
  }

  async recordSourceReference(ctx: TenantContext, intakePackageId: string, businessId: string, sourceSystem: string, sourceReference: Record<string, unknown>, boHandoffRecordId?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_intelligence.intelligence_source_references
           (intake_package_id, tenant_id, workspace_id, business_id, source_system, source_reference, bo_handoff_record_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [intakePackageId, ctx.tenantId, ctx.workspaceId, businessId, sourceSystem, JSON.stringify(sourceReference), boHandoffRecordId ?? null]
      );
    });
  }

  async createDataset(ctx: TenantContext, businessId: string, datasetCode: string, domain: string, name: string): Promise<AnalyticalDataset> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query('SELECT id FROM business_intelligence.analytical_datasets WHERE business_id = $1 AND dataset_code = $2', [businessId, datasetCode]);
      if (existing.rows.length > 0) throw new ConflictError('AnalyticalDataset', `dataset_code already exists: ${datasetCode}`);
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.analytical_datasets (tenant_id, workspace_id, business_id, dataset_code, domain, name)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, datasetCode, domain, name]
      );
      return rowToDataset(result.rows[0]);
    });
  }

  async publishDatasetVersion(
    ctx: TenantContext,
    datasetId: string,
    businessId: string,
    effectiveStart: Date,
    opts: { qualityScore?: number; completenessScore?: number; intakePackageId?: string } = {}
  ): Promise<DatasetVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const ds = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.analytical_datasets WHERE id = $1', [datasetId]);
      if (ds.rows.length === 0) throw new NotFoundError('AnalyticalDataset', datasetId);
      const nextVersion = (ds.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.analytical_dataset_versions
           (dataset_id, tenant_id, workspace_id, business_id, version_number, effective_start,
            quality_score, completeness_score, publication_status, intake_package_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'published',$9)
         RETURNING *`,
        [datasetId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, effectiveStart,
         opts.qualityScore ?? null, opts.completenessScore ?? null, opts.intakePackageId ?? null]
      );
      await client.query('UPDATE business_intelligence.analytical_datasets SET latest_version = $2, status = \'active\' WHERE id = $1', [datasetId, nextVersion]);
      return rowToDatasetVersion(result.rows[0]);
    });
  }

  async findDatasetVersion(ctx: TenantContext, id: string): Promise<DatasetVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.analytical_dataset_versions WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('DatasetVersion', id);
      return rowToDatasetVersion(result.rows[0]);
    });
  }
}
