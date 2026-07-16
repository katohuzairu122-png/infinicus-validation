// /api/business/summary
//
// GET ?business_id=ID&from=<ms>&to=<ms>
//
// Returns 5 aggregation modules in one response:
//   sales       — total revenue, units, avg sale, top customer
//   expenses    — total spend, by category, burn rate
//   inventory   — net stock delta, total COGS
//   customers   — new / returning / churned counts, simple LTV, churn rate
//   team        — headcount delta, total hours logged
//
// D1 binding required: INFINICUS_DB

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'DB not configured.' }, { status: 500, headers: CORS });

  const url         = new URL(request.url);
  const business_id = (url.searchParams.get('business_id') || '').trim();
  const from_ms     = parseInt(url.searchParams.get('from') || '0', 10);
  const to_ms       = parseInt(url.searchParams.get('to')   || String(Date.now()), 10);

  if (!business_id) {
    return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });
  }

  // Verify business exists
  const biz = await db.prepare('SELECT id FROM businesses WHERE id = ?').bind(business_id).first();
  if (!biz) {
    return Response.json({ ok: false, error: 'Business not found.' }, { status: 404, headers: CORS });
  }

  // Run all 5 aggregations in parallel
  const [salesRes, expensesRes, inventoryRes, customersRes, teamRes] = await Promise.all([
    aggregateSales(db, business_id, from_ms, to_ms),
    aggregateExpenses(db, business_id, from_ms, to_ms),
    aggregateInventory(db, business_id, from_ms, to_ms),
    aggregateCustomers(db, business_id, from_ms, to_ms),
    aggregateTeam(db, business_id, from_ms, to_ms),
  ]);

  const days = Math.max(1, Math.round((to_ms - from_ms) / 86_400_000));

  return Response.json({
    ok: true,
    business_id,
    period: { from_ms, to_ms, days },
    summary: {
      sales:     salesRes,
      expenses:  expensesRes,
      inventory: inventoryRes,
      customers: customersRes,
      team:      teamRes,
    },
  }, { status: 200, headers: CORS });
}

// ── 1. Sales ──────────────────────────────────────────────────────────────────

async function aggregateSales(db, business_id, from_ms, to_ms) {
  const row = await db.prepare(`
    SELECT
      COUNT(*)          AS transaction_count,
      COALESCE(SUM(amount),   0) AS total_revenue,
      COALESCE(SUM(quantity), 0) AS total_units,
      COALESCE(AVG(amount),   0) AS avg_sale_value
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'sale'
      AND created_at BETWEEN ? AND ?
  `).bind(business_id, from_ms, to_ms).first();

  // Top customer by total spend
  const topCustomer = await db.prepare(`
    SELECT customer_id, SUM(amount) AS total_spend
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'sale'
      AND customer_id IS NOT NULL
      AND created_at BETWEEN ? AND ?
    GROUP BY customer_id
    ORDER BY total_spend DESC
    LIMIT 1
  `).bind(business_id, from_ms, to_ms).first();

  return {
    transaction_count: row?.transaction_count ?? 0,
    total_revenue:     round2(row?.total_revenue  ?? 0),
    total_units:       round2(row?.total_units    ?? 0),
    avg_sale_value:    round2(row?.avg_sale_value ?? 0),
    top_customer:      topCustomer ? { id: topCustomer.customer_id, spend: round2(topCustomer.total_spend) } : null,
  };
}

// ── 2. Expenses ───────────────────────────────────────────────────────────────

async function aggregateExpenses(db, business_id, from_ms, to_ms) {
  const totals = await db.prepare(`
    SELECT
      COUNT(*)               AS transaction_count,
      COALESCE(SUM(amount),  0) AS total_spend,
      COALESCE(AVG(amount),  0) AS avg_expense
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'expense'
      AND created_at BETWEEN ? AND ?
  `).bind(business_id, from_ms, to_ms).first();

  const byCategory = await db.prepare(`
    SELECT
      COALESCE(category, 'uncategorized') AS category,
      SUM(amount) AS amount,
      COUNT(*)    AS count
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'expense'
      AND created_at BETWEEN ? AND ?
    GROUP BY category
    ORDER BY amount DESC
  `).bind(business_id, from_ms, to_ms).all();

  const days      = Math.max(1, Math.round((to_ms - from_ms) / 86_400_000));
  const burnRateDay = (totals?.total_spend ?? 0) / days;

  return {
    transaction_count: totals?.transaction_count ?? 0,
    total_spend:       round2(totals?.total_spend ?? 0),
    avg_expense:       round2(totals?.avg_expense ?? 0),
    burn_rate_per_day: round2(burnRateDay),
    by_category:       (byCategory.results || []).map(r => ({
      category: r.category,
      amount:   round2(r.amount),
      count:    r.count,
    })),
  };
}

// ── 3. Inventory ──────────────────────────────────────────────────────────────

async function aggregateInventory(db, business_id, from_ms, to_ms) {
  const row = await db.prepare(`
    SELECT
      COALESCE(SUM(quantity), 0) AS net_units_delta,
      COALESCE(SUM(CASE WHEN amount IS NOT NULL THEN quantity * amount ELSE 0 END), 0) AS total_cogs
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'inventory'
      AND created_at BETWEEN ? AND ?
  `).bind(business_id, from_ms, to_ms).first();

  const byItem = await db.prepare(`
    SELECT
      COALESCE(category, 'unnamed') AS item,
      SUM(quantity) AS net_units
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'inventory'
      AND created_at BETWEEN ? AND ?
    GROUP BY category
    ORDER BY net_units DESC
    LIMIT 10
  `).bind(business_id, from_ms, to_ms).all();

  return {
    net_units_delta: round2(row?.net_units_delta ?? 0),
    total_cogs:      round2(row?.total_cogs ?? 0),
    top_items:       (byItem.results || []).map(r => ({ item: r.item, net_units: round2(r.net_units) })),
  };
}

// ── 4. Customers ──────────────────────────────────────────────────────────────

async function aggregateCustomers(db, business_id, from_ms, to_ms) {
  const counts = await db.prepare(`
    SELECT
      action,
      COUNT(*) AS cnt
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'customer'
      AND created_at BETWEEN ? AND ?
    GROUP BY action
  `).bind(business_id, from_ms, to_ms).all();

  const map = {};
  for (const r of (counts.results || [])) map[r.action] = r.cnt;

  const newCount     = map['new']    ?? 0;
  const returnCount  = map['return'] ?? 0;
  const churnCount   = map['churn']  ?? 0;
  const totalActive  = newCount + returnCount;
  const churnRate    = totalActive > 0 ? round2((churnCount / totalActive) * 100) : 0;

  // Simple LTV: avg revenue per unique customer who made any purchase
  const ltv = await db.prepare(`
    SELECT AVG(customer_total) AS avg_ltv FROM (
      SELECT customer_id, SUM(amount) AS customer_total
      FROM business_events
      WHERE business_id = ?
        AND event_type  = 'sale'
        AND customer_id IS NOT NULL
        AND created_at BETWEEN ? AND ?
      GROUP BY customer_id
    )
  `).bind(business_id, from_ms, to_ms).first();

  return {
    new_customers:    newCount,
    returning:        returnCount,
    churned:          churnCount,
    churn_rate_pct:   churnRate,
    avg_ltv:          round2(ltv?.avg_ltv ?? 0),
  };
}

// ── 5. Team ───────────────────────────────────────────────────────────────────

async function aggregateTeam(db, business_id, from_ms, to_ms) {
  const counts = await db.prepare(`
    SELECT
      action,
      COUNT(*) AS cnt
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'team'
      AND created_at BETWEEN ? AND ?
    GROUP BY action
  `).bind(business_id, from_ms, to_ms).all();

  const map = {};
  for (const r of (counts.results || [])) map[r.action] = r.cnt;

  const hired  = map['hire']   ?? 0;
  const fired  = map['fire']   ?? 0;
  const reviews = map['review'] ?? 0;

  const hoursRow = await db.prepare(`
    SELECT COALESCE(SUM(quantity), 0) AS total_hours
    FROM business_events
    WHERE business_id = ?
      AND event_type  = 'team'
      AND quantity IS NOT NULL
      AND created_at BETWEEN ? AND ?
  `).bind(business_id, from_ms, to_ms).first();

  return {
    hired,
    fired,
    net_headcount_delta: hired - fired,
    performance_reviews: reviews,
    total_hours_logged:  round2(hoursRow?.total_hours ?? 0),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n) { return Math.round((n || 0) * 100) / 100; }
