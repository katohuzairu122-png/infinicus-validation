const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch(e) { return new Response(JSON.stringify({ ok:false, error:'Invalid JSON' }), { status:400, headers:CORS }); }

  const { rating=0, recommend=null, comment='', verdict='unknown' } = body;
  const ts = Date.now();
  const key = `feedback:${ts}`;
  const entry = { rating, recommend, comment, verdict, submittedAt: new Date(ts).toISOString() };

  // Store in KV (reuse INFINICUS_USERS namespace with feedback: prefix)
  try {
    if (env.INFINICUS_USERS) {
      await env.INFINICUS_USERS.put(key, JSON.stringify(entry), { expirationTtl: 60 * 60 * 24 * 365 });
    }
  } catch(e) { console.error('KV write failed', e); }

  // Send email notification via Resend
  try {
    if (env.RESEND_API_KEY) {
      const filled = Math.max(0, Math.min(5, Math.round(rating)));
      const stars = '★'.repeat(filled) + '☆'.repeat(5 - filled);
      const recText = recommend === true ? '👍 Yes' : recommend === false ? '👎 No' : '—';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'INFINICUS ENGINE <noreply@infini-cus.com>',
          to: ['infinicussimulationengine@gmail.com'],
          subject: `[Feedback] ${stars} — ${String(verdict).toUpperCase()} verdict`,
          html: `
            <div style="font-family:monospace;max-width:480px;margin:0 auto;padding:24px;background:#0a0f0d;color:#e2e8f0;border-radius:12px;">
              <h2 style="color:#00e060;font-size:16px;margin:0 0 20px;letter-spacing:.05em;">INFINICUS USER FEEDBACK</h2>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr><td style="padding:8px 0;color:#64748b;width:140px;">Verdict</td><td style="color:#e2e8f0;font-weight:bold;">${String(verdict).toUpperCase()}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;">Satisfaction</td><td style="color:#f59e0b;font-size:18px;">${stars} <span style="color:#e2e8f0;font-size:13px;">(${filled}/5)</span></td></tr>
                <tr><td style="padding:8px 0;color:#64748b;">Recommend</td><td style="color:#e2e8f0;">${recText}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;vertical-align:top;">Comment</td><td style="color:#e2e8f0;">${comment || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#64748b;">Submitted</td><td style="color:#94a3b8;font-size:11px;">${new Date(ts).toUTCString()}</td></tr>
              </table>
            </div>
          `
        })
      });
    }
  } catch(e) { console.error('Resend failed', e); }

  return new Response(JSON.stringify({ ok: true }), { headers: CORS });
}
