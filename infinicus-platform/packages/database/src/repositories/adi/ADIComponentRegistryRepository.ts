import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ADIComponentRegistryNotFoundError } from './errors.js';

export interface ADIComponentRegistryEntry {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  componentCode: string;
  componentType: string;
  status: string;
  latestVersion: number;
}

export interface ADIDeployment {
  id: string;
  adiComponentRegistryVersionId: string;
  activationState: string;
  environment: string;
}

function rowToRegistry(row: Record<string, unknown>): ADIComponentRegistryEntry {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    componentCode: row.component_code as string,
    componentType: row.component_type as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToDeployment(row: Record<string, unknown>): ADIDeployment {
  return {
    id: row.id as string,
    adiComponentRegistryVersionId: row.adi_component_registry_version_id as string,
    activationState: row.activation_state as string,
    environment: row.environment as string,
  };
}

export class ADIComponentRegistryRepository {
  async registerComponent(ctx: TenantContext, businessId: string, componentCode: string, componentType: string): Promise<ADIComponentRegistryEntry> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.adi_component_registry (tenant_id, workspace_id, business_id, component_code, component_type)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, componentCode, componentType]
      );
      return rowToRegistry(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, adiComponentRegistryId: string, businessId: string, capabilities: Record<string, unknown>): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const reg = await client.query<Record<string, unknown>>('SELECT * FROM ai_decision_intelligence.adi_component_registry WHERE id = $1', [adiComponentRegistryId]);
      if (reg.rows.length === 0) throw new ADIComponentRegistryNotFoundError('ADIComponentRegistry', adiComponentRegistryId);
      const nextVersion = (reg.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.adi_component_registry_versions
           (adi_component_registry_id, tenant_id, workspace_id, business_id, version_number, capabilities, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [adiComponentRegistryId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(capabilities)]
      );
      await client.query('UPDATE ai_decision_intelligence.adi_component_registry SET latest_version = $2 WHERE id = $1', [adiComponentRegistryId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async activateVersion(ctx: TenantContext, adiComponentRegistryId: string, _adiComponentRegistryVersionId: string): Promise<ADIComponentRegistryEntry> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE ai_decision_intelligence.adi_component_registry SET status = 'active' WHERE id = $1 RETURNING *`,
        [adiComponentRegistryId]
      );
      if (result.rows.length === 0) throw new ADIComponentRegistryNotFoundError('ADIComponentRegistry', adiComponentRegistryId);
      return rowToRegistry(result.rows[0]);
    });
  }

  async recordDeployment(ctx: TenantContext, businessId: string, adiComponentRegistryVersionId: string, environment = 'staging'): Promise<ADIDeployment> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO ai_decision_intelligence.adi_deployments (tenant_id, workspace_id, business_id, adi_component_registry_version_id, environment, activation_state)
         VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, adiComponentRegistryVersionId, environment]
      );
      return rowToDeployment(result.rows[0]);
    });
  }

  async recordRollback(ctx: TenantContext, businessId: string, adiDeploymentId: string, reason: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO ai_decision_intelligence.adi_deployment_rollbacks (adi_deployment_id, tenant_id, workspace_id, business_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [adiDeploymentId, ctx.tenantId, ctx.workspaceId, businessId, reason]
      );
      await client.query(`UPDATE ai_decision_intelligence.adi_deployments SET activation_state = 'rolled_back' WHERE id = $1`, [adiDeploymentId]);
    });
  }

  async getActiveVersion(ctx: TenantContext, adiComponentRegistryId: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT v.id, v.version_number FROM ai_decision_intelligence.adi_component_registry_versions v
         JOIN ai_decision_intelligence.adi_component_registry r ON r.id = v.adi_component_registry_id
         WHERE v.adi_component_registry_id = $1 AND r.status = 'active'
         ORDER BY v.version_number DESC LIMIT 1`,
        [adiComponentRegistryId]
      );
      if (result.rows.length === 0) throw new ADIComponentRegistryNotFoundError('ActiveADIComponentRegistryVersion', adiComponentRegistryId);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }
}
