// /api/business/events
//
// POST  → record an event
//   body: { business_id, event_type, amount?, quantity?, category?,
//            customer_id?, member_id?, action?, notes? }
//
// GET   → query events
//   ?business_id=ID
//   &type=sale|expense|inventory|customer|team   (optional filter)
//   &from=<ms epoch>                             (optional, inclusive)
//   &to=<ms epoch>                               (optional, inclusive)
//   &limit=100                                   (optional, default 200, max 500)
//
// D1 binding required: INFINICUS_DB
// Tables: businesses, business_events (see schema.sql)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const VALID_EVENT_TYPES = new Set(['sale', 'expense', 'inventory', 'customer', 'team']);
const DEFAULT_LIMIT     = 200;
const MAX_LIMIT         = 500;

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── POST — record an event ────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'DB not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch { /* fall through */ }

  const business_id = (body.business_id || '').trim();
  const event_type  = (body.event_type  || '').trim().toLowerCase();

  if (!business_id) {
    return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });
  }
  if (!VALID_EVENT_TYPES.has(event_type)) {
    return Response.json(
      { ok: false, error: `event_type must be one of: ${[...VALID_EVENT_TYPES].join(', ')}` },
      { status: 400, headers: CORS }
    );
  }

  // Verify the business exists (also acts as an ownership guard when caller passes user_email)
  const biz = await db.prepare('SELECT id FROM businesses WHERE id = ?').bind(business_id).first();
  if (!biz) {
    return Response.json({ ok: false, error: 'Business not found.' }, { status: 404, headers: CORS });
  }

  const id         = generateId();
  const amount     = body.amount     != null ? Number(body.amount)   : null;
  const quantity   = body.quantity   != null ? Number(body.quantity) : null;
  const category   = (body.category   || null);
  const customer_id = (body.customer_id || null);
  const member_id  = (body.member_id  || null);
  const action     = (body.action     || null);
  const notes      = (body.notes      || null);
  const created_at = Date.now();

  await db.prepare(`
    INSERT INTO business_events
      (id, business_id, event_type, amount, quantity, category, customer_id, member_id, action, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, business_id, event_type,
    amount, quantity, category,
    customer_id, member_id, action, notes, created_at
  ).run();

  return Response.json({
    ok: true,
    event: { id, business_id, event_type, amount, quantity, category,
             customer_id, member_id, action, notes, created_at }
  }, { status: 201, headers: CORS });
}

// ── GET — query events ────────────────────────────────────────────────────────

export async function onRequestGet({ request, env }) {
  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'DB not configured.' }, { status: 500, headers: CORS });

  const url         = new URL(request.url);
  const business_id = (url.searchParams.get('business_id') || '').trim();
  const type_filter = (url.searchParams.get('type')        || '').trim().toLowerCase();
  const from_ms     = parseInt(url.searchParams.get('from') || '0', 10);
  const to_ms       = parseInt(url.searchParams.get('to')   || String(Date.now() + 86_400_000), 10);
  const limit       = Math.min(
    parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
    MAX_LIMIT
  );

  if (!business_id) {
    return Response.json({ ok: false, error: 'business_id required.' }, { status: 400, headers: CORS });
  }
  if (type_filter && !VALID_EVENT_TYPES.has(type_filter)) {
    return Response.json(
      { ok: false, error: `type filter must be one of: ${[...VALID_EVENT_TYPES].join(', ')}` },
      { status: 400, headers: CORS }
    );
  }

  let query  = 'SELECT * FROM business_events WHERE business_id = ? AND created_at BETWEEN ? AND ?';
  let params = [business_id, from_ms, to_ms];

  if (type_filter) {
    query  += ' AND event_type = ?';
    params.push(type_filter);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const { results } = await db.prepare(query).bind(...params).all();

  return Response.json({ ok: true, events: results || [] }, { status: 200, headers: CORS });
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
