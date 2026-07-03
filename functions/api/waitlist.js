// Cloudflare Pages Function — POST /api/waitlist
// Sends owner notification email via Resend when someone joins the waitlist
// Env var required: RESEND_API_KEY (set in Cloudflare Pages → Settings → Environment variables)

const OWNER_EMAIL = 'katohuzairu122@gmail.com';
const FROM_ADDRESS = 'INFINICUS ENGINE <noreply@infini-cus.com>';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let name = '', email = '', tier = 'unknown';
  try {
    const body = await request.json();
    name  = (body.name  || '').trim();
    email = (body.email || '').trim();
    tier  = (body.tier  || 'unknown').trim();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: CORS });
  }

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid email' }), { status: 400, headers: CORS });
  }

  // Always return ok — never break the user-facing form
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: true, note: 'RESEND_API_KEY not configured — logged locally only' }), { status: 200, headers: CORS });
  }

  let resendStatus = 0, resendBody = '';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [OWNER_EMAIL],
        subject: `🎉 Waitlist signup — ${tier.toUpperCase()} plan — ${email}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060a14;font-family:'IBM Plex Mono',monospace;">
<div style="max-width:520px;margin:32px auto;background:#0e1628;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,rgba(0,224,96,.12),rgba(139,92,246,.08));padding:24px 28px;border-bottom:1px solid rgba(255,255,255,.08);">
    <div style="font-size:11px;color:#00e060;letter-spacing:.12em;margin-bottom:6px;">INFINICUS ENGINE</div>
    <h1 style="margin:0;font-size:20px;font-weight:700;color:#e9eefb;">New Waitlist Signup</h1>
  </div>
  <div style="padding:24px 28px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;color:#8893ad;font-size:11px;letter-spacing:.08em;width:80px;">NAME</td>
        <td style="padding:8px 0;color:#e9eefb;font-size:13px;font-weight:600;">${name || '—'}</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,.06);">
        <td style="padding:8px 0;color:#8893ad;font-size:11px;letter-spacing:.08em;">EMAIL</td>
        <td style="padding:8px 0;color:#00e060;font-size:13px;">${email}</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,.06);">
        <td style="padding:8px 0;color:#8893ad;font-size:11px;letter-spacing:.08em;">PLAN</td>
        <td style="padding:8px 0;color:#8b5cf6;font-size:13px;font-weight:700;text-transform:uppercase;">${tier}</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,.06);">
        <td style="padding:8px 0;color:#8893ad;font-size:11px;letter-spacing:.08em;">TIME</td>
        <td style="padding:8px 0;color:#5d6885;font-size:11px;">${new Date().toUTCString()}</td>
      </tr>
    </table>
  </div>
  <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2);">
    <p style="margin:0;font-size:10px;color:#5d6885;letter-spacing:.06em;">INFINICUS ENGINE · infini-cus.com</p>
  </div>
</div>
</body>
</html>`,
      }),
    });

    resendStatus = res.status;
    resendBody = await res.text().catch(() => '');
  } catch (e) {
    resendBody = String(e);
  }

  return new Response(JSON.stringify({ ok: true, _debug: { resendStatus, resendBody } }), { status: 200, headers: CORS });
}
