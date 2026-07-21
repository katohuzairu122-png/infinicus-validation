// BUILD-07 — ADI-06 ↔ Engine v3 facade integration + characterization tests.
// Uses the REAL engine core and REAL facade extracted from index.html, and
// the REAL adi-bundle.js bootstrap wiring.
import assert from "node:assert/strict";
import { loadEngineV3Facade, FIXTURE_PARAMS } from "../../sim-integration-harness.mjs";

const T1 = "tenant-sim-1";
const B1 = "biz-sim-1";

// ── Characterization: the facade preserves Engine v3 behaviour ──────────────
const win = loadEngineV3Facade();
const sim = win.INFINICUS.SIMULATION;

assert.equal(typeof sim.executeScenario, "function");
assert.equal(typeof sim.getCompletedRun, "function");
assert.equal(sim.capabilities.runs, 500);
assert.equal(sim.capabilities.horizonDays, 90);
assert.equal(sim.capabilities.seedSupported, false);

const exec = sim.executeScenario({
  tenantId: T1, businessId: B1, correlationId: "corr-1", decisionId: "dec-1",
  scenarioId: "alt-1", idempotencyKey: "idem-1", parameters: FIXTURE_PARAMS,
});
assert.equal(exec.ok, true, "facade execution failed: " + JSON.stringify(exec.error));
const run = exec.run;

// 500-run and 90-day behaviour preserved (engine constants, not facade inputs)
assert.equal(run.sampleSize, 500, "sampleSize must be the engine's fixed 500 runs");
assert.equal(run.horizonDays, 90, "horizonDays must be the engine's fixed 90 days");
assert.equal(run.status, "completed");
assert.equal(run.engineVersion, "infinicus-engine-v3");
assert.equal(run.modelVersion, "v3-montecarlo-500x90");
assert.equal(run.schemaVersion, "1.0.0");

// Identity preserved
assert.equal(run.tenantId, T1);
assert.equal(run.businessId, B1);
assert.equal(run.correlationId, "corr-1");
assert.equal(run.decisionId, "dec-1");
assert.equal(run.scenarioId, "alt-1");
assert.ok(run.inputFingerprint.startsWith("params:"), "input lineage fingerprint required");

// No fabricated seed — engine does not support seeding
assert.equal(run.randomSeed, null);

// Percentiles retain original scale/order; probability stays within [0,1]
const pct = run.outputs.finalCashPercentiles;
for (const q of ["p10", "p25", "p50", "p75", "p90"]) {
  assert.ok(Number.isFinite(pct[q]), q + " must be a finite number");
}
assert.ok(pct.p10 <= pct.p25 && pct.p25 <= pct.p50 && pct.p50 <= pct.p75 && pct.p75 <= pct.p90,
  "percentiles must be monotonic");
assert.ok(run.outputs.survivalRate >= 0 && run.outputs.survivalRate <= 1);
assert.equal(run.outputs.currencyCode, "USD", "currency metadata must not be silently converted");

// Idempotency: same key replays the same run
const replay = sim.executeScenario({
  tenantId: T1, businessId: B1, idempotencyKey: "idem-1", parameters: FIXTURE_PARAMS,
});
assert.equal(replay.ok, true);
assert.equal(replay.run.runId, run.runId, "idempotent replay must return the same run");
assert.equal(replay.run.idempotentReplay, true);

// Invalid requests are rejected, not fabricated
assert.equal(sim.executeScenario({ tenantId: T1, businessId: B1, parameters: { industry: "food", capital: 0, price: 5 } }).error.code, "SIM_REQUEST_INVALID");
assert.equal(sim.executeScenario({ tenantId: T1, businessId: B1, parameters: { industry: "not-an-industry", capital: 1, price: 1 } }).error.code, "SIM_REQUEST_INVALID");

// Read path: found / cross-tenant rejected / unknown rejected / incomplete rejected
assert.equal(sim.getCompletedRun({ tenantId: T1, businessId: B1, runId: run.runId }).ok, true);
assert.equal(sim.getCompletedRun({ tenantId: "other-tenant", businessId: B1, runId: run.runId }).error.code, "SIM_RUN_TENANT_MISMATCH");
assert.equal(sim.getCompletedRun({ tenantId: T1, businessId: "other-biz", runId: run.runId }).error.code, "SIM_RUN_TENANT_MISMATCH");
assert.equal(sim.getCompletedRun({ tenantId: T1, businessId: B1, runId: "missing" }).error.code, "SIM_RUN_NOT_FOUND");
sim._completedRuns["stuck-run"] = { ...run, runId: "stuck-run", status: "running" };
assert.equal(sim.getCompletedRun({ tenantId: T1, businessId: B1, runId: "stuck-run" }).error.code, "SIM_RUN_NOT_COMPLETED");
delete sim._completedRuns["stuck-run"];

// ── Bundle wiring: real adi-bundle.js bootstrap consumes the real facade ────
globalThis.window ??= globalThis;
globalThis.INFINICUS = { SIMULATION: sim };
await import("../../adi-bundle.js");

const ADI = globalThis.INFINICUS.ADI;
assert.equal(ADI.attachResults["ADI-06"].ok, true, "ADI-06 must attach");
assert.equal(typeof ADI.simulationPorts.readCompletedRun, "function");

// ADI-06 acquires the completed run through the wired reader + its own validation
const adi06 = ADI.runtime.getService("adi.simulation_results_adapter").data;
const boundary = { tenantId: T1, businessId: B1 };
const decisionCase = { decisionId: "dec-1", traceId: "trace-1" };

const acquired = await adi06.acquire({ decisionCase, boundary, runIds: [run.runId] });
assert.equal(acquired.ok, true, "ADI-06 acquire failed: " + JSON.stringify(acquired.error));
assert.equal(acquired.data.acceptedRuns.length, 1);
assert.equal(acquired.data.acceptedRuns[0].runId, run.runId);
assert.ok(acquired.data.fragments.length > 0, "accepted run must produce context fragments");

// Cross-tenant boundary is rejected end-to-end
const crossTenant = await adi06.acquire({
  decisionCase,
  boundary: { tenantId: "other-tenant", businessId: B1 },
  runIds: [run.runId],
});
assert.equal(crossTenant.ok, false);
assert.equal(crossTenant.error.code, "ADI_SIMULATION_READ_FAILED");

// Unknown runs are rejected end-to-end, never fabricated
const unknown = await adi06.acquire({ decisionCase, boundary, runIds: ["missing-run"] });
assert.equal(unknown.ok, false);

// Missing engine produces a deterministic failure (no fake success)
delete globalThis.INFINICUS.SIMULATION;
const noEngine = await adi06.acquire({ decisionCase, boundary, runIds: [run.runId] });
assert.equal(noEngine.ok, false);
assert.match(noEngine.error.details.message, /SIM_ENGINE_UNAVAILABLE/);
globalThis.INFINICUS.SIMULATION = sim;

console.log("ADI-06 SIM facade integration tests passed.");
