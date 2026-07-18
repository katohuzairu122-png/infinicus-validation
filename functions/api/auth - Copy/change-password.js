// POST /api/auth/change-password
// Body: { email, currentPassword, newPassword }
// Requires: INFINICUS_USERS KV namespace binding
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const email           = (body.email           || '').trim().toLowerCase();
  const currentPassword = (body.currentPassword || '');
  const newPassword     = (body.newPassword     || '');

  if (!email || !currentPassword || !newPassword) {
    return new Response(JSON.stringify({ ok: false, error: 'All fields are required.' }), { status: 400, headers: corsHeaders });
  }
  if (newPassword.length < 8) {
    return new Response(JSON.stringify({ ok: false, error: 'New password must be at least 8 characters.' }), { status: 400, headers: corsHeaders });
  }

  const kv = env.INFINICUS_USERS;
  if (!kv) {
    return new Response(JSON.stringify({ ok: false, error: 'Storage not configured. Contact support.' }), { status: 500, headers: corsHeaders });
  }

  const raw = await kv.get(`user:${email}`);
  if (!raw) {
    return new Response(JSON.stringify({ ok: false, error: 'Account not found.' }), { status: 404, headers: corsHeaders });
  }

  let user;
  try { user = JSON.parse(raw); } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Account data corrupted. Contact support.' }), { status: 500, headers: corsHeaders });
  }

  // Verify current password
  const currentHash = await hashPassword(currentPassword, user.salt);
  if (currentHash !== user.passwordHash) {
    return new Response(JSON.stringify({ ok: false, error: 'Current password is incorrect.' }), { status: 401, headers: corsHeaders });
  }

  // Hash new password with fresh salt
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  user.passwordHash = newHash;
  user.salt = newSalt;
  user.passwordChangedAt = Date.now();

  await kv.put(`user:${email}`, JSON.stringify(user));

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
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
