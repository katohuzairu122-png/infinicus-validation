import { withTransaction, withTenantTransaction, type TenantContext } from '../../client.js';
import { OnboardingNotFoundError, OnboardingStepOrderError, OnboardingAlreadyTerminalError } from './errors.js';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export type OnboardingStatus = 'in_progress' | 'completed' | 'abandoned';
export type OnboardingStep =
  | 'workspace_created' | 'business_created' | 'owner_assigned'
  | 'settings_applied' | 'invitations_sent' | 'completed';

/** Steps in strict forward order. current_step always holds the last completed step. */
export const STEP_ORDER: readonly OnboardingStep[] = [
  'workspace_created', 'business_created', 'owner_assigned',
  'settings_applied', 'invitations_sent', 'completed',
];

export interface OnboardingProgress {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  membershipId: string | null;
  initiatedBy: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  abandonedAt: Date | null;
}

function rowToProgress(row: Record<string, unknown>): OnboardingProgress {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string | null,
    membershipId: row.membership_id as string | null,
    initiatedBy: row.initiated_by as string,
    status: row.status as OnboardingStatus,
    currentStep: row.current_step as OnboardingStep,
    completedSteps: row.completed_steps as OnboardingStep[],
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    completedAt: row.completed_at as Date | null,
    abandonedAt: row.abandoned_at as Date | null,
  };
}

/**
 * Returns true if the target step was newly recorded, false if it was
 * already reached (idempotent retry — caller should treat this as success,
 * not re-run the underlying side effect). Throws OnboardingStepOrderError
 * if the target step's prerequisite has not been completed yet.
 */
function checkStepTransition(current: OnboardingStep, target: OnboardingStep): 'advance' | 'idempotent' {
  const currentIndex = STEP_ORDER.indexOf(current);
  const targetIndex = STEP_ORDER.indexOf(target);
  if (targetIndex <= currentIndex) return 'idempotent';
  if (targetIndex !== currentIndex + 1) throw new OnboardingStepOrderError(target, current);
  return 'advance';
}

export class OnboardingProgressRepository {
  /** Called once, immediately after the tenant + workspace rows are created (see OnboardingService.beginOnboarding). */
  async create(tenantId: string, workspaceId: string, initiatedBy: string): Promise<OnboardingProgress> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', initiatedBy]);
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO onboarding.tenant_onboarding (tenant_id, workspace_id, initiated_by, current_step, completed_steps)
         VALUES ($1,$2,$3,'workspace_created','["workspace_created"]') RETURNING *`,
        [tenantId, workspaceId, initiatedBy]
      );
      const progress = rowToProgress(result.rows[0]);
      await client.query('SELECT onboarding.emit_step_completed($1,$2,$3,$4,$5)', [
        tenantId, workspaceId, progress.id, 'workspace_created', progress.correlationId,
      ]);
      return progress;
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<OnboardingProgress> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM onboarding.tenant_onboarding WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new OnboardingNotFoundError('Onboarding', id);
      return rowToProgress(result.rows[0]);
    });
  }

  async getByTenant(ctx: TenantContext, tenantId: string): Promise<OnboardingProgress> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM onboarding.tenant_onboarding WHERE tenant_id = $1', [tenantId]);
      if (result.rows.length === 0) throw new OnboardingNotFoundError('Onboarding', tenantId);
      return rowToProgress(result.rows[0]);
    });
  }

  /**
   * Resume lookup: finds the caller's own in-progress attempt without
   * requiring tenant context to already be known.
   *
   * app.tenant_id is explicitly set to the nil UUID rather than left unset:
   * on a pooled connection that has previously participated in ANY
   * tenant-scoped transaction, a custom GUC set via `set_config(..., true)`
   * (SET LOCAL semantics) reverts to an empty string — not SQL NULL — once
   * the transaction ends, because Postgres treats a placeholder/custom GUC
   * as "known" to the backend for the rest of the session after its first
   * use. `current_setting('app.tenant_id', true)::uuid` then throws
   * (invalid uuid syntax: "") instead of evaluating to NULL. Setting a nil
   * UUID sentinel keeps the cast valid while still comparing false against
   * every real tenant id, so this policy's OR-fallback on initiated_by is
   * the only way rows become visible here — exactly as intended.
   */
  async getActiveForUser(userId: string): Promise<OnboardingProgress | null> {
    return withTransaction(async (client) => {
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', NIL_UUID]);
      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', userId]);
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM onboarding.tenant_onboarding WHERE initiated_by = $1 AND status = 'in_progress' ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      return result.rows.length === 0 ? null : rowToProgress(result.rows[0]);
    });
  }

  private async recordStep(
    ctx: TenantContext, id: string, step: OnboardingStep, columnAssignment: string, columnValue: string | null
  ): Promise<OnboardingProgress> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM onboarding.tenant_onboarding WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new OnboardingNotFoundError('Onboarding', id);
      const existing = rowToProgress(current.rows[0]);
      if (existing.status !== 'in_progress') throw new OnboardingAlreadyTerminalError(existing.status);

      const transition = checkStepTransition(existing.currentStep, step);
      if (transition === 'idempotent') return existing;

      const result = await client.query<Record<string, unknown>>(
        `UPDATE onboarding.tenant_onboarding
         SET current_step = $2, completed_steps = completed_steps || to_jsonb($2::text)${columnAssignment}
         WHERE id = $1 RETURNING *`,
        columnValue === null ? [id, step] : [id, step, columnValue]
      );
      const updated = rowToProgress(result.rows[0]);
      await client.query('SELECT onboarding.emit_step_completed($1,$2,$3,$4,$5)', [
        ctx.tenantId, ctx.workspaceId, id, step, updated.correlationId,
      ]);
      return updated;
    });
  }

  async recordBusinessCreated(ctx: TenantContext, id: string, businessId: string): Promise<OnboardingProgress> {
    return this.recordStep(ctx, id, 'business_created', ', business_id = $3', businessId);
  }

  async recordOwnerAssigned(ctx: TenantContext, id: string, membershipId: string): Promise<OnboardingProgress> {
    return this.recordStep(ctx, id, 'owner_assigned', ', membership_id = $3', membershipId);
  }

  async recordSettingsApplied(ctx: TenantContext, id: string): Promise<OnboardingProgress> {
    return this.recordStep(ctx, id, 'settings_applied', '', null);
  }

  async recordInvitationsSent(ctx: TenantContext, id: string): Promise<OnboardingProgress> {
    return this.recordStep(ctx, id, 'invitations_sent', '', null);
  }

  async markCompleted(ctx: TenantContext, id: string): Promise<OnboardingProgress> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM onboarding.tenant_onboarding WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new OnboardingNotFoundError('Onboarding', id);
      const existing = rowToProgress(current.rows[0]);
      if (existing.status === 'completed') return existing;
      if (existing.status === 'abandoned') throw new OnboardingAlreadyTerminalError(existing.status);
      if (existing.currentStep !== 'invitations_sent') {
        throw new OnboardingStepOrderError('completed', existing.currentStep);
      }

      const result = await client.query<Record<string, unknown>>(
        `UPDATE onboarding.tenant_onboarding
         SET status = 'completed', current_step = 'completed',
             completed_steps = completed_steps || '["completed"]', completed_at = now()
         WHERE id = $1 RETURNING *`,
        [id]
      );
      const updated = rowToProgress(result.rows[0]);
      await client.query('SELECT onboarding.emit_onboarding_completed($1,$2,$3,$4)', [
        ctx.tenantId, ctx.workspaceId, id, updated.correlationId,
      ]);
      return updated;
    });
  }

  async markAbandoned(ctx: TenantContext, id: string): Promise<OnboardingProgress> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM onboarding.tenant_onboarding WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new OnboardingNotFoundError('Onboarding', id);
      const existing = rowToProgress(current.rows[0]);
      if (existing.status !== 'in_progress') throw new OnboardingAlreadyTerminalError(existing.status);

      const result = await client.query<Record<string, unknown>>(
        `UPDATE onboarding.tenant_onboarding SET status = 'abandoned', abandoned_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
      const updated = rowToProgress(result.rows[0]);
      await client.query('SELECT onboarding.emit_onboarding_abandoned($1,$2,$3,$4)', [
        ctx.tenantId, ctx.workspaceId, id, updated.correlationId,
      ]);
      return updated;
    });
  }
}
