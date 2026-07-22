import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, TwinConstraintValidationError } from './errors.js';

export interface TwinAssumption {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  instanceId: string;
  assumptionCode: string;
  source: string;
  statement: string;
  latestVersion: number;
}

export interface TwinConstraint {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  instanceId: string;
  constraintCode: string;
  operator: string;
  operand: unknown;
  latestVersion: number;
}

export interface TwinConstraintEvaluation {
  id: string;
  constraintId: string;
  snapshotVersionId: string | null;
  satisfied: boolean;
  evaluatedValue: unknown;
  evaluatedAt: Date;
}

const VALID_SOURCES = ['observed', 'declared', 'derived', 'inferred', 'external'];
const VALID_OPERATORS = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains'];

function rowToAssumption(row: Record<string, unknown>): TwinAssumption {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    instanceId: row.instance_id as string,
    assumptionCode: row.assumption_code as string,
    source: row.source as string,
    statement: row.statement as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToConstraint(row: Record<string, unknown>): TwinConstraint {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    instanceId: row.instance_id as string,
    constraintCode: row.constraint_code as string,
    operator: row.operator as string,
    operand: row.operand,
    latestVersion: row.latest_version as number,
  };
}

function rowToEvaluation(row: Record<string, unknown>): TwinConstraintEvaluation {
  return {
    id: row.id as string,
    constraintId: row.constraint_id as string,
    snapshotVersionId: row.snapshot_version_id as string | null,
    satisfied: row.satisfied as boolean,
    evaluatedValue: row.evaluated_value,
    evaluatedAt: row.evaluated_at as Date,
  };
}

export class TwinAssumptionConstraintRepository {
  async createAssumption(ctx: TenantContext, businessId: string, instanceId: string, assumptionCode: string, source: string, statement: string): Promise<TwinAssumption> {
    if (!VALID_SOURCES.includes(source)) throw new TwinConstraintValidationError('TwinAssumption', [`unknown source: ${source}`]);
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_assumptions (tenant_id, workspace_id, business_id, instance_id, assumption_code, source, statement)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, instanceId, assumptionCode, source, statement]
      );
      return rowToAssumption(result.rows[0]);
    });
  }

  async createAssumptionVersion(ctx: TenantContext, assumptionId: string, businessId: string, statement: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const a = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_assumptions WHERE id = $1', [assumptionId]);
      if (a.rows.length === 0) throw new NotFoundError('TwinAssumption', assumptionId);
      const nextVersion = (a.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_assumption_versions (assumption_id, tenant_id, workspace_id, business_id, version_number, statement, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, version_number`,
        [assumptionId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, statement, randomUUID()]
      );
      await client.query('UPDATE business_digital_twin.twin_assumptions SET latest_version = $2 WHERE id = $1', [assumptionId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async createConstraint(ctx: TenantContext, businessId: string, instanceId: string, constraintCode: string, operator: string, operand: unknown, stateVariableDefinitionId?: string): Promise<TwinConstraint> {
    if (!VALID_OPERATORS.includes(operator)) throw new TwinConstraintValidationError('TwinConstraint', [`unknown operator: ${operator}`]);
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_constraints
           (tenant_id, workspace_id, business_id, instance_id, constraint_code, state_variable_definition_id, operator, operand)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, instanceId, constraintCode, stateVariableDefinitionId ?? null, operator, JSON.stringify(operand)]
      );
      return rowToConstraint(result.rows[0]);
    });
  }

  async createConstraintVersion(ctx: TenantContext, constraintId: string, businessId: string, operator: string, operand: unknown): Promise<{ id: string; versionNumber: number }> {
    if (!VALID_OPERATORS.includes(operator)) throw new TwinConstraintValidationError('TwinConstraintVersion', [`unknown operator: ${operator}`]);
    return withTenantTransaction(ctx, async (client) => {
      const c = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_constraints WHERE id = $1', [constraintId]);
      if (c.rows.length === 0) throw new NotFoundError('TwinConstraint', constraintId);
      const nextVersion = (c.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_constraint_versions (constraint_id, tenant_id, workspace_id, business_id, version_number, operator, operand, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, version_number`,
        [constraintId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, operator, JSON.stringify(operand), randomUUID()]
      );
      await client.query('UPDATE business_digital_twin.twin_constraints SET latest_version = $2 WHERE id = $1', [constraintId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async evaluateConstraint(ctx: TenantContext, constraintId: string, businessId: string, satisfied: boolean, evaluatedValue: unknown, snapshotVersionId?: string): Promise<TwinConstraintEvaluation> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_constraint_evaluations
           (constraint_id, tenant_id, workspace_id, business_id, snapshot_version_id, satisfied, evaluated_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [constraintId, ctx.tenantId, ctx.workspaceId, businessId, snapshotVersionId ?? null, satisfied, JSON.stringify(evaluatedValue)]
      );
      return rowToEvaluation(result.rows[0]);
    });
  }

  async listForSnapshot(ctx: TenantContext, snapshotVersionId: string): Promise<TwinConstraintEvaluation[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_digital_twin.twin_constraint_evaluations WHERE snapshot_version_id = $1 ORDER BY evaluated_at DESC',
        [snapshotVersionId]
      );
      return result.rows.map(rowToEvaluation);
    });
  }
}
