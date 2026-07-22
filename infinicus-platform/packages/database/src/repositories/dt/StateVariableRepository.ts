import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, StateVariableValidationError } from './errors.js';

export interface StateVariableDefinition {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  variableCode: string;
  name: string;
  category: string;
  valueType: string;
  latestVersion: number;
}

export interface StateVariableValue {
  id: string;
  definitionId: string;
  instanceId: string;
  valueJson: unknown;
  effectiveAt: Date;
  correlationId: string;
}

const VALID_CATEGORIES = ['financial', 'operational', 'customer', 'market', 'resource', 'risk', 'capacity', 'behavioral', 'regulatory', 'custom'];
const VALID_VALUE_TYPES = ['number', 'integer', 'boolean', 'string', 'date', 'timestamp', 'percentage', 'currency', 'enum', 'json'];

function rowToDefinition(row: Record<string, unknown>): StateVariableDefinition {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    variableCode: row.variable_code as string,
    name: row.name as string,
    category: row.category as string,
    valueType: row.value_type as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToValue(row: Record<string, unknown>): StateVariableValue {
  return {
    id: row.id as string,
    definitionId: row.definition_id as string,
    instanceId: row.instance_id as string,
    valueJson: row.value_json,
    effectiveAt: row.effective_at as Date,
    correlationId: row.correlation_id as string,
  };
}

export class StateVariableRepository {
  async createDefinition(
    ctx: TenantContext,
    businessId: string,
    variableCode: string,
    name: string,
    category: string,
    valueType: string,
    opts: { unit?: string; nullable?: boolean; sourceClassification?: string } = {}
  ): Promise<StateVariableDefinition> {
    if (!VALID_CATEGORIES.includes(category)) throw new StateVariableValidationError('StateVariableDefinition', [`unknown category: ${category}`]);
    if (!VALID_VALUE_TYPES.includes(valueType)) throw new StateVariableValidationError('StateVariableDefinition', [`unknown value type: ${valueType}`]);
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.state_variable_definitions
           (tenant_id, workspace_id, business_id, variable_code, name, category, value_type, unit, nullable, source_classification)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, variableCode, name, category, valueType,
         opts.unit ?? null, opts.nullable ?? false, opts.sourceClassification ?? 'observed']
      );
      return rowToDefinition(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, definitionId: string, businessId: string, specification: Record<string, unknown>): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const def = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.state_variable_definitions WHERE id = $1', [definitionId]);
      if (def.rows.length === 0) throw new NotFoundError('StateVariableDefinition', definitionId);
      const nextVersion = (def.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.state_variable_definition_versions
           (definition_id, tenant_id, workspace_id, business_id, version_number, specification, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, version_number`,
        [definitionId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(specification), randomUUID()]
      );
      await client.query('UPDATE business_digital_twin.state_variable_definitions SET latest_version = $2 WHERE id = $1', [definitionId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async recordValue(
    ctx: TenantContext,
    definitionId: string,
    businessId: string,
    instanceId: string,
    valueJson: unknown,
    effectiveAt: Date
  ): Promise<StateVariableValue> {
    return withTenantTransaction(ctx, async (client) => {
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.state_variable_values
           (definition_id, tenant_id, workspace_id, business_id, instance_id, value_json, effective_at, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [definitionId, ctx.tenantId, ctx.workspaceId, businessId, instanceId, JSON.stringify(valueJson), effectiveAt, correlationId]
      );
      return rowToValue(result.rows[0]);
    });
  }

  async recordQuality(
    ctx: TenantContext,
    stateVariableValueId: string,
    opts: { qualityScore?: number; freshnessSeconds?: number; reliabilityScore?: number; notes?: string } = {}
  ): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_digital_twin.state_variable_value_quality
           (state_variable_value_id, tenant_id, workspace_id, business_id, quality_score, freshness_seconds, reliability_score, notes)
         VALUES ($1,$2,$3,(SELECT business_id FROM business_digital_twin.state_variable_values WHERE id = $1),$4,$5,$6,$7)`,
        [stateVariableValueId, ctx.tenantId, ctx.workspaceId, opts.qualityScore ?? null, opts.freshnessSeconds ?? null, opts.reliabilityScore ?? null, opts.notes ?? null]
      );
    });
  }

  async getDefinition(ctx: TenantContext, id: string): Promise<StateVariableDefinition> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.state_variable_definitions WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('StateVariableDefinition', id);
      return rowToDefinition(result.rows[0]);
    });
  }

  async listValues(ctx: TenantContext, definitionId: string, instanceId: string): Promise<StateVariableValue[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_digital_twin.state_variable_values WHERE definition_id = $1 AND instance_id = $2 ORDER BY effective_at DESC`,
        [definitionId, instanceId]
      );
      return result.rows.map(rowToValue);
    });
  }
}
