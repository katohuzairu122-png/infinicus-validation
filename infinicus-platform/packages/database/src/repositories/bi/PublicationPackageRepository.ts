import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ConflictError, ValidationError } from './errors.js';

export type TargetLayer = 'business_digital_twin' | 'simulation' | 'ai_decision_intelligence';
const VALID_TARGET_LAYERS: readonly TargetLayer[] = ['business_digital_twin', 'simulation', 'ai_decision_intelligence'];

export interface BIPublicationPackage {
  id: string;
  businessId: string;
  insightPackageVersionId: string;
  targetLayer: TargetLayer;
  targetBlock: string;
  publicationStatus: string;
  idempotencyKey: string;
}

export interface ComponentDeployment {
  id: string;
  componentVersionId: string;
  activationState: string;
}

function rowToPublication(row: Record<string, unknown>): BIPublicationPackage {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    insightPackageVersionId: row.insight_package_version_id as string,
    targetLayer: row.target_layer as TargetLayer,
    targetBlock: row.target_block as string,
    publicationStatus: row.publication_status as string,
    idempotencyKey: row.idempotency_key as string,
  };
}

function rowToDeployment(row: Record<string, unknown>): ComponentDeployment {
  return { id: row.id as string, componentVersionId: row.component_version_id as string, activationState: row.activation_state as string };
}

export class BIPublicationPackageRepository {
  /** Idempotent by (business_id, idempotency_key): duplicate deliveries replay the existing package. */
  async publish(
    ctx: TenantContext, businessId: string, insightPackageVersionId: string,
    targetLayer: string, targetBlock: string, idempotencyKey: string
  ): Promise<{ package: BIPublicationPackage; idempotentReplay: boolean }> {
    if (!VALID_TARGET_LAYERS.includes(targetLayer as TargetLayer)) {
      throw new ValidationError('BIPublicationPackage', [`invalid target_layer: ${targetLayer}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_intelligence.bi_publication_packages WHERE business_id = $1 AND idempotency_key = $2',
        [businessId, idempotencyKey]
      );
      if (existing.rows.length > 0) return { package: rowToPublication(existing.rows[0]), idempotentReplay: true };

      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.bi_publication_packages
           (tenant_id, workspace_id, business_id, insight_package_version_id, target_layer, target_block, idempotency_key, publication_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'ready')
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, insightPackageVersionId, targetLayer, targetBlock, idempotencyKey]
      );
      await client.query(
        `INSERT INTO business_intelligence.bi_publication_events (bi_publication_package_id, tenant_id, workspace_id, business_id, event_type, notes, correlation_id)
         VALUES ($1,$2,$3,$4,'dispatch','ready',$5)`,
        [result.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, result.rows[0].correlation_id]
      );
      return { package: rowToPublication(result.rows[0]), idempotentReplay: false };
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<BIPublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.bi_publication_packages WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('BIPublicationPackage', id);
      return rowToPublication(result.rows[0]);
    });
  }

  async dispatch(ctx: TenantContext, id: string): Promise<BIPublicationPackage> {
    return this.transition(ctx, id, 'dispatched', 'dispatch');
  }

  async acknowledge(ctx: TenantContext, id: string): Promise<BIPublicationPackage> {
    return this.transition(ctx, id, 'acknowledged', 'acknowledgement');
  }

  async reject(ctx: TenantContext, id: string, reason: string): Promise<BIPublicationPackage> {
    return this.transition(ctx, id, 'rejected', 'rejection', reason);
  }

  async revoke(ctx: TenantContext, id: string, reason: string): Promise<BIPublicationPackage> {
    return this.transition(ctx, id, 'revoked', 'revocation', reason);
  }

  private async transition(ctx: TenantContext, id: string, toStatus: string, eventType: string, notes?: string): Promise<BIPublicationPackage> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.bi_publication_packages WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new NotFoundError('BIPublicationPackage', id);
      const column = toStatus === 'dispatched' ? 'dispatched_at' : toStatus === 'acknowledged' ? 'acknowledged_at' : toStatus === 'rejected' ? 'rejected_at' : 'revoked_at';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_intelligence.bi_publication_packages
         SET publication_status = $2, ${column} = now(), rejection_reason = CASE WHEN $2 = 'rejected' THEN $3 ELSE rejection_reason END
         WHERE id = $1
         RETURNING *`,
        [id, toStatus, notes ?? null]
      );
      await client.query(
        `INSERT INTO business_intelligence.bi_publication_events (bi_publication_package_id, tenant_id, workspace_id, business_id, event_type, notes, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, eventType, notes ?? null, result.rows[0].correlation_id]
      );
      return rowToPublication(result.rows[0]);
    });
  }

  /** Standalone event recording for callers outside an existing publish/transition flow. */
  async recordEvent(ctx: TenantContext, biPublicationPackageId: string, businessId: string, eventType: string, notes?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      const pkg = await client.query<Record<string, unknown>>('SELECT correlation_id FROM business_intelligence.bi_publication_packages WHERE id = $1', [biPublicationPackageId]);
      if (pkg.rows.length === 0) throw new NotFoundError('BIPublicationPackage', biPublicationPackageId);
      await client.query(
        `INSERT INTO business_intelligence.bi_publication_events (bi_publication_package_id, tenant_id, workspace_id, business_id, event_type, notes, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [biPublicationPackageId, ctx.tenantId, ctx.workspaceId, businessId, eventType, notes ?? null, pkg.rows[0].correlation_id]
      );
    });
  }

  async listEvents(ctx: TenantContext, biPublicationPackageId: string): Promise<unknown[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query('SELECT * FROM business_intelligence.bi_publication_events WHERE bi_publication_package_id = $1 ORDER BY occurred_at', [biPublicationPackageId]);
      return result.rows;
    });
  }

  async registerComponent(ctx: TenantContext, businessId: string, componentCode: string, componentType: string): Promise<{ id: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query('SELECT id FROM business_intelligence.bi_component_registry WHERE business_id = $1 AND component_code = $2', [businessId, componentCode]);
      if (existing.rows.length > 0) throw new ConflictError('BIComponentRegistry', `component_code already exists: ${componentCode}`);
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.bi_component_registry (tenant_id, workspace_id, business_id, component_code, component_type)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [ctx.tenantId, ctx.workspaceId, businessId, componentCode, componentType]
      );
      return { id: result.rows[0].id as string };
    });
  }

  async registerComponentVersion(ctx: TenantContext, componentId: string, businessId: string, versionNumber: string): Promise<{ id: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const component = await client.query('SELECT id FROM business_intelligence.bi_component_registry WHERE id = $1', [componentId]);
      if (component.rows.length === 0) throw new NotFoundError('BIComponentRegistry', componentId);
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.bi_component_versions (component_id, tenant_id, workspace_id, business_id, version_number)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [componentId, ctx.tenantId, ctx.workspaceId, businessId, versionNumber]
      );
      return { id: result.rows[0].id as string };
    });
  }

  async activateDeployment(ctx: TenantContext, componentVersionId: string, businessId: string): Promise<ComponentDeployment> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_intelligence.bi_deployments (component_version_id, tenant_id, workspace_id, business_id, activation_state, activated_at)
         VALUES ($1,$2,$3,$4,'active',now())
         RETURNING *`,
        [componentVersionId, ctx.tenantId, ctx.workspaceId, businessId]
      );
      return rowToDeployment(result.rows[0]);
    });
  }

  async rollbackDeployment(ctx: TenantContext, deploymentId: string, businessId: string, reason: string, rolledBackToDeploymentId?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      const deployment = await client.query('SELECT id FROM business_intelligence.bi_deployments WHERE id = $1', [deploymentId]);
      if (deployment.rows.length === 0) throw new NotFoundError('BIDeployment', deploymentId);
      await client.query(`UPDATE business_intelligence.bi_deployments SET activation_state = 'rolled_back' WHERE id = $1`, [deploymentId]);
      await client.query(
        `INSERT INTO business_intelligence.bi_deployment_rollbacks (deployment_id, tenant_id, workspace_id, business_id, reason, rolled_back_to_deployment_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [deploymentId, ctx.tenantId, ctx.workspaceId, businessId, reason, rolledBackToDeploymentId ?? null]
      );
    });
  }

  async findDeploymentById(ctx: TenantContext, id: string): Promise<ComponentDeployment> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_intelligence.bi_deployments WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('BIDeployment', id);
      return rowToDeployment(result.rows[0]);
    });
  }
}
