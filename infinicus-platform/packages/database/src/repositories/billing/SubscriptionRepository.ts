import { withTenantTransaction, type TenantContext } from '../../client.js';
import { SubscriptionNotFoundError, SubscriptionAlreadyExistsError, InvalidSubscriptionTransitionError } from './errors.js';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'grace_period' | 'suspended' | 'canceled';
export type PaymentStatus = 'unknown' | 'paid' | 'pending' | 'failed';

export interface Subscription {
  id: string;
  tenantId: string;
  workspaceId: string;
  planId: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gracePeriodEndsAt: Date | null;
  paymentStatus: PaymentStatus;
  externalInvoiceReference: string | null;
  canceledAt: Date | null;
  suspendedAt: Date | null;
  reactivatedAt: Date | null;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionStatusHistoryEntry {
  id: string;
  subscriptionId: string;
  fromStatus: SubscriptionStatus | null;
  toStatus: SubscriptionStatus;
  reason: string | null;
  occurredAt: Date;
}

export interface CreateSubscriptionInput {
  planId: string;
  trialDays: number;
}

export interface TransitionStatusOptions {
  gracePeriodEndsAt?: Date | null;
  paymentStatus?: PaymentStatus;
  externalInvoiceReference?: string | null;
}

/** Every legal next status for a given current status — an out-of-list target is rejected fail-closed. */
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trialing:     ['active', 'past_due', 'grace_period', 'suspended', 'canceled'],
  active:       ['past_due', 'grace_period', 'suspended', 'canceled'],
  past_due:     ['active', 'grace_period', 'suspended', 'canceled'],
  grace_period: ['active', 'suspended', 'canceled'],
  suspended:    ['active', 'canceled'],
  canceled:     [],
};

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    planId: row.plan_id as string,
    status: row.status as SubscriptionStatus,
    trialEndsAt: row.trial_ends_at as Date | null,
    currentPeriodStart: row.current_period_start as Date,
    currentPeriodEnd: row.current_period_end as Date,
    gracePeriodEndsAt: row.grace_period_ends_at as Date | null,
    paymentStatus: row.payment_status as PaymentStatus,
    externalInvoiceReference: row.external_invoice_reference as string | null,
    canceledAt: row.canceled_at as Date | null,
    suspendedAt: row.suspended_at as Date | null,
    reactivatedAt: row.reactivated_at as Date | null,
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function rowToHistoryEntry(row: Record<string, unknown>): SubscriptionStatusHistoryEntry {
  return {
    id: row.id as string,
    subscriptionId: row.subscription_id as string,
    fromStatus: row.from_status as SubscriptionStatus | null,
    toStatus: row.to_status as SubscriptionStatus,
    reason: row.reason as string | null,
    occurredAt: row.occurred_at as Date,
  };
}

export class SubscriptionRepository {
  /** One subscription per tenant — throws SubscriptionAlreadyExistsError on a second call for the same tenant. */
  async create(ctx: TenantContext, input: CreateSubscriptionInput): Promise<Subscription> {
    return withTenantTransaction(ctx, async (client) => {
      const existing = await client.query('SELECT id FROM billing.subscriptions WHERE tenant_id = $1', [ctx.tenantId]);
      if (existing.rows.length > 0) throw new SubscriptionAlreadyExistsError('Subscription', ctx.tenantId);

      const now = new Date();
      const currentPeriodEnd = new Date(now);
      currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + 1);
      const trialEndsAt = input.trialDays > 0 ? new Date(now.getTime() + input.trialDays * 86_400_000) : null;
      const initialStatus: SubscriptionStatus = input.trialDays > 0 ? 'trialing' : 'active';

      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO billing.subscriptions
           (tenant_id, workspace_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, input.planId, initialStatus, trialEndsAt, now, currentPeriodEnd]
      );
      const subscription = rowToSubscription(result.rows[0]);

      await client.query(
        `INSERT INTO billing.subscription_status_history (tenant_id, subscription_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,NULL,$3,$4,$5)`,
        [ctx.tenantId, subscription.id, initialStatus, 'subscription_created', subscription.correlationId]
      );
      await client.query('SELECT billing.emit_subscription_status_changed($1,$2,$3,$4,$5,$6)', [
        ctx.tenantId, ctx.workspaceId, subscription.id, null, initialStatus, subscription.correlationId,
      ]);

      return subscription;
    });
  }

  async getByTenant(ctx: TenantContext): Promise<Subscription> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM billing.subscriptions WHERE tenant_id = $1', [ctx.tenantId]
      );
      if (result.rows.length === 0) throw new SubscriptionNotFoundError('Subscription', ctx.tenantId);
      return rowToSubscription(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<Subscription> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM billing.subscriptions WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new SubscriptionNotFoundError('Subscription', id);
      return rowToSubscription(result.rows[0]);
    });
  }

  /**
   * Fail-closed status transition: rejects any target not explicitly
   * allowed from the current status (ALLOWED_TRANSITIONS above). A
   * request to move to the subscription's own current status is treated
   * as an idempotent no-op (returns the unchanged row without writing a
   * new history entry) rather than an error, matching the idempotency
   * convention used by onboarding's step transitions.
   */
  async transitionStatus(
    ctx: TenantContext, id: string, toStatus: SubscriptionStatus, reason: string, opts: TransitionStatusOptions = {}
  ): Promise<Subscription> {
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM billing.subscriptions WHERE id = $1', [id]);
      if (current.rows.length === 0) throw new SubscriptionNotFoundError('Subscription', id);
      const existing = rowToSubscription(current.rows[0]);
      if (existing.status === toStatus) return existing;
      if (!ALLOWED_TRANSITIONS[existing.status].includes(toStatus)) {
        throw new InvalidSubscriptionTransitionError(existing.status, toStatus);
      }

      const setClauses: string[] = ['status = $2'];
      const params: unknown[] = [id, toStatus];
      if (toStatus === 'suspended') setClauses.push('suspended_at = now()');
      if (toStatus === 'active' && existing.status === 'suspended') setClauses.push('reactivated_at = now()');
      if (toStatus === 'canceled') setClauses.push('canceled_at = now()');
      if (opts.gracePeriodEndsAt !== undefined) {
        params.push(opts.gracePeriodEndsAt);
        setClauses.push(`grace_period_ends_at = $${params.length}`);
      }
      if (opts.paymentStatus !== undefined) {
        params.push(opts.paymentStatus);
        setClauses.push(`payment_status = $${params.length}`);
      }
      if (opts.externalInvoiceReference !== undefined) {
        params.push(opts.externalInvoiceReference);
        setClauses.push(`external_invoice_reference = $${params.length}`);
      }

      const result = await client.query<Record<string, unknown>>(
        `UPDATE billing.subscriptions SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params
      );
      const updated = rowToSubscription(result.rows[0]);

      await client.query(
        `INSERT INTO billing.subscription_status_history (tenant_id, subscription_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [ctx.tenantId, id, existing.status, toStatus, reason, updated.correlationId]
      );
      await client.query('SELECT billing.emit_subscription_status_changed($1,$2,$3,$4,$5,$6)', [
        ctx.tenantId, ctx.workspaceId, id, existing.status, toStatus, updated.correlationId,
      ]);

      return updated;
    });
  }

  async listStatusHistory(ctx: TenantContext, subscriptionId: string): Promise<SubscriptionStatusHistoryEntry[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM billing.subscription_status_history WHERE subscription_id = $1 ORDER BY occurred_at', [subscriptionId]
      );
      return result.rows.map(rowToHistoryEntry);
    });
  }

  /**
   * Records a payment result without necessarily changing the
   * subscription's lifecycle `status` — payment_status and status are
   * deliberately independent fields (a 'pending' payment shouldn't force
   * a lifecycle transition, and transitionStatus()'s idempotent no-op
   * branch would otherwise silently skip a payment_status update whose
   * target lifecycle status happens to already match). Lifecycle
   * consequences of a payment result (e.g. moving to grace_period on
   * failure, back to active on success) are the caller's (EntitlementService's)
   * responsibility, via a separate transitionStatus() call.
   */
  async recordPayment(
    ctx: TenantContext, id: string, paymentStatus: PaymentStatus, externalInvoiceReference: string | null
  ): Promise<Subscription> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE billing.subscriptions SET payment_status = $2, external_invoice_reference = $3 WHERE id = $1 RETURNING *`,
        [id, paymentStatus, externalInvoiceReference]
      );
      if (result.rows.length === 0) throw new SubscriptionNotFoundError('Subscription', id);
      return rowToSubscription(result.rows[0]);
    });
  }
}
