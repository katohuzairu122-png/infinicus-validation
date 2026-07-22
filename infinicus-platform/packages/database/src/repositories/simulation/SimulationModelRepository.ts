import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, SimulationModelNotFoundError, SimulationModelStateConflictError } from './errors.js';

export interface SimulationModel {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  modelCode: string;
  name: string;
  engineNamespace: string;
  status: string;
  latestVersion: number;
}

export interface SimulationModelVersion {
  id: string;
  modelId: string;
  versionNumber: number;
  engineVersion: string;
  specification: Record<string, unknown>;
  status: string;
  correlationId: string;
}

function rowToModel(row: Record<string, unknown>): SimulationModel {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    modelCode: row.model_code as string,
    name: row.name as string,
    engineNamespace: row.engine_namespace as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToVersion(row: Record<string, unknown>): SimulationModelVersion {
  return {
    id: row.id as string,
    modelId: row.model_id as string,
    versionNumber: row.version_number as number,
    engineVersion: row.engine_version as string,
    specification: row.specification as Record<string, unknown>,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class SimulationModelRepository {
  async createModel(ctx: TenantContext, businessId: string, modelCode: string, name: string, engineNamespace = 'window.INFINICUS.SIMULATION'): Promise<SimulationModel> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_models (tenant_id, workspace_id, business_id, model_code, name, engine_namespace)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, modelCode, name, engineNamespace]
      );
      return rowToModel(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, modelId: string, businessId: string, engineVersion: string, specification: Record<string, unknown> = {}): Promise<SimulationModelVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const model = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_models WHERE id = $1', [modelId]);
      if (model.rows.length === 0) throw new SimulationModelNotFoundError('SimulationModel', modelId);
      const nextVersion = (model.rows[0].latest_version as number) + 1;
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_model_versions
           (model_id, tenant_id, workspace_id, business_id, version_number, engine_version, specification, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [modelId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, engineVersion, JSON.stringify(specification), correlationId]
      );
      await client.query('UPDATE simulation.simulation_models SET latest_version = $2 WHERE id = $1', [modelId, nextVersion]);
      return rowToVersion(result.rows[0]);
    });
  }

  async addParameter(ctx: TenantContext, modelVersionId: string, businessId: string, parameterCode: string, valueType: string, defaultValue?: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_model_parameters (model_version_id, tenant_id, workspace_id, business_id, parameter_code, value_type, default_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [modelVersionId, ctx.tenantId, ctx.workspaceId, businessId, parameterCode, valueType, defaultValue === undefined ? null : JSON.stringify(defaultValue)]
      );
    });
  }

  async addConstraint(ctx: TenantContext, modelVersionId: string, businessId: string, constraintCode: string, description: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_model_constraints (model_version_id, tenant_id, workspace_id, business_id, constraint_code, description)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [modelVersionId, ctx.tenantId, ctx.workspaceId, businessId, constraintCode, description]
      );
    });
  }

  async validateVersion(ctx: TenantContext, versionId: string): Promise<SimulationModelVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_model_versions SET status = 'validated' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      if (result.rows.length === 0) throw new SimulationModelNotFoundError('SimulationModelVersion', versionId);
      return rowToVersion(result.rows[0]);
    });
  }

  async activateVersion(ctx: TenantContext, versionId: string): Promise<SimulationModelVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const version = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_model_versions WHERE id = $1', [versionId]);
      if (version.rows.length === 0) throw new SimulationModelNotFoundError('SimulationModelVersion', versionId);
      if (version.rows[0].status !== 'validated') {
        throw new SimulationModelStateConflictError('SimulationModelVersion', 'must be validated before activation');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_model_versions SET status = 'active' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      await client.query(
        `UPDATE simulation.simulation_models SET status = 'active' WHERE id = $1`,
        [version.rows[0].model_id]
      );
      return rowToVersion(result.rows[0]);
    });
  }

  async supersedeVersion(ctx: TenantContext, versionId: string): Promise<SimulationModelVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_model_versions SET status = 'superseded' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      if (result.rows.length === 0) throw new SimulationModelNotFoundError('SimulationModelVersion', versionId);
      return rowToVersion(result.rows[0]);
    });
  }

  async getActiveVersion(ctx: TenantContext, modelId: string): Promise<SimulationModelVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM simulation.simulation_model_versions
         WHERE model_id = $1 AND status = 'active' ORDER BY version_number DESC LIMIT 1`,
        [modelId]
      );
      if (result.rows.length === 0) throw new NotFoundError('ActiveSimulationModelVersion', modelId);
      return rowToVersion(result.rows[0]);
    });
  }
}
