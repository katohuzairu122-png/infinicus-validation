// functions/_shared/rateLimit.js — INFINICUS ENGINE v3
// In-memory per-IP rate limiter — same pattern as simulate.js.
// Resets on cold start (acceptable for edge functions; not a security boundary,
// just a cost/abuse control). Use one rateMap per module import (not shared
// across endpoints), so each endpoint has its own independent counter.
//
// Usage:
//   import { makeRateLimiter } from '../../_shared/rateLimit.js';
//   const rl = makeRateLimiter(30, 60 * 60 * 1000); // 30 per hour
//   if (!rl.check(ip)) return rl.response();

export function makeRateLimiter(limit, windowMs) {
  const map = new Map();

  function check(ip) {
    const now = Date.now();
    const entry = map.get(ip) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count++;
    map.set(ip, entry);
    return entry.count <= limit;
  }

  function response() {
    return new Response(
      JSON.stringify({ ok: false, error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': String(Math.ceil(windowMs / 1000)),
        },
      }
    );
  }

  return { check, response };
}

// Convenience: extract real client IP from Cloudflare Pages request
export function getIP(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
