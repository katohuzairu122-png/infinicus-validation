import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ValidationError, InvalidTransitionError } from './errors.js';

export interface SimulationPublicationPackage {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  simulationInsightPackageVersionId: string;
  targetLayer: string;
  targetBlock: string;
  publicationStatus: string;
  idempotencyKey: string;
}

const VALID_TARGET_LAYERS = ['ai_decision_intelligence'];

const TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['ready'],
  ready: ['dispatched'],
  dispatched: ['acknowledged', 'rejected', 'revoked'],
  acknowledged: ['revoked'],
};

function rowToPackage(row: Record<string, unknown>): SimulationPublicationPackage {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    simulationInsightPackageVersionId: row.simulation_insight_package_version_id as string,
    targetLayer: row.target_layer as string,
    targetBlock: row.target_block as string,
    publicationStatus: row.publication_status as string,
    idempotencyKey: row.idempotency_key as string,
  };
}

export class SimulationPublicationRepository {
  /**
   * Creates the simulation_insight_packages header row that createVersion()
   * and createPackage() attach to — required because the spec's minimum
   * responsibility list has no separate insight-package-header repository
   * (matches the BUILD-12 DTPublicationPackageRepository precedent).
   */
  async createInsightPackage(ctx: TenantContext, businessId: string, packageCode: string): Promise<{ id: string; packageCode: string; latestVersion: number; status: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_insight_packages (tenant_id, workspace_id, business_id, package_code)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, packageCode]
      );
      const row = result.rows[0];
      return { id: row.id as string, packageCode: row.package_code as string, latestVersion: row.latest_version as number, status: row.status as string };
    });
  }

  async createVersion(ctx: TenantContext, simulationInsightPackageId: string, businessId: string, summary: string, resultVersionId?: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const pkg = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_insight_packages WHERE id = $1', [simulationInsightPackageId]);
      if (pkg.rows.length === 0) throw new NotFoundError('SimulationInsightPackage', simulationInsightPackageId);
      const nextVersion = (pkg.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_insight_package_versions
           (simulation_insight_package_id, tenant_id, workspace_id, business_id, version_number, result_version_id, summary)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, version_number`,
        [simulationInsightPackageId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, resultVersionId ?? null, summary]
      );
      await client.query('UPDATE simulation.simulation_insight_packages SET latest_version = $2 WHERE id = $1', [simulationInsightPackageId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  /** Idempotent by (business_id, idempotency_key): duplicate deliveries replay the existing package. */
  async createPackage(
    ctx: TenantContext, businessId: string, simulationInsightPackageVersionId: string,
    targetLayer: string, targetBlock: string, idempotencyKey: string
  ): Promise<{ package: SimulationPublicationPackage; idempotentReplay: boolean }> {
    if (!VALID_TARGET_LAYERS.includes(targetLayer)) {
      throw new ValidationError('SimulationPublicationPackage', [`invalid target_layer: ${targetLayer}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT * FROM simulation.simulation_publication_packages WHERE business_id = $1 AND idempotency_key = $2',
        [businessId, idempotencyKey]
      );
      if (existing.rows.length > 0) return { package: rowToPackage(existing.rows[0]), idempotentReplay: true };

      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_publication_packages
           (tenant_id, workspace_id, business_id, simulation_insight_package_version_id, target_layer, target_block, idempotency_key, publication_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'draft')
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, simulationInsightPackageVersionId, targetLayer, targetBlock, idempotencyKey]
      );
      return { package: rowToPackage(result.rows[0]), idempotentReplay: false };
    });
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, extra: Record<string, unknown> = {}): Promise<SimulationPublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_publication_packages WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('SimulationPublicationPackage', id);
      const fromStatus = current.rows[0].publication_status as string;
      if (!(TRANSITIONS[fromStatus] ?? []).includes(toStatus)) {
        throw new InvalidTransitionError('SimulationPublicationPackage', fromStatus, toStatus);
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
        `UPDATE simulation.simulation_publication_packages SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );
      // Inlined on the shared client — never open a nested withTenantTransaction here.
      await client.query(
        `INSERT INTO simulation.simulation_publication_events (simulation_publication_package_id, tenant_id, workspace_id, business_id, event_type, detail)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, toStatus === 'dispatched' ? 'dispatch' : toStatus === 'acknowledged' ? 'acknowledgement' : toStatus === 'rejected' ? 'rejection' : 'revocation', JSON.stringify({ fromStatus, toStatus })]
      );
      return rowToPackage(result.rows[0]);
    });
  }

  async markReady(ctx: TenantContext, id: string): Promise<SimulationPublicationPackage> {
    return this.transition(ctx, id, 'ready');
  }

  async dispatch(ctx: TenantContext, id: string): Promise<SimulationPublicationPackage> {
    return this.transition(ctx, id, 'dispatched', { dispatched_at: new Date() });
  }

  async acknowledge(ctx: TenantContext, id: string): Promise<SimulationPublicationPackage> {
    return this.transition(ctx, id, 'acknowledged', { acknowledged_at: new Date() });
  }

  async reject(ctx: TenantContext, id: string, reason: string): Promise<SimulationPublicationPackage> {
    return this.transition(ctx, id, 'rejected', { rejected_at: new Date(), rejection_reason: reason });
  }

  async revoke(ctx: TenantContext, id: string): Promise<SimulationPublicationPackage> {
    return this.transition(ctx, id, 'revoked', { revoked_at: new Date() });
  }

  async getById(ctx: TenantContext, id: string): Promise<SimulationPublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_publication_packages WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('SimulationPublicationPackage', id);
      return rowToPackage(result.rows[0]);
    });
  }
}
