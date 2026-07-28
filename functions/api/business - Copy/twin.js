// /api/business/twin — INFINICUS ENGINE v3
//
// Digital Twin: a TTL-cached snapshot of a business's current state.
// Built from the D1 event stream — never fabricated data.
//
// GET  ?business_id=ID               → return cached twin or rebuild
// POST body: { business_id }         → force-refresh the cache
//
// Cache stored in KV as `twin:{businessId}` with 1-hour TTL.
// The handoff explicitly required distinguishing "business not found" (404)
// from "a real DB error occurred" (500) — both cases are handled separately.
//
// Bindings required: INFINICUS_DB (D1), INFINICUS_USERS (KV for cache)

import { makeRateLimiter, getIP } from '../../_shared/rateLimit.js';

const rlGet  = makeRateLimiter(60, 60 * 60 * 1000); // 60 reads/hour
const rlPost = makeRateLimiter(20, 60 * 60 * 1000); // 20 force-refreshes/hour (own tier)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const TWIN_TTL_SEC = 60 * 60; // 1 hour
const LOOKBACK_MS  = 30 * 24 * 60 * 60 * 1000; // 30-day window for snapshot

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── GET — return cached twin or rebuild ───────────────────────────────────────

export async function onRequestGet({ request, env }) {
  if (!rlGet.check(getIP(request))) return rlGet.response();

  const db = env.INFINICUS_DB;
  const kv = env.INFINICUS_USERS;
  if (!db || !kv) return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });

  const business_id = (new URL(request.url).searchParams.get('business_id') || '').trim();
  if (!business_id) {
    return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });
  }

  // Check cache first
  const cacheKey = `twin:${business_id}`;
  const cached = await kv.get(cacheKey, 'json');
  if (cached) {
    return Response.json({ ok: true, twin: cached, cached: true }, { status: 200, headers: CORS });
  }

  // Cache miss — rebuild from D1
  return buildAndCache({ db, kv, business_id, cacheKey });
}

// ── POST — force-refresh the twin ────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  if (!rlPost.check(getIP(request))) return rlPost.response();

  const db = env.INFINICUS_DB;
  const kv = env.INFINICUS_USERS;
  if (!db || !kv) return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch { /* fall through */ }

  const business_id = (body.business_id || '').trim();
  if (!business_id) {
    return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });
  }

  const cacheKey = `twin:${business_id}`;
  return buildAndCache({ db, kv, business_id, cacheKey });
}

// ── Core: build twin from D1 and write to KV ─────────────────────────────────

async function buildAndCache({ db, kv, business_id, cacheKey }) {
  // Step 1: confirm the business exists — separate from DB errors
  let biz;
  try {
    biz = await db.prepare('SELECT * FROM businesses WHERE id = ?').bind(business_id).first();
  } catch (e) {
    console.error('twin: DB error fetching business:', e);
    // Distinguishing DB error (500) from not-found (404) — handoff required this
    return Response.json({ ok: false, error: 'Database error fetching business.' }, { status: 500, headers: CORS });
  }

  if (!biz) {
    return Response.json({ ok: false, error: 'Business not found.' }, { status: 404, headers: CORS });
  }

  const now     = Date.now();
  const from_ms = now - LOOKBACK_MS;

  // Step 2: run aggregations — each query failure is caught separately
  let financial = {}, operations = {}, customers = {}, team = {};

  try {
    // Financial state
    const [salesRow, expRow] = await Promise.all([
      db.prepare(`
        SELECT COALESCE(SUM(amount),0) AS revenue, COUNT(*) AS tx
        FROM business_events
        WHERE business_id=? AND event_type='sale' AND created_at>=?
      `).bind(business_id, from_ms).first(),
      db.prepare(`
        SELECT COALESCE(SUM(amount),0) AS spend
        FROM business_events
        WHERE business_id=? AND event_type='expense' AND created_at>=?
      `).bind(business_id, from_ms).first(),
    ]);
    const revenue = salesRow?.revenue ?? 0;
    const spend   = expRow?.spend ?? 0;
    const days    = LOOKBACK_MS / 86_400_000;
    financial = {
      revenue_30d:      round2(revenue),
      expenses_30d:     round2(spend),
      profit_30d:       round2(revenue - spend),
      burn_rate_per_day: round2(spend / days),
      sales_count_30d:  salesRow?.tx ?? 0,
    };
  } catch (e) {
    console.error('twin: financial aggregation error:', e);
    return Response.json({ ok: false, error: 'Database error building twin (financial).' }, { status: 500, headers: CORS });
  }

  try {
    // Customer state
    const custCounts = await db.prepare(`
      SELECT action, COUNT(*) AS cnt
      FROM business_events
      WHERE business_id=? AND event_type='customer' AND created_at>=?
      GROUP BY action
    `).bind(business_id, from_ms).all();

    const cmap = {};
    for (const r of (custCounts.results || [])) cmap[r.action] = r.cnt;
    const newC    = cmap['new']    ?? 0;
    const retC    = cmap['return'] ?? 0;
    const churnC  = cmap['churn']  ?? 0;
    const active  = newC + retC;
    customers = {
      new_30d:       newC,
      returning_30d: retC,
      churned_30d:   churnC,
      churn_rate_pct: active > 0 ? round2((churnC / active) * 100) : 0,
    };
  } catch (e) {
    console.error('twin: customer aggregation error:', e);
    return Response.json({ ok: false, error: 'Database error building twin (customers).' }, { status: 500, headers: CORS });
  }

  try {
    // Operations: inventory
    const invRow = await db.prepare(`
      SELECT COALESCE(SUM(quantity),0) AS net_units
      FROM business_events
      WHERE business_id=? AND event_type='inventory' AND created_at>=?
    `).bind(business_id, from_ms).first();
    operations = { net_inventory_units_30d: round2(invRow?.net_units ?? 0) };
  } catch (e) {
    console.error('twin: operations aggregation error:', e);
    return Response.json({ ok: false, error: 'Database error building twin (operations).' }, { status: 500, headers: CORS });
  }

  try {
    // Team
    const teamCounts = await db.prepare(`
      SELECT action, COUNT(*) AS cnt
      FROM business_events
      WHERE business_id=? AND event_type='team' AND created_at>=?
      GROUP BY action
    `).bind(business_id, from_ms).all();

    const tmap = {};
    for (const r of (teamCounts.results || [])) tmap[r.action] = r.cnt;
    team = {
      hired_30d:           tmap['hire']   ?? 0,
      terminated_30d:      tmap['fire']   ?? 0,
      net_headcount_delta: (tmap['hire'] ?? 0) - (tmap['fire'] ?? 0),
    };
  } catch (e) {
    console.error('twin: team aggregation error:', e);
    return Response.json({ ok: false, error: 'Database error building twin (team).' }, { status: 500, headers: CORS });
  }

  // Step 3: compose twin snapshot
  const twin = {
    business_id,
    business_name: biz.name,
    industry:      biz.industry,
    snapshot_at:   now,
    window_days:   30,
    financial,
    customers,
    operations,
    team,
  };

  // Step 4: write to KV cache (separate try so a cache failure ≠ 404)
  try {
    await kv.put(cacheKey, JSON.stringify(twin), { expirationTtl: TWIN_TTL_SEC });
  } catch (e) {
    console.error('twin: KV cache write failed:', e);
    // Return the twin anyway — the real error is 500, not 404
    return Response.json({ ok: true, twin, cached: false, cache_warning: 'Cache write failed.' }, { status: 200, headers: CORS });
  }

  return Response.json({ ok: true, twin, cached: false }, { status: 200, headers: CORS });
}

function round2(n) { return Math.round((n || 0) * 100) / 100; }
