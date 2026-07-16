// POST /api/auth/request
// Body: { email }
// Sends a magic-link login email via Resend.
// Env vars required: RESEND_API_KEY (optional — returns dev_link if absent)
// KV binding required: INFINICUS_USERS
//
// Token stored as:  magic:<token>  →  { email, expiresAt }  with 20-min KV TTL
// Magic link URL:   https://infini-cus.com/?magic_token=TOKEN&email=EMAIL

const FROM_ADDRESS  = 'INFINICUS ENGINE <noreply@infini-cus.com>';
const SITE_ORIGIN   = 'https://infini-cus.com';
const TOKEN_TTL_SEC = 20 * 60; // 20 minutes

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
  let email = '';
  try {
    const body = await request.json();
    email = (body.email || '').trim().toLowerCase();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    return Response.json({ ok: false, error: 'Valid email required.' }, { status: 400, headers: CORS });
  }

  const kv = env.INFINICUS_USERS;
  if (!kv) {
    return Response.json({ ok: false, error: 'Storage not configured.' }, { status: 500, headers: CORS });
  }

  // Generate URL-safe token
  const token = generateToken();
  const expiresAt = Date.now() + TOKEN_TTL_SEC * 1000;

  // Store token in KV with auto-expiry
  await kv.put(
    `magic:${token}`,
    JSON.stringify({ email, expiresAt }),
    { expirationTtl: TOKEN_TTL_SEC }
  );

  const magicLink = `${SITE_ORIGIN}/?magic_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  // No Resend key — return dev link so the client can redirect directly
  if (!env.RESEND_API_KEY) {
    return Response.json({ ok: true, dev_link: magicLink }, { status: 200, headers: CORS });
  }

  // Send magic link email via Resend
  const html = buildEmail(email, magicLink);
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_ADDRESS,
        to:      [email],
        subject: 'Your INFINICUS sign-in link',
        html,
      }),
    });
    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', errText);
      // Still return ok — user can retry; don't expose Resend internals
    }
  } catch (e) {
    console.error('Magic link email send failed:', e);
  }

  return Response.json({ ok: true }, { status: 200, headers: CORS });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function buildEmail(email, magicLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060a14;font-family:'IBM Plex Mono',monospace;">
<div style="max-width:520px;margin:32px auto;background:#0e1628;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;">

  <div style="background:linear-gradient(135deg,rgba(0,224,96,.12),rgba(139,92,246,.08));padding:28px 32px;border-bottom:1px solid rgba(255,255,255,.08);">
    <div style="font-size:11px;color:#00e060;letter-spacing:.15em;margin-bottom:8px;">INFINICUS ENGINE</div>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#e9eefb;letter-spacing:-.02em;">Your sign-in link</h1>
  </div>

  <div style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:14px;color:#8893ad;line-height:1.65;">
      Click the button below to sign in to INFINICUS as <strong style="color:#e9eefb;">${email}</strong>.
      This link expires in <strong style="color:#00e060;">20 minutes</strong> and can only be used once.
    </p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${magicLink}"
         style="display:inline-block;background:linear-gradient(135deg,#00e060,#00b84d);color:#04121a;text-decoration:none;font-family:'IBM Plex Mono',monospace;font-weight:800;font-size:14px;padding:15px 32px;border-radius:9px;letter-spacing:.06em;">
        ▶ SIGN IN TO INFINICUS →
      </a>
    </div>

    <p style="margin:20px 0 0;font-size:11px;color:#5d6885;line-height:1.7;">
      If you didn't request this, you can safely ignore this email — no account changes will be made.<br><br>
      Or copy this link into your browser:<br>
      <span style="color:#8893ad;word-break:break-all;">${magicLink}</span>
    </p>
  </div>

  <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2);">
    <p style="margin:0;font-size:10px;color:#5d6885;">
      INFINICUS ENGINE · infini-cus.com · Sent to ${email}
    </p>
  </div>

</div>
</body>
</html>`;
}
