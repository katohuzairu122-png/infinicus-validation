// GET /api/business/decisions/history — INFINICUS ENGINE v3
//
// Returns the last 20 AI decisions for a business.
// Rate: 60/hour
// Query: ?business_id=ID
// Bindings: INFINICUS_DB (D1)

import { makeRateLimiter, getIP } from '../../../_shared/rateLimit.js';

const rl = makeRateLimiter(60, 60 * 60 * 1000);

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
  if (!rl.check(getIP(request))) return rl.response();

  const db          = env.INFINICUS_DB;
  const url         = new URL(request.url);
  const business_id = (url.searchParams.get('business_id') || '').trim();

  if (!db)          return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });
  if (!business_id) return Response.json({ ok: false, error: 'business_id required.' },   { status: 400, headers: CORS });

  try {
    const { results } = await db.prepare(`
      SELECT * FROM decision_memory
      WHERE business_id = ?
      ORDER BY recommended_at DESC
      LIMIT 20
    `).bind(business_id).all();

    return Response.json({ ok: true, decisions: results || [] }, { status: 200, headers: CORS });
  } catch (e) {
    console.error('history: DB error:', e);
    return Response.json({ ok: false, error: 'Database error.' }, { status: 500, headers: CORS });
  }
}
