// functions/api/simulate.js — INFINICUS ENGINE v3
// Cloudflare Pages Function · Anthropic-powered AI verdict & narrative
// URL: /api/simulate (auto-mapped by Cloudflare Pages)
// Env: set ANTHROPIC_API_KEY in Cloudflare Pages → Settings → Environment Variables

import Anthropic from '@anthropic-ai/sdk';

// ─── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Infinicus-Key',
  'Content-Type': 'application/json',
};

// ─── Rate limiting (per IP, in-memory — resets on cold start) ─────────────────
const rateMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000;

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW; }
  entry.count++;
  rateMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
}

// ─── Input validation ──────────────────────────────────────────────────────────
function validate(body) {
  const required = ['idea', 'capital', 'price', 'mktBud', 'team', 'industry', 'scores', 'metrics'];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === '') {
      return `Missing required field: ${k}`;
    }
  }
  if (typeof body.idea !== 'string' || body.idea.length > 1000) return 'Invalid idea field';
  if (body.capital < 0 || body.capital > 100_000_000) return 'Capital out of range';
  if (body.price < 0 || body.price > 1_000_000) return 'Price out of range';
  return null;
}

// ─── Build the Claude prompt ───────────────────────────────────────────────────
function buildPrompt(data) {
  const {
    idea, capital, price, mktBud, team, industry, loc, mkt,
    scores, metrics, verdict, mcSurvival
  } = data;

  const scoreList = Object.entries(scores)
    .map(([k, v]) => `  • ${k}: ${v}/100`).join('\n');

  return `You are an expert startup analyst and business advisor providing a concise, data-backed assessment of a simulated business.

BUSINESS INPUT:
  Idea: ${idea}
  Industry: ${industry}
  Location: ${loc || 'Not specified'}
  Target Market: ${mkt || 'Not specified'}
  Startup Capital: $${Number(capital).toLocaleString()}
  Price Point: $${price}
  Monthly Marketing Budget: $${mktBud}
  Team Size: ${team}

SIMULATION RESULTS (60-day statistical engine):
  Total Revenue: $${Math.round(metrics.totalRev).toLocaleString()}
  Net Profit/Loss: $${Math.round(metrics.netProfit).toLocaleString()}
  End Cash: $${Math.round(metrics.endCash).toLocaleString()}
  Profitable Days: ${metrics.profDays}/60
  Final Customer Count: ${metrics.finalCust}
  Break-Even Day: ${metrics.breakEvenDay > 0 ? 'Day ' + metrics.breakEvenDay : 'Not reached'}
  Monte Carlo Survival Rate: ${Math.round(mcSurvival * 100)}% (500 runs)

SCORES:
${scoreList}

ENGINE VERDICT: ${verdict.toUpperCase()}

Based strictly on these simulation results, provide a JSON response with the following structure:
{
  "headline": "One punchy sentence summarising the verdict (max 15 words)",
  "summary": "2-3 sentence plain-English assessment of viability. Be direct and honest.",
  "strengths": ["up to 3 specific strengths based on the data"],
  "risks": ["up to 3 specific risks based on the data"],
  "actions": [
    {"priority": "HIGH|MEDIUM|LOW", "action": "Specific, actionable recommendation"},
    {"priority": "HIGH|MEDIUM|LOW", "action": "Specific, actionable recommendation"},
    {"priority": "HIGH|MEDIUM|LOW", "action": "Specific, actionable recommendation"}
  ],
  "investorNote": "One sentence an investor would say about this business at this stage"
}

Respond with valid JSON only. No markdown. No preamble.`;
}

// ─── Cloudflare Pages Function handler ────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS });
  }

  // Method gate
  if (method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  // API key gate (optional — set INFINICUS_API_KEY in Cloudflare env to restrict)
  const apiKey = env.INFINICUS_API_KEY;
  if (apiKey && request.headers.get('x-infinicus-key') !== apiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  // Rate limit
  const ip = request.headers.get('CF-Connecting-IP')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || 'unknown';
  if (!checkRate(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }),
      { status: 429, headers: CORS }
    );
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS });
  }

  // Validate
  const err = validate(body);
  if (err) return new Response(JSON.stringify({ error: err }), { status: 400, headers: CORS });

  // Call Anthropic
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(body) }],
    });

    const raw = message.content[0]?.text || '';

    let aiData;
    try {
      // Extract JSON from anywhere in the response (handles markdown fences, preamble, etc.)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiData = JSON.parse(cleaned);
    } catch {
      aiData = {
        headline: 'AI analysis complete',
        summary: raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').slice(0,400),
        strengths: [], risks: [], actions: [], investorNote: ''
      };
    }

    return new Response(JSON.stringify({ ok: true, data: aiData }), { status: 200, headers: CORS });

  } catch (e) {
    console.error('Anthropic error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'AI analysis unavailable', fallback: true }),
      { status: 500, headers: CORS }
    );
  }
}
