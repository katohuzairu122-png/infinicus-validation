import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { ActionControlGateNotFoundError, ValidationError } from './errors.js';

export interface ActionControlGate {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  planVersionId: string;
  gateCode: string;
  gateType: string;
  status: string;
}

export interface ActionHold {
  id: string;
  approvedActionId: string;
  holdCode: string;
  reason: string;
}

export interface ActionRelease {
  id: string;
  actionHoldId: string;
  releaseReason: string;
}

const GATE_TYPES = new Set(['manual', 'automated', 'compliance']);
const GATE_STATUSES = ['pending', 'passed', 'failed', 'waived'];

function rowToGate(row: Record<string, unknown>): ActionControlGate {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    planVersionId: row.plan_version_id as string,
    gateCode: row.gate_code as string,
    gateType: row.gate_type as string,
    status: row.status as string,
  };
}

function rowToHold(row: Record<string, unknown>): ActionHold {
  return {
    id: row.id as string,
    approvedActionId: row.approved_action_id as string,
    holdCode: row.hold_code as string,
    reason: row.reason as string,
  };
}

function rowToRelease(row: Record<string, unknown>): ActionRelease {
  return {
    id: row.id as string,
    actionHoldId: row.action_hold_id as string,
    releaseReason: row.release_reason as string,
  };
}

export class ActionControlGateRepository {
  async createGate(ctx: TenantContext, businessId: string, planVersionId: string, gateCode: string, gateType: string): Promise<ActionControlGate> {
    if (!GATE_TYPES.has(gateType)) {
      throw new ValidationError('ActionControlGate', [`unknown gate_type: ${gateType}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.action_control_gates (tenant_id, workspace_id, business_id, plan_version_id, gate_code, gate_type)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, planVersionId, gateCode, gateType]
      );
      return rowToGate(result.rows[0]);
    });
  }

  async recordEvaluation(ctx: TenantContext, controlGateId: string, businessId: string, passed: boolean, evaluatedValue?: unknown): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO approved_business_action.action_control_gate_evaluations (control_gate_id, tenant_id, workspace_id, business_id, passed, evaluated_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [controlGateId, ctx.tenantId, ctx.workspaceId, businessId, passed, evaluatedValue === undefined ? null : JSON.stringify(evaluatedValue)]
      );
    });
  }

  async transitionGateStatus(ctx: TenantContext, controlGateId: string, toStatus: string): Promise<ActionControlGate> {
    if (!GATE_STATUSES.includes(toStatus)) {
      throw new ValidationError('ActionControlGate', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE approved_business_action.action_control_gates SET status = $2 WHERE id = $1 RETURNING *`,
        [controlGateId, toStatus]
      );
      if (result.rows.length === 0) throw new ActionControlGateNotFoundError('ActionControlGate', controlGateId);
      return rowToGate(result.rows[0]);
    });
  }

  async placeHold(ctx: TenantContext, businessId: string, approvedActionId: string, holdCode: string, reason: string): Promise<ActionHold> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.action_holds (tenant_id, workspace_id, business_id, approved_action_id, hold_code, reason)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, approvedActionId, holdCode, reason]
      );
      return rowToHold(result.rows[0]);
    });
  }

  async releaseHold(ctx: TenantContext, businessId: string, actionHoldId: string, releaseReason: string): Promise<ActionRelease> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO approved_business_action.action_releases (tenant_id, workspace_id, business_id, action_hold_id, release_reason)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, actionHoldId, releaseReason]
      );
      return rowToRelease(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<ActionControlGate> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM approved_business_action.action_control_gates WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new ActionControlGateNotFoundError('ActionControlGate', id);
      return rowToGate(result.rows[0]);
    });
  }
}
