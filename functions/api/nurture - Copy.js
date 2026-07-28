// Cloudflare Pages Function — POST /api/nurture
// Sends Day 3 and Day 7 nurture emails via Resend.
//
// Call format:
//   POST /api/nurture
//   { "email": "user@example.com", "name": "Jane", "day": 3 }
//
// Trigger Day 3 / Day 7 from a Cloudflare Cron or your own scheduler.
// Env var required: RESEND_API_KEY

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

  let email = '', name = '', day = 0;
  try {
    const body = await request.json();
    email = (body.email || '').trim();
    name  = (body.name  || '').trim();
    day   = parseInt(body.day) || 0;
  } catch {
    return new Response(JSON.stringify({ ok:false, error:'Invalid JSON' }), { status:400, headers:CORS });
  }

  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ ok:false, error:'Invalid email' }), { status:400, headers:CORS });
  }
  if (day !== 3 && day !== 7) {
    return new Response(JSON.stringify({ ok:false, error:'day must be 3 or 7' }), { status:400, headers:CORS });
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok:true, note:'RESEND_API_KEY not configured' }), { status:200, headers:CORS });
  }

  const firstName = name ? name.split(' ')[0] : 'there';
  const html = day === 3 ? buildDay3(firstName) : buildDay7(firstName);
  const subject = day === 3
    ? `Did you run your first simulation yet, ${firstName}?`
    : `${firstName}, your business idea deserves real numbers — here's what 500 simulations reveal`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ from:FROM_ADDRESS, to:[email], subject, html }),
    });
    if (!res.ok) console.error('Resend nurture error:', res.status, await res.text().catch(()=>''));
  } catch (e) {
    console.error('Nurture email failed:', e);
  }

  return new Response(JSON.stringify({ ok:true, day }), { status:200, headers:CORS });
}

// ── DAY 3 ─────────────────────────────────────────────────────────────────────
function buildDay3(name) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
  <div style="background:#07080a;padding:28px 32px;">
    <div style="font-family:monospace;font-size:10px;color:#00e676;letter-spacing:.15em;margin-bottom:8px;">INFINICUS ENGINE v3 · DAY 3</div>
    <h1 style="margin:0;font-size:20px;font-weight:900;color:#fff;line-height:1.2;">How to read your simulation verdict, ${name}.</h1>
  </div>
  <div style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">If you've already run a simulation — great. If not, this is a good moment to start. Here's how to make sense of what the engine tells you.</p>

    <div style="margin:0 0 20px;">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;padding:14px;background:#f0fdf4;border-radius:8px;border-left:3px solid #10b981;">
        <span style="font-size:20px;line-height:1;">✅</span>
        <div><strong style="color:#065f46;font-size:13px;">GO</strong><br><span style="font-size:13px;color:#374151;line-height:1.6;">Survival rate above 55%, positive end cash, 30%+ profitable days. The math works — execution is what matters now.</span></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;padding:14px;background:#fffbeb;border-radius:8px;border-left:3px solid #f59e0b;">
        <span style="font-size:20px;line-height:1;">⚠️</span>
        <div><strong style="color:#92400e;font-size:13px;">MODIFY</strong><br><span style="font-size:13px;color:#374151;line-height:1.6;">The model shows potential but gaps. Try adjusting your price, cutting costs, or increasing your marketing budget — then re-run.</span></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px;background:#fef2f2;border-radius:8px;border-left:3px solid #ef4444;">
        <span style="font-size:20px;line-height:1;">🛑</span>
        <div><strong style="color:#991b1b;font-size:13px;">STOP</strong><br><span style="font-size:13px;color:#374151;line-height:1.6;">Under these parameters, most scenarios end in failure. The engine suggests alternative businesses that might work with your capital.</span></div>
      </div>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.65;"><strong>Pro tip:</strong> Run the same idea in all 4 engine modes — Balanced, Lean Survival, Aggressive Scale, and Investor View. The spread tells you how sensitive your model is to strategy.</p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://infini-cus.com/index.html" style="display:inline-block;background:#07080a;color:#00e676;text-decoration:none;font-family:monospace;font-weight:700;font-size:12px;padding:14px 28px;border-radius:8px;letter-spacing:.08em;">▶ RUN YOUR SIMULATION NOW →</a>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;">Reply to this email if you have any questions. We read every one.</p>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #f3f4f6;background:#fafafa;"><p style="margin:0;font-size:11px;color:#9ca3af;">INFINICUS ENGINE · infini-cus.com · <a href="https://infini-cus.com/legal.html" style="color:#9ca3af;">Unsubscribe</a></p></div>
</div></body></html>`;
}

// ── DAY 7 ─────────────────────────────────────────────────────────────────────
function buildDay7(name) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
  <div style="background:#07080a;padding:28px 32px;">
    <div style="font-family:monospace;font-size:10px;color:#00e676;letter-spacing:.15em;margin-bottom:8px;">INFINICUS ENGINE v3 · DAY 7</div>
    <h1 style="margin:0;font-size:20px;font-weight:900;color:#fff;line-height:1.2;">What 500 Monte Carlo runs tell you that spreadsheets never could.</h1>
  </div>
  <div style="padding:28px 32px;">
    <p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.65;">Hey ${name} — it's been a week. Here's something most founders don't know before they spend their first dollar:</p>

    <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:20px;border:1px solid #e5e7eb;">
      <div style="font-family:monospace;font-size:10px;color:#6b7280;letter-spacing:.08em;margin-bottom:12px;">// WHAT THE DATA SHOWS</div>
      <div style="font-size:13px;color:#374151;line-height:1.8;">
        📊 <strong>The average survival rate</strong> for first-time founders in high-competition markets is <strong>31%</strong> — versus 68% for serial entrepreneurs.<br><br>
        💡 <strong>The single biggest lever:</strong> price. Increasing your price by 20% is almost always more powerful than doubling your marketing spend.<br><br>
        📍 <strong>Location matters more than people think.</strong> The same business in Lagos versus London can have 3× different fixed cost structures — that's now built into every simulation.<br><br>
        🔄 <strong>MODIFY isn't failure.</strong> 60% of GO verdicts start as MODIFY. Founders who iterate their inputs 3+ times have dramatically better outcomes.
      </div>
    </div>

    <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.65;">The engine now includes a <strong>10-section Business Plan PDF export</strong>, a <strong>Break-Even Reverse Calculator</strong>, and a <strong>6-month / 12-month extended forecast</strong>. Run a simulation and explore them.</p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://infini-cus.com/index.html" style="display:inline-block;background:#07080a;color:#00e676;text-decoration:none;font-family:monospace;font-weight:700;font-size:12px;padding:14px 28px;border-radius:8px;letter-spacing:.08em;">▶ SIMULATE YOUR IDEA →</a>
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.65;"><strong>One ask:</strong> What business idea are you working on? Hit reply and tell us — we read every response and sometimes share useful data back.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">After today, you'll only hear from us when there's a significant update or your plan opens. No spam.</p>
  </div>
  <div style="padding:14px 32px;border-top:1px solid #f3f4f6;background:#fafafa;"><p style="margin:0;font-size:11px;color:#9ca3af;">INFINICUS ENGINE · infini-cus.com · <a href="https://infini-cus.com/legal.html" style="color:#9ca3af;">Unsubscribe</a></p></div>
</div></body></html>`;
}
