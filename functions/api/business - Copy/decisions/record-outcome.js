// POST /api/business/decisions/record-outcome — INFINICUS ENGINE v3
//
// Records the actual result of a chosen decision.
// Rate: 30/hour
// Body: { decision_id, outcome_notes }
// Bindings: INFINICUS_DB (D1)

import { makeRateLimiter, getIP } from '../../../_shared/rateLimit.js';

const rl = makeRateLimiter(30, 60 * 60 * 1000);

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

  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch {}
  const decision_id   = (body.decision_id   || '').trim();
  const outcome_notes = (body.outcome_notes || '').trim();

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
    console.error('record-outcome: DB error:', e);
    return Response.json({ ok: false, error: 'Database error.' }, { status: 500, headers: CORS });
  }
}
