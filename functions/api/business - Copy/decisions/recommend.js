// POST /api/business/decisions/recommend — INFINICUS ENGINE v3
//
// AI-suggested business decisions grounded in the Digital Twin snapshot.
// Rate: 10/hour (live Anthropic cost)
// Body: { business_id }
// Bindings: INFINICUS_DB (D1), INFINICUS_USERS (KV), ANTHROPIC_API_KEY

import { makeRateLimiter, getIP } from '../../../_shared/rateLimit.js';

const rl = makeRateLimiter(10, 60 * 60 * 1000);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!rl.check(getIP(request))) return rl.response();

  const db  = env.INFINICUS_DB;
  const kv  = env.INFINICUS_USERS;
  const key = env.ANTHROPIC_API_KEY;

  if (!db || !kv) return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });
  if (!key)       return Response.json({ ok: false, error: 'AI not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch {}
  const business_id = (body.business_id || '').trim();
  if (!business_id) return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });

  // Require twin to exist — never fabricate data
  const twin = await kv.get(`twin:${business_id}`, 'json');
  if (!twin) {
    return Response.json({
      ok: false,
      error: 'No Digital Twin data available. Refresh your Digital Twin first.',
    }, { status: 422, headers: CORS });
  }

  // Recent decision history for context
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
    console.error('recommend: history fetch error:', e);
  }

  const { financial, customers, operations, team } = twin;
  const prompt = `You are INFINICUS Decision Intelligence — an advisor grounded in real business data.

BUSINESS: ${twin.business_name} (${twin.industry})
SNAPSHOT: last 30 days as of ${new Date(twin.snapshot_at).toISOString().slice(0, 10)}

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
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      aiDecisions = parsed.decisions || [];
    }
  } catch (e) {
    console.error('recommend: AI error:', e);
    return Response.json({ ok: false, error: 'AI analysis failed. Please try again.' }, { status: 502, headers: CORS });
  }

  if (!aiDecisions.length) {
    return Response.json({ ok: false, error: 'AI returned no decisions. Please try again.' }, { status: 502, headers: CORS });
  }

  // Store in D1
  const stored = [];
  for (const d of aiDecisions) {
    const id = generateId();
    try {
      await db.prepare(`
        INSERT INTO decision_memory
          (id, business_id, recommended_at, decision_text, expected_outcome, risk_level)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, business_id, Date.now(), d.decision, d.expected_outcome, d.risk_level).run();
      stored.push({ id, ...d });
    } catch (e) {
      console.error('recommend: DB insert error:', e);
    }
  }

  return Response.json({ ok: true, decisions: stored, snapshot_at: twin.snapshot_at }, { status: 200, headers: CORS });
}

function generateId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
