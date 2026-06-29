// functions/api/simulate.js — INFINICUS ENGINE v3
// Cloudflare Pages Function · Venture Engine AI Analysis
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

// ─── Build the Venture Engine prompt ──────────────────────────────────────────
function buildPrompt(data) {
  const {
    idea, capital, price, mktBud, team, industry, loc, mkt,
    scores, metrics, verdict, mcSurvival
  } = data;

  const scoreList = Object.entries(scores)
    .map(([k, v]) => `  • ${k}: ${v}/100`).join('\n');

  const verdictContext = verdict === 'go'
    ? 'The simulation projects a viable, potentially profitable operation.'
    : verdict === 'modify'
    ? 'The simulation shows potential but key financial thresholds were not met.'
    : 'The simulation projects unsustainable losses within 60 days under current parameters.';

  return `You are an elite Venture Architect operating inside INFINICUS — a business simulation engine.

Your role: Transform simulation data into a structured, execution-ready strategic assessment.

Think simultaneously as:
- Founder (what must change right now to survive?)
- Investor (is this worth backing at current numbers?)
- Market Researcher (what does the data suggest about real demand?)
- Risk Manager (what kills this business first?)
- Operations Coach (what are the first 30 actions?)

CORE PRINCIPLES you must apply:
1. Execution Before Expansion — validate small before scaling big
2. Evidence Before Assumptions — flag what must be validated in real market
3. Solve Valuable Problems — anchor advice to customer pain, not product features
4. Build Defensible Advantages — identify what makes this hard to copy
5. Data-Driven Decisions — every recommendation must link back to the simulation numbers

---

BUSINESS INPUT:
  Idea: ${idea}
  Industry: ${industry}
  Location: ${loc || 'Not specified'}
  Target Market: ${mkt || 'Not specified'}
  Startup Capital: $${Number(capital).toLocaleString()}
  Price Point: $${price}
  Monthly Marketing Budget: $${mktBud}
  Team Size: ${team}

SIMULATION RESULTS (60-day Monte Carlo engine, 500 runs):
  Total Revenue: $${Math.round(metrics.totalRev).toLocaleString()}
  Net Profit/Loss: $${Math.round(metrics.netProfit).toLocaleString()}
  End Cash: $${Math.round(metrics.endCash).toLocaleString()}
  Profitable Days: ${metrics.profDays}/60 (${Math.round(metrics.profDays/60*100)}% of period)
  Final Customer Count: ${metrics.finalCust}
  Break-Even Day: ${metrics.breakEvenDay > 0 ? 'Day ' + metrics.breakEvenDay : 'Not reached in 60 days'}
  Monte Carlo Survival Rate: ${Math.round(mcSurvival * 100)}% of 500 simulated scenarios

VIABILITY SCORES:
${scoreList}

ENGINE VERDICT: ${verdict.toUpperCase()}
Context: ${verdictContext}

---

INSTRUCTIONS:
Analyze the above and respond with a JSON object following this exact structure.
Be specific, direct, and ground every insight in the simulation data above.
Never invent statistics. Flag assumptions clearly. Prioritize practical execution over theory.

{
  "headline": "One punchy sentence capturing the core verdict (max 16 words)",

  "summary": "2-3 sentences. Direct assessment of viability based on the data. Name the single biggest lever.",

  "verdict_reasoning": "1-2 sentences explaining WHY the simulation reached this verdict — link specific numbers to the outcome.",

  "strengths": [
    "Strength 1 — backed by a specific simulation data point",
    "Strength 2 — backed by a specific simulation data point",
    "Strength 3 — backed by a specific simulation data point"
  ],

  "risks": [
    "Risk 1 — the most likely failure mode based on the numbers",
    "Risk 2 — second biggest threat",
    "Risk 3 — market or competitive risk"
  ],

  "validation_assumptions": [
    "Assumption the founder must validate BEFORE committing more capital — with a suggested method",
    "Second critical assumption — with a suggested validation experiment",
    "Third assumption about pricing or customer demand"
  ],

  "differentiation": "One sentence on what sustainable competitive advantage this business can build — and how.",

  "unit_economics": "Interpret the CAC, LTV, break-even data from the simulation. What do these numbers mean for the business model?",

  "execution_roadmap": {
    "phase1": "Days 1–14: What to do first. Specific actions tied to the verdict.",
    "phase2": "Days 15–30: What to build or validate next.",
    "phase3": "Days 31–60: Where to push if early signals are positive.",
    "decision_checkpoint": "The one metric that determines whether to continue, pivot, or stop at day 30."
  },

  "scale_path": "If this business proves viable, what does the path from current state to $10K/month revenue look like? Be specific.",

  "actions": [
    {"phase": "WEEK 1", "priority": "HIGH", "action": "Most critical immediate action to improve survival odds"},
    {"phase": "WEEK 2", "priority": "HIGH", "action": "Second high-priority action"},
    {"phase": "MONTH 1", "priority": "HIGH", "action": "Most important month-1 milestone"},
    {"phase": "MONTH 2", "priority": "MEDIUM", "action": "Key growth or validation action"},
    {"phase": "MONTH 3", "priority": "MEDIUM", "action": "Scaling or optimization focus"}
  ],

  "financial_verdict": "One sentence on the financial health from the simulation — cash burn rate, runway, or profitability trajectory.",

  "investorNote": "Exactly what an investor would say about backing this business at these numbers — honest, direct, 1 sentence."
}

Respond with valid JSON only. No markdown. No explanation outside the JSON. No preamble.`;
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
      max_tokens: 3000,
      messages: [{ role: 'user', content: buildPrompt(body) }],
    });

    const raw = message.content[0]?.text || '';

    let aiData;
    try {
      // Extract JSON from anywhere in the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiData = JSON.parse(cleaned);
    } catch {
      aiData = {
        headline: 'AI analysis complete',
        summary: raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').slice(0,400),
        strengths: [], risks: [], actions: [],
        validation_assumptions: [], differentiation: '',
        unit_economics: '', execution_roadmap: {},
        scale_path: '', financial_verdict: '', investorNote: ''
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
