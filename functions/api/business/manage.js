// /api/business/manage
//
// POST   → create a business       body: { user_email, name, industry }
// GET    → list user's businesses  ?user_email=EMAIL
// GET    → get one business        ?user_email=EMAIL&id=ID
//
// D1 binding required: INFINICUS_DB
// Table: businesses (see schema.sql)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── POST /api/business/manage — create a business ────────────────────────────

export async function onRequestPost({ request, env }) {
  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'DB not configured.' }, { status: 500, headers: CORS });

  let body = {};
  try { body = await request.json(); } catch { /* fall through with defaults */ }

  const user_email = (body.user_email || '').trim().toLowerCase();
  const name       = (body.name       || '').trim();
  const industry   = (body.industry   || '').trim().toLowerCase();

  if (!user_email || !user_email.includes('@')) {
    return Response.json({ ok: false, error: 'user_email required.' }, { status: 400, headers: CORS });
  }
  if (!name) {
    return Response.json({ ok: false, error: 'Business name required.' }, { status: 400, headers: CORS });
  }
  if (!industry) {
    return Response.json({ ok: false, error: 'Industry required.' }, { status: 400, headers: CORS });
  }

  const id  = generateId();
  const now = Date.now();

  await db.prepare(`
    INSERT INTO businesses (id, user_email, name, industry, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, user_email, name, industry, now, now).run();

  return Response.json({ ok: true, business: { id, user_email, name, industry, created_at: now } }, { status: 201, headers: CORS });
}

// ── GET /api/business/manage — list or fetch businesses ──────────────────────

export async function onRequestGet({ request, env }) {
  const db = env.INFINICUS_DB;
  if (!db) return Response.json({ ok: false, error: 'DB not configured.' }, { status: 500, headers: CORS });

  const url        = new URL(request.url);
  const user_email = (url.searchParams.get('user_email') || '').trim().toLowerCase();
  const id         = (url.searchParams.get('id')         || '').trim();

  if (!user_email) {
    return Response.json({ ok: false, error: 'user_email required.' }, { status: 400, headers: CORS });
  }

  if (id) {
    // Fetch single business — ensure it belongs to this user
    const row = await db.prepare(`
      SELECT * FROM businesses WHERE id = ? AND user_email = ?
    `).bind(id, user_email).first();

    if (!row) {
      return Response.json({ ok: false, error: 'Business not found.' }, { status: 404, headers: CORS });
    }
    return Response.json({ ok: true, business: row }, { status: 200, headers: CORS });
  }

  // List all businesses for this user
  const { results } = await db.prepare(`
    SELECT * FROM businesses WHERE user_email = ? ORDER BY created_at DESC
  `).bind(user_email).all();

  return Response.json({ ok: true, businesses: results || [] }, { status: 200, headers: CORS });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Format as UUID v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
