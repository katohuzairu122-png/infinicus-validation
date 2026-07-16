/**
 * INFINICUS ENGINE — Welcome Email Edge Function
 * Deploy: supabase functions deploy welcome-email
 *
 * Trigger via Supabase Database Webhook:
 *   Table: auth.users  |  Event: INSERT
 *   URL:   https://<project-ref>.supabase.co/functions/v1/welcome-email
 *
 * Required secrets (Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY   — from resend.com/api-keys
 *   FROM_EMAIL       — e.g. hello@infini-cus.com (verified Resend domain)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'hello@infini-cus.com';
const APP_URL        = 'https://infini-cus.com';

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record  = payload?.record;
    if (!record?.email) return new Response('no email in payload', { status: 400 });

    const { email } = record;
    const name = record.raw_user_meta_data?.full_name ?? email.split('@')[0];

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `INFINICUS Engine <${FROM_EMAIL}>`,
        to:      [email],
        subject: 'Welcome to INFINICUS — your first simulation is ready',
        html:    buildEmail(name, APP_URL),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(`Resend error: ${err}`, { status: 502 });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ sent: true, id: data.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});

function buildEmail(name: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0c10;font-family:Arial,sans-serif;color:#c9d4e0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c10;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#10141c;border-radius:12px;overflow:hidden;border:1px solid #1e2736;">

      <tr><td style="background:#000;padding:32px 40px;text-align:center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="180" height="54">
          <path d="M 30,30 C 30,18 44,12 56,18 C 68,24 72,36 84,36 C 96,36 100,24 100,30 C 100,36 96,48 84,42 C 72,36 68,24 56,24 C 44,24 30,42 30,30 Z"
                fill="none" stroke="#00e060" stroke-width="5" stroke-linecap="round"/>
          <text x="112" y="22" font-family="Arial Black,Arial,sans-serif" font-size="15" font-weight="900" fill="#00e060" letter-spacing="2">INFINICUS</text>
          <text x="112" y="38" font-family="Arial,sans-serif" font-size="8" fill="#556678" letter-spacing="2">SIMULATOR ENGINE</text>
        </svg>
      </td></tr>

      <tr><td style="padding:40px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f0f4f8;">Welcome, ${name} 👋</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#8899aa;">
          Your INFINICUS account is active. Run your first 30-day business simulation —
          powered by Monte Carlo analysis across 500 scenarios.
        </p>
        <table cellpadding="0" cellspacing="0" style="background:#0a0c10;border-radius:8px;border:1px solid #1e2736;width:100%;margin:0 0 28px;">
          <tr><td style="padding:16px 20px;border-bottom:1px solid #1e2736;"><span style="color:#00e060;margin-right:10px;">∞</span><span style="font-size:14px;color:#c9d4e0;">30-day P&amp;L simulation</span></td></tr>
          <tr><td style="padding:16px 20px;border-bottom:1px solid #1e2736;"><span style="color:#00e060;margin-right:10px;">⚡</span><span style="font-size:14px;color:#c9d4e0;">500-run Monte Carlo survival analysis</span></td></tr>
          <tr><td style="padding:16px 20px;"><span style="color:#00e060;margin-right:10px;">📊</span><span style="font-size:14px;color:#c9d4e0;">11 industry profiles with seasonality</span></td></tr>
        </table>
        <div style="text-align:center;margin:0 0 32px;">
          <a href="${appUrl}" style="display:inline-block;background:#00e060;color:#000;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:1px;">RUN YOUR FIRST SIMULATION →</a>
        </div>
        <p style="margin:0;font-size:13px;color:#556678;line-height:1.6;">
          Free plan includes 1 simulation. Upgrade inside the app to unlock unlimited runs,
          sensitivity analysis, and scenario comparison.
        </p>
      </td></tr>

      <tr><td style="padding:24px 40px;border-top:1px solid #1e2736;text-align:center;">
        <p style="margin:0;font-size:12px;color:#3a4a5a;">INFINICUS SIMULATOR ENGINE &nbsp;·&nbsp; ${appUrl}<br/>You received this because you created an account.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
