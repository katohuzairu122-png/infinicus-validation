// GET /api/auth/verify?token=TOKEN
// Validates a magic-link token, consumes it (one-time use), and returns user data.
// Auto-creates the user record if this is their first login.
//
// KV binding required: INFINICUS_USERS
// KV keys used:
//   magic:<token>  →  { email, expiresAt }  (written by /api/auth/request)
//   user:<email>   →  { email, plan, simCount, createdAt, ... }

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
  const url   = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!token) {
    return Response.json({ ok: false, error: 'Token required.' }, { status: 400, headers: CORS });
  }

  const kv = env.INFINICUS_USERS;
  if (!kv) {
    return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });
  }

  // Look up token
  const raw = await kv.get(`magic:${token}`);
  if (!raw) {
    return Response.json(
      { ok: false, error: 'This link has expired or already been used. Please request a new one.' },
      { status: 401, headers: CORS }
    );
  }

  let tokenData;
  try {
    tokenData = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: 'Token data corrupted.' }, { status: 500, headers: CORS });
  }

  // Double-check expiry (KV TTL is the primary guard, but belt-and-suspenders)
  if (Date.now() > tokenData.expiresAt) {
    await kv.delete(`magic:${token}`);
    return Response.json(
      { ok: false, error: 'This link has expired. Please request a new one.' },
      { status: 401, headers: CORS }
    );
  }

  const email = tokenData.email;

  // Consume the token — one-time use
  await kv.delete(`magic:${token}`);

  // Fetch or create user
  const userRaw = await kv.get(`user:${email}`);
  let user;

  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }

  if (!user) {
    // First-time magic-link login: create account (no password)
    user = {
      email,
      plan:      'free',
      simCount:  0,
      createdAt: Date.now(),
      authMethod: 'magic_link',
    };
    await kv.put(`user:${email}`, JSON.stringify(user));
  }

  return Response.json({
    ok:        true,
    email:     user.email,
    plan:      user.plan      || 'free',
    simCount:  user.simCount  || 0,
    createdAt: user.createdAt || Date.now(),
  }, { status: 200, headers: CORS });
}
