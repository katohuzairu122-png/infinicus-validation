#!/usr/bin/env node
// BUILD-27 — API load test: fires real concurrent HTTP requests at a
// live apps/api instance and measures real latency percentiles and
// throughput. No external load-testing tool (autocannon, k6, ...) is
// used — Node 22's built-in `fetch` is sufficient for the concurrency
// levels this sandboxed single-process environment can meaningfully
// exercise, and avoids a new dependency for a build whose own results
// are meant to be read once and recorded, not run continuously.
//
// Usage:
//   BASE_URL="http://localhost:3000" \
//   CONCURRENCY="20" REQUESTS="500" \
//     node load-test.mjs [path]
//
// path defaults to /v1/health. Prints a real measured report: total
// requests, wall-clock duration, throughput (req/s), and p50/p95/p99
// latency in milliseconds, computed from the actual response times of
// this run, not simulated.
//
// Exit code: 0 always (this is a measurement tool, not a pass/fail
// gate) — the caller decides whether the printed numbers are acceptable.

const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  console.error('ERROR: BASE_URL is required');
  process.exit(1);
}
const CONCURRENCY = Number(process.env.CONCURRENCY ?? '20');
const TOTAL_REQUESTS = Number(process.env.REQUESTS ?? '500');
const PATH = process.argv[2] ?? '/v1/health';
const HEADERS = process.env.LOAD_TEST_HEADERS ? JSON.parse(process.env.LOAD_TEST_HEADERS) : {};

function percentile(sortedLatencies, p) {
  const index = Math.min(sortedLatencies.length - 1, Math.floor((p / 100) * sortedLatencies.length));
  return sortedLatencies[index];
}

async function fireOne() {
  const startedAt = performance.now();
  let statusCode = 0;
  try {
    const res = await fetch(`${BASE_URL}${PATH}`, { headers: HEADERS });
    statusCode = res.status;
    await res.arrayBuffer(); // drain the body so the connection is genuinely freed
  } catch {
    statusCode = 0; // connection-level failure
  }
  return { latencyMs: performance.now() - startedAt, statusCode };
}

async function worker(remaining, results) {
  while (remaining.count > 0) {
    remaining.count -= 1;
    results.push(await fireOne());
  }
}

async function main() {
  console.log(`=== Load test: ${TOTAL_REQUESTS} requests to ${BASE_URL}${PATH}, concurrency ${CONCURRENCY} ===`);
  const remaining = { count: TOTAL_REQUESTS };
  const results = [];
  const startedAt = performance.now();

  const workers = Array.from({ length: CONCURRENCY }, () => worker(remaining, results));
  await Promise.all(workers);

  const durationMs = performance.now() - startedAt;
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const successCount = results.filter((r) => r.statusCode >= 200 && r.statusCode < 400).length;
  const failureCount = results.length - successCount;

  const report = {
    path: PATH,
    concurrency: CONCURRENCY,
    totalRequests: results.length,
    durationMs: Math.round(durationMs),
    throughputReqPerSec: Number((results.length / (durationMs / 1000)).toFixed(1)),
    successCount,
    failureCount,
    latencyMs: {
      min: Number(latencies[0]?.toFixed(1) ?? 0),
      p50: Number(percentile(latencies, 50)?.toFixed(1) ?? 0),
      p95: Number(percentile(latencies, 95)?.toFixed(1) ?? 0),
      p99: Number(percentile(latencies, 99)?.toFixed(1) ?? 0),
      max: Number(latencies[latencies.length - 1]?.toFixed(1) ?? 0),
    },
  };

  console.log(JSON.stringify(report, null, 2));
  if (failureCount > 0) {
    console.error(`WARNING: ${failureCount} of ${results.length} requests did not return a 2xx/3xx status.`);
  }
}

main();
