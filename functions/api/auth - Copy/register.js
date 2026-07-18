// POST /api/auth/register
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

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ ok: false, error: 'Valid email required.' }), { status: 400, headers: corsHeaders });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ ok: false, error: 'Password must be at least 8 characters.' }), { status: 400, headers: corsHeaders });
  }

  const kv = env.INFINICUS_USERS;
  if (!kv) {
    return new Response(JSON.stringify({ ok: false, error: 'Storage not configured. Contact support.' }), { status: 500, headers: corsHeaders });
  }

  // Check for existing account
  const existing = await kv.get(`user:${email}`);
  if (existing) {
    return new Response(JSON.stringify({ ok: false, error: 'An account with this email already exists. Please sign in.' }), { status: 409, headers: corsHeaders });
  }

  // Hash password with PBKDF2 (Web Crypto — available in Cloudflare Workers)
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const user = {
    email,
    passwordHash,
    salt,
    plan: 'free',
    simCount: 0,
    createdAt: Date.now(),
  };

  await kv.put(`user:${email}`, JSON.stringify(user));

  return new Response(JSON.stringify({ ok: true, email, plan: 'free' }), { status: 200, headers: corsHeaders });
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

function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
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
