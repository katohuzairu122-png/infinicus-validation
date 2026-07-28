// POST /api/auth/login
// Body: { email, password }
// Requires: INFINICUS_USERS KV namespace binding
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const email    = (body.email    || '').trim().toLowerCase();
  const password = (body.password || '');

  if (!email || !password) {
    return new Response(JSON.stringify({ ok: false, error: 'Email and password required.' }), { status: 400, headers: corsHeaders });
  }

  const kv = env.INFINICUS_USERS;
  if (!kv) {
    return new Response(JSON.stringify({ ok: false, error: 'Storage not configured. Contact support.' }), { status: 500, headers: corsHeaders });
  }

  const raw = await kv.get(`user:${email}`);
  if (!raw) {
    return new Response(JSON.stringify({ ok: false, error: 'No account found with that email. Please create one.' }), { status: 404, headers: corsHeaders });
  }

  let user;
  try { user = JSON.parse(raw); } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Account data corrupted. Contact support.' }), { status: 500, headers: corsHeaders });
  }

  // Verify password
  const attemptHash = await hashPassword(password, user.salt);
  if (attemptHash !== user.passwordHash) {
    return new Response(JSON.stringify({ ok: false, error: 'Incorrect password.' }), { status: 401, headers: corsHeaders });
  }

  // Return safe user object (no hash/salt)
  return new Response(JSON.stringify({
    ok: true,
    email:     user.email,
    plan:      user.plan      || 'free',
    simCount:  user.simCount  || 0,
    createdAt: user.createdAt || Date.now(),
  }), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function hashPassword(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
