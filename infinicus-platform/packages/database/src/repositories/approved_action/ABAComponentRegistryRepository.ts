import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ABAComponentRegistryNotFoundError } from './errors.js';

export interface ABAComponentRegistryEntry {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  componentCode: string;
  componentType: string;
  status: string;
  latestVersion: number;
}

export interface ABADeployment {
  id: string;
  abaComponentRegistryVersionId: string;
  activationState: string;
  environment: string;
}

function rowToRegistry(row: Record<string, unknown>): ABAComponentRegistryEntry {
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

function rowToDeployment(row: Record<string, unknown>): ABADeployment {
  return {
    id: row.id as string,
    abaComponentRegistryVersionId: row.aba_component_registry_version_id as string,
    activationState: row.activation_state as string,
    environment: row.environment as string,
  };
}

export class ABAComponentRegistryRepository {
  async registerComponent(ctx: TenantContext, businessId: string, componentCode: string, componentType: string): Promise<ABAComponentRegistryEntry> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.aba_component_registry (tenant_id, workspace_id, business_id, component_code, component_type)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, componentCode, componentType]
      );
      return rowToRegistry(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, abaComponentRegistryId: string, businessId: string, capabilities: Record<string, unknown>): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const reg = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.aba_component_registry WHERE id = $1', [abaComponentRegistryId]);
      if (reg.rows.length === 0) throw new ABAComponentRegistryNotFoundError('ABAComponentRegistry', abaComponentRegistryId);
      const nextVersion = (reg.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.aba_component_registry_versions
           (aba_component_registry_id, tenant_id, workspace_id, business_id, version_number, capabilities, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,gen_random_uuid()) RETURNING id, version_number`,
        [abaComponentRegistryId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(capabilities)]
      );
      await client.query('UPDATE approved_business_action.aba_component_registry SET latest_version = $2 WHERE id = $1', [abaComponentRegistryId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async activateVersion(ctx: TenantContext, abaComponentRegistryId: string, _abaComponentRegistryVersionId: string): Promise<ABAComponentRegistryEntry> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE approved_business_action.aba_component_registry SET status = 'active' WHERE id = $1 RETURNING *`,
        [abaComponentRegistryId]
      );
      if (result.rows.length === 0) throw new ABAComponentRegistryNotFoundError('ABAComponentRegistry', abaComponentRegistryId);
      return rowToRegistry(result.rows[0]);
    });
  }

  async recordDeployment(ctx: TenantContext, businessId: string, abaComponentRegistryVersionId: string, environment = 'staging'): Promise<ABADeployment> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.aba_deployments (tenant_id, workspace_id, business_id, aba_component_registry_version_id, environment, activation_state)
         VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, abaComponentRegistryVersionId, environment]
      );
      return rowToDeployment(result.rows[0]);
    });
  }

  async recordRollback(ctx: TenantContext, businessId: string, abaDeploymentId: string, reason: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.aba_deployment_rollbacks (aba_deployment_id, tenant_id, workspace_id, business_id, reason)
         VALUES ($1,$2,$3,$4,$5)`,
        [abaDeploymentId, ctx.tenantId, ctx.workspaceId, businessId, reason]
      );
      await client.query(`UPDATE approved_business_action.aba_deployments SET activation_state = 'rolled_back' WHERE id = $1`, [abaDeploymentId]);
    });
  }

  async getActiveVersion(ctx: TenantContext, abaComponentRegistryId: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT v.id, v.version_number FROM approved_business_action.aba_component_registry_versions v
         JOIN approved_business_action.aba_component_registry r ON r.id = v.aba_component_registry_id
         WHERE v.aba_component_registry_id = $1 AND r.status = 'active'
         ORDER BY v.version_number DESC LIMIT 1`,
        [abaComponentRegistryId]
      );
      if (result.rows.length === 0) throw new ABAComponentRegistryNotFoundError('ActiveABAComponentRegistryVersion', abaComponentRegistryId);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }
}
