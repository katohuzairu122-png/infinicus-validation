import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';

export type BusinessEventType = 'sale' | 'expense' | 'inventory' | 'customer' | 'team';
export type BusinessEventAction = 'new' | 'return' | 'churn' | 'hire' | 'fire' | 'review';

export interface LogBusinessEventInput {
  businessId: string;
  eventType: BusinessEventType;
  amount?: number;
  quantity?: number;
  category?: string;
  customerId?: string;
  memberId?: string;
  action?: BusinessEventAction;
  notes?: string;
  correlationId?: string;
}

export interface BusinessEvent {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  eventType: BusinessEventType;
  amount: number | null;
  quantity: number | null;
  category: string | null;
  customerId: string | null;
  memberId: string | null;
  action: BusinessEventAction | null;
  notes: string | null;
  occurredAt: Date;
  correlationId: string;
  createdAt: Date;
}

export interface SalesAggregate {
  transactionCount: number;
  totalRevenue: number;
  totalUnits: number;
  avgSaleValue: number;
  topCustomer: { id: string; spend: number } | null;
}

export interface ExpensesAggregate {
  transactionCount: number;
  totalSpend: number;
  avgExpense: number;
  burnRatePerDay: number;
  byCategory: { category: string; amount: number; count: number }[];
}

export interface InventoryAggregate {
  netUnitsDelta: number;
  totalCogs: number;
  topItems: { item: string; netUnits: number }[];
}

export interface CustomersAggregate {
  newCustomers: number;
  returning: number;
  churned: number;
  churnRatePct: number;
  avgLtv: number;
}

export interface TeamAggregate {
  hired: number;
  fired: number;
  netHeadcountDelta: number;
  performanceReviews: number;
  totalHoursLogged: number;
}

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function rowToEvent(row: Record<string, unknown>): BusinessEvent {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    eventType: row.event_type as BusinessEventType,
    amount: row.amount === null ? null : parseFloat(String(row.amount)),
    quantity: row.quantity === null ? null : parseFloat(String(row.quantity)),
    category: row.category as string | null,
    customerId: row.customer_id as string | null,
    memberId: row.member_id as string | null,
    action: row.action as BusinessEventAction | null,
    notes: row.notes as string | null,
    occurredAt: row.occurred_at as Date,
    correlationId: row.correlation_id as string,
    createdAt: row.created_at as Date,
  };
}

/**
 * Append-only operational event ledger — the Postgres equivalent of the
 * legacy Cloudflare D1 `business_events` table (functions/api/business/
 * events.js / summary.js / twin.js). Aggregation methods here are direct
 * ports of summary.js's and twin.js's queries, used by both the Operations
 * KPI summary route (arbitrary date range) and TwinComputationService (a
 * fixed 30-day window) — same queries, different date arguments.
 */
export class BusinessEventRepository {
  async logEvent(ctx: TenantContext, input: LogBusinessEventInput): Promise<BusinessEvent> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.business_events
           (tenant_id, workspace_id, business_id, event_type, amount, quantity,
            category, customer_id, member_id, action, notes, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId,
          input.businessId, input.eventType,
          input.amount ?? null, input.quantity ?? null,
          input.category ?? null, input.customerId ?? null,
          input.memberId ?? null, input.action ?? null,
          input.notes ?? null,
          input.correlationId ?? randomUUID(),
        ]
      );
      return rowToEvent(result.rows[0]);
    });
  }

  async aggregateSales(ctx: TenantContext, businessId: string, from: Date, to: Date): Promise<SalesAggregate> {
    return withTenantTransaction(ctx, async (client) => {
      const totals = await client.query<Record<string, unknown>>(
        `SELECT
           COUNT(*)                    AS transaction_count,
           COALESCE(SUM(amount), 0)    AS total_revenue,
           COALESCE(SUM(quantity), 0)  AS total_units,
           COALESCE(AVG(amount), 0)    AS avg_sale_value
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'sale' AND occurred_at BETWEEN $2 AND $3`,
        [businessId, from, to]
      );
      const topCustomer = await client.query<Record<string, unknown>>(
        `SELECT customer_id, SUM(amount) AS total_spend
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'sale' AND customer_id IS NOT NULL
           AND occurred_at BETWEEN $2 AND $3
         GROUP BY customer_id
         ORDER BY total_spend DESC
         LIMIT 1`,
        [businessId, from, to]
      );
      const t = totals.rows[0];
      const top = topCustomer.rows[0];
      return {
        transactionCount: Number(t?.transaction_count ?? 0),
        totalRevenue: round2(Number(t?.total_revenue ?? 0)),
        totalUnits: round2(Number(t?.total_units ?? 0)),
        avgSaleValue: round2(Number(t?.avg_sale_value ?? 0)),
        topCustomer: top ? { id: top.customer_id as string, spend: round2(Number(top.total_spend)) } : null,
      };
    });
  }

  async aggregateExpenses(ctx: TenantContext, businessId: string, from: Date, to: Date): Promise<ExpensesAggregate> {
    return withTenantTransaction(ctx, async (client) => {
      const totals = await client.query<Record<string, unknown>>(
        `SELECT
           COUNT(*)                 AS transaction_count,
           COALESCE(SUM(amount), 0) AS total_spend,
           COALESCE(AVG(amount), 0) AS avg_expense
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'expense' AND occurred_at BETWEEN $2 AND $3`,
        [businessId, from, to]
      );
      const byCategory = await client.query<Record<string, unknown>>(
        `SELECT COALESCE(category, 'uncategorized') AS category, SUM(amount) AS amount, COUNT(*) AS count
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'expense' AND occurred_at BETWEEN $2 AND $3
         GROUP BY category
         ORDER BY amount DESC`,
        [businessId, from, to]
      );
      const t = totals.rows[0];
      const totalSpend = Number(t?.total_spend ?? 0);
      const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
      return {
        transactionCount: Number(t?.transaction_count ?? 0),
        totalSpend: round2(totalSpend),
        avgExpense: round2(Number(t?.avg_expense ?? 0)),
        burnRatePerDay: round2(totalSpend / days),
        byCategory: byCategory.rows.map((r) => ({
          category: r.category as string,
          amount: round2(Number(r.amount)),
          count: Number(r.count),
        })),
      };
    });
  }

  async aggregateInventory(ctx: TenantContext, businessId: string, from: Date, to: Date): Promise<InventoryAggregate> {
    return withTenantTransaction(ctx, async (client) => {
      const totals = await client.query<Record<string, unknown>>(
        `SELECT
           COALESCE(SUM(quantity), 0) AS net_units_delta,
           COALESCE(SUM(CASE WHEN amount IS NOT NULL THEN quantity * amount ELSE 0 END), 0) AS total_cogs
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'inventory' AND occurred_at BETWEEN $2 AND $3`,
        [businessId, from, to]
      );
      const byItem = await client.query<Record<string, unknown>>(
        `SELECT COALESCE(category, 'unnamed') AS item, SUM(quantity) AS net_units
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'inventory' AND occurred_at BETWEEN $2 AND $3
         GROUP BY category
         ORDER BY net_units DESC
         LIMIT 10`,
        [businessId, from, to]
      );
      const t = totals.rows[0];
      return {
        netUnitsDelta: round2(Number(t?.net_units_delta ?? 0)),
        totalCogs: round2(Number(t?.total_cogs ?? 0)),
        topItems: byItem.rows.map((r) => ({ item: r.item as string, netUnits: round2(Number(r.net_units)) })),
      };
    });
  }

  async aggregateCustomers(ctx: TenantContext, businessId: string, from: Date, to: Date): Promise<CustomersAggregate> {
    return withTenantTransaction(ctx, async (client) => {
      const counts = await client.query<Record<string, unknown>>(
        `SELECT action, COUNT(*) AS cnt
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'customer' AND occurred_at BETWEEN $2 AND $3
         GROUP BY action`,
        [businessId, from, to]
      );
      const map: Record<string, number> = {};
      for (const r of counts.rows) map[r.action as string] = Number(r.cnt);
      const newCount = map['new'] ?? 0;
      const returning = map['return'] ?? 0;
      const churned = map['churn'] ?? 0;
      const active = newCount + returning;

      const ltv = await client.query<Record<string, unknown>>(
        `SELECT AVG(customer_total) AS avg_ltv FROM (
           SELECT customer_id, SUM(amount) AS customer_total
           FROM business_operations.business_events
           WHERE business_id = $1 AND event_type = 'sale' AND customer_id IS NOT NULL
             AND occurred_at BETWEEN $2 AND $3
           GROUP BY customer_id
         ) sub`,
        [businessId, from, to]
      );

      return {
        newCustomers: newCount,
        returning,
        churned,
        churnRatePct: active > 0 ? round2((churned / active) * 100) : 0,
        avgLtv: round2(Number(ltv.rows[0]?.avg_ltv ?? 0)),
      };
    });
  }

  async aggregateTeam(ctx: TenantContext, businessId: string, from: Date, to: Date): Promise<TeamAggregate> {
    return withTenantTransaction(ctx, async (client) => {
      const counts = await client.query<Record<string, unknown>>(
        `SELECT action, COUNT(*) AS cnt
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'team' AND occurred_at BETWEEN $2 AND $3
         GROUP BY action`,
        [businessId, from, to]
      );
      const map: Record<string, number> = {};
      for (const r of counts.rows) map[r.action as string] = Number(r.cnt);
      const hired = map['hire'] ?? 0;
      const fired = map['fire'] ?? 0;
      const reviews = map['review'] ?? 0;

      const hoursRow = await client.query<Record<string, unknown>>(
        `SELECT COALESCE(SUM(quantity), 0) AS total_hours
         FROM business_operations.business_events
         WHERE business_id = $1 AND event_type = 'team' AND quantity IS NOT NULL
           AND occurred_at BETWEEN $2 AND $3`,
        [businessId, from, to]
      );

      return {
        hired,
        fired,
        netHeadcountDelta: hired - fired,
        performanceReviews: reviews,
        totalHoursLogged: round2(Number(hoursRow.rows[0]?.total_hours ?? 0)),
      };
    });
  }
}
