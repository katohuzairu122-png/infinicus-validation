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

  // Send both: owner notification + Day 1 welcome to user
  const ownerHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#060a14;font-family:'IBM Plex Mono',monospace;">
<div style="max-width:520px;margin:32px auto;background:#0e1628;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,rgba(0,224,96,.12),rgba(139,92,246,.08));padding:24px 28px;border-bottom:1px solid rgba(255,255,255,.08);">
    <div style="font-size:11px;color:#00e060;letter-spacing:.12em;margin-bottom:6px;">INFINICUS ENGINE</div>
    <h1 style="margin:0;font-size:20px;font-weight:700;color:#e9eefb;">New Waitlist Signup</h1>
  </div>
  <div style="padding:24px 28px;"><table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#8893ad;font-size:11px;width:80px;">NAME</td><td style="padding:8px 0;color:#e9eefb;font-size:13px;font-weight:600;">${name||'—'}</td></tr>
    <tr style="border-top:1px solid rgba(255,255,255,.06)"><td style="padding:8px 0;color:#8893ad;font-size:11px;">EMAIL</td><td style="padding:8px 0;color:#00e060;font-size:13px;">${email}</td></tr>
    <tr style="border-top:1px solid rgba(255,255,255,.06)"><td style="padding:8px 0;color:#8893ad;font-size:11px;">PLAN</td><td style="padding:8px 0;color:#8b5cf6;font-size:13px;font-weight:700;text-transform:uppercase;">${tier}</td></tr>
    <tr style="border-top:1px solid rgba(255,255,255,.06)"><td style="padding:8px 0;color:#8893ad;font-size:11px;">TIME</td><td style="padding:8px 0;color:#5d6885;font-size:11px;">${new Date().toUTCString()}</td></tr>
  </table></div>
  <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2);"><p style="margin:0;font-size:10px;color:#5d6885;">INFINICUS ENGINE · infini-cus.com</p></div>
</div></body></html>`;

  const welcomeHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
  <div style="background:#07080a;padding:28px 32px;">
    <div style="font-family:monospace;font-size:10px;color:#00e676;letter-spacing:.15em;margin-bottom:8px;">INFINICUS ENGINE v3</div>
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;line-height:1.2;">You're on the list${name?' '+name.split(' ')[0]:''}.</h1>
  </div>
  <div style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">Thanks for joining the INFINICUS waitlist — you've secured your spot for <strong>${tier}</strong> access.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.65;">While you wait, the full simulation engine is already live and free to try:</p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://infini-cus.com/index.html" style="display:inline-block;background:#07080a;color:#00e676;text-decoration:none;font-family:monospace;font-weight:700;font-size:13px;padding:14px 28px;border-radius:8px;letter-spacing:.08em;">▶ LAUNCH ENGINE NOW →</a>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin-bottom:20px;">
      <div style="font-size:11px;font-family:monospace;color:#6b7280;letter-spacing:.08em;margin-bottom:12px;">// WHAT TO DO FIRST</div>
      <div style="font-size:13px;color:#374151;line-height:1.7;">1. Open the engine at <a href="https://infini-cus.com/index.html" style="color:#059669;">infini-cus.com/index.html</a><br>2. Enter your business idea, capital, and price<br>3. Run a 90-day Monte Carlo simulation<br>4. Get a GO / MODIFY / STOP verdict with full analysis</div>
    </div>
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">We'll send you early access details when your plan opens. Questions? Reply to this email.</p>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#fafafa;"><p style="margin:0;font-size:11px;color:#9ca3af;">INFINICUS ENGINE · infini-cus.com · You're receiving this because you signed up for the waitlist.</p></div>
</div></body></html>`;

  try {
    // Fire both emails in parallel
    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
        body: JSON.stringify({ from:FROM_ADDRESS, to:[OWNER_EMAIL], subject:`🎉 Waitlist signup — ${tier.toUpperCase()} — ${email}`, html:ownerHtml }),
      }),
      fetch('https://api.resend.com/emails', {
        method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
        body: JSON.stringify({ from:FROM_ADDRESS, to:[email], subject:`You're on the INFINICUS waitlist — here's how to start`, html:welcomeHtml }),
      }),
    ]);
  } catch (e) {
    console.error('Waitlist email failed:', e);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
}
