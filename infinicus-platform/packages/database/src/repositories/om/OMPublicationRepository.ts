import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ValidationError, InvalidTransitionError } from './errors.js';

export interface OMPublicationPackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  feedbackPackageId: string;
  packageCode: string;
  latestVersion: number;
  targetLayer: string;
  targetBlock: string;
  publicationStatus: string;
  idempotencyKey: string;
}

const VALID_TARGET_LAYERS = ['continuous_learning'];

const TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['ready'],
  ready: ['dispatched'],
  dispatched: ['acknowledged', 'rejected', 'revoked'],
  acknowledged: ['revoked'],
};

function rowToPackage(row: Record<string, unknown>): OMPublicationPackage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    feedbackPackageId: row.feedback_package_id as string,
    packageCode: row.package_code as string,
    latestVersion: row.latest_version as number,
    targetLayer: row.target_layer as string,
    targetBlock: row.target_block as string,
    publicationStatus: row.publication_status as string,
    idempotencyKey: row.idempotency_key as string,
  };
}

export class OMPublicationRepository {
  /** Idempotent by (business_id, idempotency_key): duplicate deliveries replay the existing package. */
  async createPackage(
    ctx: TenantContext, businessId: string, feedbackPackageId: string, packageCode: string,
    targetLayer: string, targetBlock: string, idempotencyKey: string
  ): Promise<{ package: OMPublicationPackage; idempotentReplay: boolean }> {
    if (!VALID_TARGET_LAYERS.includes(targetLayer)) {
      throw new ValidationError('OMPublicationPackage', [`invalid target_layer: ${targetLayer}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT * FROM outcome_monitoring.om_publication_packages WHERE business_id = $1 AND idempotency_key = $2',
        [businessId, idempotencyKey]
      );
      if (existing.rows.length > 0) return { package: rowToPackage(existing.rows[0]), idempotentReplay: true };

      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.om_publication_packages
           (tenant_id, workspace_id, business_id, feedback_package_id, package_code, target_layer, target_block, idempotency_key, publication_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, feedbackPackageId, packageCode, targetLayer, targetBlock, idempotencyKey]
      );
      return { package: rowToPackage(result.rows[0]), idempotentReplay: false };
    });
  }

  async createVersion(ctx: TenantContext, publicationPackageId: string, businessId: string, summary: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const pkg = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.om_publication_packages WHERE id = $1', [publicationPackageId]);
      if (pkg.rows.length === 0) throw new NotFoundError('OMPublicationPackage', publicationPackageId);
      const nextVersion = (pkg.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO outcome_monitoring.om_publication_package_versions
           (publication_package_id, tenant_id, workspace_id, business_id, version_number, summary, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [publicationPackageId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, summary]
      );
      await client.query('UPDATE outcome_monitoring.om_publication_packages SET latest_version = $2 WHERE id = $1', [publicationPackageId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, extra: Record<string, unknown> = {}): Promise<OMPublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.om_publication_packages WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('OMPublicationPackage', id);
      const fromStatus = current.rows[0].publication_status as string;
      if (!(TRANSITIONS[fromStatus] ?? []).includes(toStatus)) {
        throw new InvalidTransitionError('OMPublicationPackage', fromStatus, toStatus);
      }
      const setClauses: string[] = ['publication_status = $2'];
      const values: unknown[] = [id, toStatus];
      let i = 3;
      for (const [key, val] of Object.entries(extra)) {
        setClauses.push(`${key} = $${i}`);
        values.push(val);
        i += 1;
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE outcome_monitoring.om_publication_packages SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );
      // Inlined on the shared client — never open a nested withTenantTransaction here.
      await client.query(
        `INSERT INTO outcome_monitoring.om_publication_events (publication_package_id, tenant_id, workspace_id, business_id, event_type, detail)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, toStatus === 'dispatched' ? 'dispatch' : toStatus === 'acknowledged' ? 'acknowledgement' : toStatus === 'rejected' ? 'rejection' : 'revocation', JSON.stringify({ fromStatus, toStatus })]
      );
      return rowToPackage(result.rows[0]);
    });
  }

  async markReady(ctx: TenantContext, id: string): Promise<OMPublicationPackage> {
    return this.transition(ctx, id, 'ready');
  }

  async dispatch(ctx: TenantContext, id: string): Promise<OMPublicationPackage> {
    return this.transition(ctx, id, 'dispatched', { dispatched_at: new Date() });
  }

  async acknowledge(ctx: TenantContext, id: string): Promise<OMPublicationPackage> {
    return this.transition(ctx, id, 'acknowledged', { acknowledged_at: new Date() });
  }

  async reject(ctx: TenantContext, id: string, reason: string): Promise<OMPublicationPackage> {
    return this.transition(ctx, id, 'rejected', { rejected_at: new Date(), rejection_reason: reason });
  }

  async revoke(ctx: TenantContext, id: string): Promise<OMPublicationPackage> {
    return this.transition(ctx, id, 'revoked', { revoked_at: new Date() });
  }

  async getById(ctx: TenantContext, id: string): Promise<OMPublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM outcome_monitoring.om_publication_packages WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('OMPublicationPackage', id);
      return rowToPackage(result.rows[0]);
    });
  }
}
