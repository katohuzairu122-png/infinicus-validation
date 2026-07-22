import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, SimulationScenarioNotFoundError, SimulationScenarioStateConflictError, ValidationError } from './errors.js';

export interface SimulationScenario {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  modelId: string;
  intakePackageId: string | null;
  scenarioCode: string;
  name: string;
  status: string;
  latestVersion: number;
}

export interface SimulationScenarioVersion {
  id: string;
  scenarioId: string;
  versionNumber: number;
  status: string;
  correlationId: string;
}

const VALID_OPERATORS = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains'];

function rowToScenario(row: Record<string, unknown>): SimulationScenario {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    modelId: row.model_id as string,
    intakePackageId: row.intake_package_id as string | null,
    scenarioCode: row.scenario_code as string,
    name: row.name as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToVersion(row: Record<string, unknown>): SimulationScenarioVersion {
  return {
    id: row.id as string,
    scenarioId: row.scenario_id as string,
    versionNumber: row.version_number as number,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class SimulationScenarioRepository {
  async createScenario(ctx: TenantContext, businessId: string, modelId: string, scenarioCode: string, name: string, intakePackageId?: string): Promise<SimulationScenario> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_scenarios (tenant_id, workspace_id, business_id, model_id, intake_package_id, scenario_code, name)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, modelId, intakePackageId ?? null, scenarioCode, name]
      );
      return rowToScenario(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, scenarioId: string, businessId: string): Promise<SimulationScenarioVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const scenario = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_scenarios WHERE id = $1', [scenarioId]);
      if (scenario.rows.length === 0) throw new SimulationScenarioNotFoundError('SimulationScenario', scenarioId);
      const nextVersion = (scenario.rows[0].latest_version as number) + 1;
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO simulation.simulation_scenario_versions (scenario_id, tenant_id, workspace_id, business_id, version_number, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [scenarioId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, correlationId]
      );
      await client.query('UPDATE simulation.simulation_scenarios SET latest_version = $2 WHERE id = $1', [scenarioId, nextVersion]);
      return rowToVersion(result.rows[0]);
    });
  }

  async addInput(ctx: TenantContext, scenarioVersionId: string, businessId: string, parameterCode: string, inputValue: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_scenario_inputs (scenario_version_id, tenant_id, workspace_id, business_id, parameter_code, input_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [scenarioVersionId, ctx.tenantId, ctx.workspaceId, businessId, parameterCode, JSON.stringify(inputValue)]
      );
    });
  }

  async addAssumption(ctx: TenantContext, scenarioVersionId: string, businessId: string, assumptionCode: string, statement: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_scenario_assumptions (scenario_version_id, tenant_id, workspace_id, business_id, assumption_code, statement)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [scenarioVersionId, ctx.tenantId, ctx.workspaceId, businessId, assumptionCode, statement]
      );
    });
  }

  async addConstraint(ctx: TenantContext, scenarioVersionId: string, businessId: string, constraintCode: string, operator: string, operand: unknown): Promise<void> {
    if (!VALID_OPERATORS.includes(operator)) throw new ValidationError('SimulationScenarioConstraint', [`unknown operator: ${operator}`]);
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO simulation.simulation_scenario_constraints (scenario_version_id, tenant_id, workspace_id, business_id, constraint_code, operator, operand)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [scenarioVersionId, ctx.tenantId, ctx.workspaceId, businessId, constraintCode, operator, JSON.stringify(operand)]
      );
    });
  }

  async validateVersion(ctx: TenantContext, versionId: string): Promise<SimulationScenarioVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_scenario_versions SET status = 'validated' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      if (result.rows.length === 0) throw new SimulationScenarioNotFoundError('SimulationScenarioVersion', versionId);
      return rowToVersion(result.rows[0]);
    });
  }

  async activateVersion(ctx: TenantContext, versionId: string): Promise<SimulationScenarioVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const version = await client.query<Record<string, unknown>>('SELECT * FROM simulation.simulation_scenario_versions WHERE id = $1', [versionId]);
      if (version.rows.length === 0) throw new SimulationScenarioNotFoundError('SimulationScenarioVersion', versionId);
      if (version.rows[0].status !== 'validated') {
        throw new SimulationScenarioStateConflictError('SimulationScenarioVersion', 'must be validated before activation');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE simulation.simulation_scenario_versions SET status = 'active' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      await client.query(`UPDATE simulation.simulation_scenarios SET status = 'active' WHERE id = $1`, [version.rows[0].scenario_id]);
      return rowToVersion(result.rows[0]);
    });
  }

  async getActiveVersion(ctx: TenantContext, scenarioId: string): Promise<SimulationScenarioVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM simulation.simulation_scenario_versions
         WHERE scenario_id = $1 AND status = 'active' ORDER BY version_number DESC LIMIT 1`,
        [scenarioId]
      );
      if (result.rows.length === 0) throw new NotFoundError('ActiveSimulationScenarioVersion', scenarioId);
      return rowToVersion(result.rows[0]);
    });
  }
}
