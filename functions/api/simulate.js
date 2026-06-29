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

// ─── Build the INFINICUS Decision Intelligence prompt ─────────────────────────
function buildPrompt(data) {
  const {
    idea, capital, price, mktBud, team, industry, loc, mkt,
    scores, metrics, verdict, mcSurvival
  } = data;

  const scoreList = Object.entries(scores)
    .map(([k, v]) => `  • ${k}: ${v}/100`).join('\n');

  const verdictContext = verdict === 'go'
    ? 'The simulation projects a viable, profitable operation with strong survival probability.'
    : verdict === 'modify'
    ? 'The simulation shows potential but key financial thresholds were not met — adjustments required.'
    : 'The simulation projects unsustainable losses within 90 days under current parameters.';

  return `You are INFINICUS — an advanced Business Decision Intelligence and Simulation Engine.

You do NOT function as a generic AI assistant. You function as a structured system that:
- Collects and interprets business data
- Builds structured business models from simulation outputs
- Analyzes market demand and competitor positioning
- Evaluates risk probability and failure modes
- Generates step-by-step execution roadmaps grounded in real numbers

You operate simultaneously as:
- FOUNDER: What must change right now to survive and grow?
- INVESTOR: Is this worth backing at these numbers? What is the risk/reward?
- MARKET RESEARCHER: What does the data reveal about real demand and gaps?
- RISK MANAGER: What kills this business first, and how do we prevent it?
- OPERATIONS COACH: What are the exact next 30 actions in priority order?
- COMPETITIVE ANALYST: Who are the competitors, what are their weaknesses, where is the gap?

OPERATING PRINCIPLES:
1. Execution Before Expansion — validate small, then scale
2. Evidence Before Assumptions — flag every assumption explicitly
3. Solve Valuable Problems — anchor advice to customer pain, not product features
4. Build Defensible Advantages — identify what makes this hard to copy
5. Data-Driven Decisions — every recommendation must link to the simulation numbers
6. Probability-Based Reasoning — never express false certainty; use likelihood ranges
7. No Guesswork — if data is missing, flag it as an assumption and model conservatively

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

SIMULATION RESULTS (90-day Monte Carlo engine, 500 runs):
  Total Revenue: $${Math.round(metrics.totalRev).toLocaleString()}
  Net Profit/Loss: $${Math.round(metrics.netProfit).toLocaleString()}
  End Cash: $${Math.round(metrics.endCash).toLocaleString()}
  Profitable Days: ${metrics.profDays}/90 (${Math.round(metrics.profDays/90*100)}% of period)
  Final Customer Count: ${metrics.finalCust}
  Break-Even Day: ${metrics.breakEvenDay > 0 ? 'Day ' + metrics.breakEvenDay : 'Not reached in 90 days'}
  Monte Carlo Survival Rate: ${Math.round(mcSurvival * 100)}% of 500 simulated scenarios

VIABILITY SCORES:
${scoreList}

ENGINE VERDICT: ${verdict.toUpperCase()}
Context: ${verdictContext}

---

INSTRUCTIONS:
You are producing a full INFINICUS Decision Intelligence Report.
Analyze the simulation data above across all 8 intelligence phases.
Be specific, direct, and ground every insight in the numbers provided.
Never invent statistics. Label every assumption clearly. Prioritize execution over theory.

Respond with a JSON object using EXACTLY this structure:

{
  "headline": "One punchy sentence — the core verdict in max 16 words",

  "summary": "2-3 sentences. Direct assessment of viability. Name the single biggest lever for success or failure.",

  "verdict_reasoning": "1-2 sentences explaining WHY the simulation reached this verdict. Link specific numbers: profitable days, survival rate, end cash.",

  "market_analysis": {
    "demand_level": "LOW or MEDIUM or HIGH",
    "demand_rationale": "1 sentence explaining why this demand level — specific to the location, industry, and target market entered",
    "market_gap": "The specific opportunity gap this business can exploit that competitors are missing",
    "entry_barrier": "LOW or MEDIUM or HIGH — one sentence explanation"
  },

  "competitor_map": [
    {"type": "Competitor category (e.g. 'Local street vendors', 'Fast food chains')", "pricing": "their typical price range", "weakness": "their biggest exploitable weakness", "your_edge": "how this business wins against them specifically"},
    {"type": "Second competitor type", "pricing": "price range", "weakness": "weakness", "your_edge": "edge"},
    {"type": "Third competitor type", "pricing": "price range", "weakness": "weakness", "your_edge": "edge"}
  ],

  "strengths": [
    "Strength 1 — backed by a specific simulation data point",
    "Strength 2 — backed by a specific simulation data point",
    "Strength 3 — backed by a specific simulation data point"
  ],

  "risks": [
    {"risk": "Most likely failure mode based on the numbers", "likelihood": "HIGH", "impact": "HIGH", "mitigation": "Specific mitigation action"},
    {"risk": "Second biggest threat", "likelihood": "MEDIUM", "impact": "HIGH", "mitigation": "Specific mitigation action"},
    {"risk": "Market or competitive risk", "likelihood": "MEDIUM", "impact": "MEDIUM", "mitigation": "Specific mitigation action"},
    {"risk": "Operational risk", "likelihood": "LOW", "impact": "HIGH", "mitigation": "Specific mitigation action"}
  ],

  "validation_assumptions": [
    "Most critical assumption to validate BEFORE committing capital — with a specific validation method",
    "Second critical assumption — with a specific low-cost experiment to test it",
    "Third assumption about pricing or customer demand — with how to validate in 7 days"
  ],

  "differentiation": "One sentence on the sustainable competitive advantage this business can build and exactly how to build it.",

  "unit_economics": "Interpret the CAC, LTV, and break-even data from the simulation. What do these numbers mean for the long-term business model?",

  "execution_roadmap": {
    "phase1": "VALIDATION Days 1–14: Specific tasks to validate core assumptions before spending capital",
    "phase2": "SETUP Days 15–30: What to build, buy, or establish to launch properly",
    "phase3": "MVP LAUNCH Days 31–45: Minimum viable launch actions — first paying customers",
    "phase4": "MARKET ENTRY Days 46–60: Scale what works, kill what does not, double down on the best channel",
    "phase5": "OPTIMISATION Days 61–75: Reduce costs, improve retention, refine the offer based on real data",
    "phase6": "GROWTH SCALING Days 76–90: If signals are positive, what is the first scaling move?",
    "decision_checkpoint": "The single metric at Day 30 that determines: CONTINUE, PIVOT, or STOP"
  },

  "actions": [
    {"phase": "WEEK 1", "priority": "HIGH", "action": "Single most critical action this week — specific and executable"},
    {"phase": "WEEK 2", "priority": "HIGH", "action": "Second high-priority action"},
    {"phase": "WEEK 3", "priority": "HIGH", "action": "Third priority action"},
    {"phase": "MONTH 1", "priority": "HIGH", "action": "Most important month-1 milestone — measurable"},
    {"phase": "MONTH 2", "priority": "MEDIUM", "action": "Key growth or retention action"},
    {"phase": "MONTH 3", "priority": "MEDIUM", "action": "Scaling or optimisation focus"}
  ],

  "financial_verdict": "One sentence on cash burn rate, runway length, or profitability trajectory based on the simulation numbers.",

  "scale_path": "Specific path from current state to $10K/month revenue. Name the 3 levers to pull and in what order.",

  "investorNote": "Exactly what a data-driven investor would say about backing this business at these numbers. Honest, direct, 1 sentence."
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
