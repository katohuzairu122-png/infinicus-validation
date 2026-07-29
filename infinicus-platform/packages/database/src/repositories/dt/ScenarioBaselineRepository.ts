import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, ScenarioBaselineStateConflictError, ScenarioBaselineValidationError } from './errors.js';

export interface ScenarioBaseline {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  instanceId: string;
  snapshotVersionId: string;
  baselineCode: string;
  objective: string;
  status: string;
  latestVersion: number;
}

export interface ScenarioBaselineVersion {
  id: string;
  scenarioBaselineId: string;
  versionNumber: number;
  status: string;
  correlationId: string;
}

function rowToBaseline(row: Record<string, unknown>): ScenarioBaseline {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    instanceId: row.instance_id as string,
    snapshotVersionId: row.snapshot_version_id as string,
    baselineCode: row.baseline_code as string,
    objective: row.objective as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToVersion(row: Record<string, unknown>): ScenarioBaselineVersion {
  return {
    id: row.id as string,
    scenarioBaselineId: row.scenario_baseline_id as string,
    versionNumber: row.version_number as number,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class ScenarioBaselineRepository {
  async createBaseline(ctx: TenantContext, businessId: string, instanceId: string, snapshotVersionId: string, baselineCode: string, objective: string): Promise<{ baseline: ScenarioBaseline; version: ScenarioBaselineVersion }> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.scenario_baselines
           (tenant_id, workspace_id, business_id, instance_id, snapshot_version_id, baseline_code, objective, latest_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, instanceId, snapshotVersionId, baselineCode, objective]
      );
      const correlationId = randomUUID();
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.scenario_baseline_versions (scenario_baseline_id, tenant_id, workspace_id, business_id, version_number, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5) RETURNING *`,
        [result.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, correlationId]
      );
      return { baseline: rowToBaseline(result.rows[0]), version: rowToVersion(versionResult.rows[0]) };
    });
  }

  async createVersion(ctx: TenantContext, scenarioBaselineId: string, businessId: string): Promise<ScenarioBaselineVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const b = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.scenario_baselines WHERE id = $1', [scenarioBaselineId]);
      if (b.rows.length === 0) throw new NotFoundError('ScenarioBaseline', scenarioBaselineId);
      if (b.rows[0].status === 'published') throw new ScenarioBaselineStateConflictError('ScenarioBaseline', 'published baselines cannot receive new draft versions in place');
      const nextVersion = (b.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.scenario_baseline_versions (scenario_baseline_id, tenant_id, workspace_id, business_id, version_number, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [scenarioBaselineId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, randomUUID()]
      );
      await client.query('UPDATE business_digital_twin.scenario_baselines SET latest_version = $2 WHERE id = $1', [scenarioBaselineId, nextVersion]);
      return rowToVersion(result.rows[0]);
    });
  }

  async addInput(ctx: TenantContext, scenarioBaselineVersionId: string, businessId: string, inputValue: unknown, opts: { stateVariableDefinitionId?: string; uncertaintyAssignmentId?: string } = {}): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_digital_twin.scenario_baseline_inputs
           (scenario_baseline_version_id, tenant_id, workspace_id, business_id, state_variable_definition_id, uncertainty_assignment_id, input_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [scenarioBaselineVersionId, ctx.tenantId, ctx.workspaceId, businessId, opts.stateVariableDefinitionId ?? null, opts.uncertaintyAssignmentId ?? null, JSON.stringify(inputValue)]
      );
    });
  }

  async addConstraint(ctx: TenantContext, scenarioBaselineVersionId: string, businessId: string, operator: string, operand: unknown, twinConstraintId?: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO business_digital_twin.scenario_baseline_constraints
           (scenario_baseline_version_id, tenant_id, workspace_id, business_id, twin_constraint_id, operator, operand)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [scenarioBaselineVersionId, ctx.tenantId, ctx.workspaceId, businessId, twinConstraintId ?? null, operator, JSON.stringify(operand)]
      );
    });
  }

  async validateBaseline(ctx: TenantContext, baselineId: string, versionId: string): Promise<ScenarioBaseline> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.scenario_baselines WHERE id = $1', [baselineId]);
      if (current.rows.length === 0) throw new NotFoundError('ScenarioBaseline', baselineId);
      if (current.rows[0].status === 'published') throw new ScenarioBaselineStateConflictError('ScenarioBaseline', 'published baselines are immutable');
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.scenario_baselines SET status = 'validated' WHERE id = $1 RETURNING *`,
        [baselineId]
      );
      await client.query(`UPDATE business_digital_twin.scenario_baseline_versions SET status = 'validated' WHERE id = $1`, [versionId]);
      return rowToBaseline(result.rows[0]);
    });
  }

  async publishBaseline(ctx: TenantContext, baselineId: string, versionId: string): Promise<ScenarioBaseline> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.scenario_baselines WHERE id = $1', [baselineId]);
      if (current.rows.length === 0) throw new NotFoundError('ScenarioBaseline', baselineId);
      if (!['validated', 'ready'].includes(current.rows[0].status as string)) {
        throw new ScenarioBaselineValidationError('ScenarioBaseline', ['must be validated or ready before publication']);
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.scenario_baselines SET status = 'published' WHERE id = $1 RETURNING *`,
        [baselineId]
      );
      await client.query(`UPDATE business_digital_twin.scenario_baseline_versions SET status = 'published' WHERE id = $1`, [versionId]);
      return rowToBaseline(result.rows[0]);
    });
  }

  async getPublishedForSnapshot(ctx: TenantContext, snapshotVersionId: string): Promise<ScenarioBaseline[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_digital_twin.scenario_baselines WHERE snapshot_version_id = $1 AND status = 'published'`,
        [snapshotVersionId]
      );
      return result.rows.map(rowToBaseline);
    });
  }
}
