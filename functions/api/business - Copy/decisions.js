// /api/business/decisions — INFINICUS ENGINE v3
//
// Decision Intelligence: AI-suggested business decisions grounded in real data.
// Never fabricates numbers — Expected Outcome is derived from the twin snapshot,
// not invented. Decision Memory tracks choices and actual outcomes over time.
//
// POST /api/business/decisions/recommend
//   body: { business_id }
//   → reads Digital Twin, calls Anthropic to generate decisions grounded in data
//   Rate: 10/hour (live Anthropic cost)
//
// POST /api/business/decisions/record-choice
//   body: { decision_id, chosen: true|false }
//   → marks a decision as chosen or declined
//
// POST /api/business/decisions/record-outcome
//   body: { decision_id, outcome_notes }
//   → records the actual result of a chosen decision
//
// GET /api/business/decisions/history?business_id=ID
//   → returns last 20 decisions for the business
//
// Bindings: INFINICUS_DB (D1), INFINICUS_USERS (KV for twin cache), ANTHROPIC_API_KEY

import { makeRateLimiter, getIP } from '../../_shared/rateLimit.js';

// AI calls are expensive — strict rate limit
const rlAI    = makeRateLimiter(10, 60 * 60 * 1000);
// Write ops
const rlWrite = makeRateLimiter(30, 60 * 60 * 1000);
// Read ops
const rlRead  = makeRateLimiter(60, 60 * 60 * 1000);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  if (!rlRead.check(getIP(request))) return rlRead.response();

  const url         = new URL(request.url);
  const action      = url.pathname.split('/').pop(); // 'history'
  const business_id = (url.searchParams.get('business_id') || '').trim();

  if (action === 'history') return getHistory({ request, env, business_id });

  return Response.json({ ok: false, error: 'Unknown action.' }, { status: 400, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const url    = new URL(request.url);
  const action = url.pathname.split('/').pop(); // recommend | record-choice | record-outcome

  if (action === 'recommend')      return recommend({ request, env });
  if (action === 'record-choice')  return recordChoice({ request, env });
  if (action === 'record-outcome') return recordOutcome({ request, env });

  return Response.json({ ok: false, error: 'Unknown action.' }, { status: 400, headers: CORS });
}

// ── recommend ─────────────────────────────────────────────────────────────────

async function recommend({ request, env }) {
  if (!rlAI.check(getIP(request))) return rlAI.response();

  const db  = env.INFINICUS_DB;
  const kv  = env.INFINICUS_USERS;
  const key = env.ANTHROPIC_API_KEY;

  if (!db || !kv)  return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });
  if (!key)        return Response.json({ ok: false, error: 'AI not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch {}
  const business_id = (body.business_id || '').trim();
  if (!business_id) return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });

  // Get twin from cache (or note it's missing — don't call twin.js recursively)
  const twin = await kv.get(`twin:${business_id}`, 'json');
  if (!twin) {
    return Response.json({
      ok: false,
      error: 'No Digital Twin data available. Refresh your Digital Twin first to generate recommendations.',
    }, { status: 422, headers: CORS });
  }

  // Get recent decision history to provide accuracy context
  let pastDecisions = [];
  try {
    const { results } = await db.prepare(`
      SELECT decision_text, chosen, outcome_notes
      FROM decision_memory
      WHERE business_id = ?
      ORDER BY recommended_at DESC LIMIT 5
    `).bind(business_id).all();
    pastDecisions = results || [];
  } catch (e) {
    console.error('decisions: error fetching history:', e);
    // Non-fatal — proceed without history context
  }

  // Build prompt from real twin data only — never fabricate
  const { financial, customers, operations, team } = twin;
  const prompt = `You are INFINICUS Decision Intelligence — an advisor grounded in real business data.

BUSINESS: ${twin.business_name} (${twin.industry})
SNAPSHOT: last 30 days as of ${new Date(twin.snapshot_at).toISOString().slice(0,10)}

REAL FINANCIAL DATA:
- Revenue (30d): $${financial.revenue_30d}
- Expenses (30d): $${financial.expenses_30d}
- Profit/Loss (30d): $${financial.profit_30d}
- Burn rate: $${financial.burn_rate_per_day}/day
- Sales transactions: ${financial.sales_count_30d}

REAL CUSTOMER DATA:
- New customers (30d): ${customers.new_30d}
- Returning customers (30d): ${customers.returning_30d}
- Churned (30d): ${customers.churned_30d}
- Churn rate: ${customers.churn_rate_pct}%

REAL OPERATIONS:
- Net inventory delta (30d): ${operations.net_inventory_units_30d} units

REAL TEAM:
- Hired (30d): ${team.hired_30d}
- Terminated (30d): ${team.terminated_30d}
- Net headcount change: ${team.net_headcount_delta}

${pastDecisions.length > 0 ? `RECENT DECISION HISTORY (for context):
${pastDecisions.map(d => `- "${d.decision_text}" → ${d.chosen ? 'chosen' : 'declined'}${d.outcome_notes ? `, outcome: ${d.outcome_notes}` : ''}`).join('\n')}` : ''}

Based ONLY on this real data, provide 3 specific, actionable decisions the business owner should consider.

For each decision respond in this exact JSON format:
{
  "decisions": [
    {
      "decision": "specific action to take",
      "rationale": "why, grounded in the actual numbers above",
      "expected_outcome": "realistic projected impact based on the real data",
      "risk_level": "low|medium|high"
    }
  ]
}

Important: Do not invent data. If the data doesn't support a strong recommendation, say so plainly.`;

  let aiDecisions = [];
  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const aiData = await aiRes.json();
    const text = aiData?.content?.[0]?.text || '';

    // Parse JSON from AI response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      aiDecisions = parsed.decisions || [];
    }
  } catch (e) {
    console.error('decisions: AI call error:', e);
    return Response.json({ ok: false, error: 'AI analysis failed. Please try again.' }, { status: 502, headers: CORS });
  }

  if (!aiDecisions.length) {
    return Response.json({ ok: false, error: 'AI returned no decisions. Please try again.' }, { status: 502, headers: CORS });
  }

  // Store each decision in D1
  const now = Date.now();
  const stored = [];
  for (const d of aiDecisions) {
    const id = generateId();
    try {
      await db.prepare(`
        INSERT INTO decision_memory
          (id, business_id, recommended_at, decision_text, expected_outcome, risk_level)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, business_id, now, d.decision, d.expected_outcome, d.risk_level).run();
      stored.push({ id, ...d });
    } catch (e) {
      console.error('decisions: DB insert error:', e);
      // Store what we can; partial result is better than nothing
    }
  }

  return Response.json({ ok: true, decisions: stored, snapshot_at: twin.snapshot_at }, { status: 200, headers: CORS });
}

// ── record-choice ─────────────────────────────────────────────────────────────

async function recordChoice({ request, env }) {
  if (!rlWrite.check(getIP(request))) return rlWrite.response();

  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch {}
  const decision_id = (body.decision_id || '').trim();
  const chosen      = body.chosen === true || body.chosen === 1 ? 1 : 0;

  if (!decision_id) return Response.json({ ok: false, error: 'decision_id required.' }, { status: 400, headers: CORS });

  try {
    const result = await db.prepare(`
      UPDATE decision_memory SET chosen=?, chosen_at=? WHERE id=?
    `).bind(chosen, Date.now(), decision_id).run();

    if (result.meta?.changes === 0) {
      return Response.json({ ok: false, error: 'Decision not found.' }, { status: 404, headers: CORS });
    }
    return Response.json({ ok: true }, { status: 200, headers: CORS });
  } catch (e) {
    console.error('decisions record-choice DB error:', e);
    return Response.json({ ok: false, error: 'Database error.' }, { status: 500, headers: CORS });
  }
}

// ── record-outcome ────────────────────────────────────────────────────────────

async function recordOutcome({ request, env }) {
  if (!rlWrite.check(getIP(request))) return rlWrite.response();

  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch {}
  const decision_id    = (body.decision_id    || '').trim();
  const outcome_notes  = (body.outcome_notes  || '').trim();

  if (!decision_id)   return Response.json({ ok: false, error: 'decision_id required.' },   { status: 400, headers: CORS });
  if (!outcome_notes) return Response.json({ ok: false, error: 'outcome_notes required.' }, { status: 400, headers: CORS });

  try {
    const result = await db.prepare(`
      UPDATE decision_memory SET outcome_notes=?, outcome_at=? WHERE id=?
    `).bind(outcome_notes, Date.now(), decision_id).run();

    if (result.meta?.changes === 0) {
      return Response.json({ ok: false, error: 'Decision not found.' }, { status: 404, headers: CORS });
    }
    return Response.json({ ok: true }, { status: 200, headers: CORS });
  } catch (e) {
    console.error('decisions record-outcome DB error:', e);
    return Response.json({ ok: false, error: 'Database error.' }, { status: 500, headers: CORS });
  }
}

// ── history ───────────────────────────────────────────────────────────────────

async function getHistory({ request, env, business_id }) {
  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });

  if (!business_id) return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });

  try {
    const { results } = await db.prepare(`
      SELECT * FROM decision_memory
      WHERE business_id = ?
      ORDER BY recommended_at DESC
      LIMIT 20
    `).bind(business_id).all();

    return Response.json({ ok: true, decisions: results || [] }, { status: 200, headers: CORS });
  } catch (e) {
    console.error('decisions history DB error:', e);
    return Response.json({ ok: false, error: 'Database error.' }, { status: 500, headers: CORS });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
