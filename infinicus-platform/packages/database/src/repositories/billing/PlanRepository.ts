import { query } from '../../client.js';
import { PlanNotFoundError } from './errors.js';

export interface Plan {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  priceCents: number;
  currency: string;
  billingInterval: string;
  trialDays: number;
  /** A `null` value for a given key means "unlimited" for that metric/resource. */
  limits: Record<string, number | null>;
  features: Record<string, boolean>;
  isActive: boolean;
}

function rowToPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    sortOrder: row.sort_order as number,
    priceCents: row.price_cents as number,
    currency: row.currency as string,
    billingInterval: row.billing_interval as string,
    trialDays: row.trial_days as number,
    limits: row.limits as Record<string, number | null>,
    features: row.features as Record<string, boolean>,
    isActive: row.is_active as boolean,
  };
}

/**
 * billing.plans is global reference/catalog data with no tenant scope and
 * no RLS (like tenancy.permissions) — every method here uses the plain
 * `query()` helper, not a tenant transaction.
 */
export class PlanRepository {
  async listActive(): Promise<Plan[]> {
    const result = await query<Record<string, unknown>>(
      'SELECT * FROM billing.plans WHERE is_active ORDER BY sort_order'
    );
    return result.rows.map(rowToPlan);
  }

  async getByCode(code: string): Promise<Plan> {
    const result = await query<Record<string, unknown>>('SELECT * FROM billing.plans WHERE code = $1', [code]);
    if (result.rows.length === 0) throw new PlanNotFoundError('Plan', code);
    return rowToPlan(result.rows[0]);
  }

  async getById(id: string): Promise<Plan> {
    const result = await query<Record<string, unknown>>('SELECT * FROM billing.plans WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new PlanNotFoundError('Plan', id);
    return rowToPlan(result.rows[0]);
  }
}
