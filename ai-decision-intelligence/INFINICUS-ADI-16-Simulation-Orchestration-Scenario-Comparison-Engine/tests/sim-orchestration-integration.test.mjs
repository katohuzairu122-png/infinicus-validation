// BUILD-07 — ADI-16 ↔ Engine v3 facade integration tests.
// Proves ADI-16's injected executeScenario port reaches the REAL engine
// through the REAL bundle wiring, with deterministic failures when the
// engine or parameters are unavailable.
import assert from "node:assert/strict";
import { loadEngineV3Facade, FIXTURE_PARAMS } from "../../sim-integration-harness.mjs";

const T1 = "tenant-sim-2";
const B1 = "biz-sim-2";

const win = loadEngineV3Facade();
const sim = win.INFINICUS.SIMULATION;

globalThis.window ??= globalThis;
globalThis.INFINICUS = { SIMULATION: sim };
await import("../../adi-bundle.js");

const ADI = globalThis.INFINICUS.ADI;
assert.equal(ADI.attachResults["ADI-16"].ok, true, "ADI-16 must attach");
const executeScenario = ADI.simulationPorts.executeScenario;
assert.equal(typeof executeScenario, "function");

// ADI-16 can request an authorized scenario execution through the port
const query = {
  alternative: { alternativeId: "alt-42", title: "Open second stall" },
  decisionId: "dec-9",
  tenantId: T1,
  businessId: B1,
  simulationPolicy: { engineParameters: { ...FIXTURE_PARAMS }, correlationId: "corr-9" },
  comparisonMetrics: ["finalCashPercentiles", "survivalRate"],
};
const run = executeScenario(query);
assert.equal(run.status, "completed");
assert.equal(run.tenantId, T1);
assert.equal(run.businessId, B1);
assert.equal(run.decisionId, "dec-9");
assert.equal(run.scenarioId, "alt-42");
assert.equal(run.correlationId, "corr-9");
assert.equal(run.sampleSize, 500, "500-run behaviour must be preserved through the port");
assert.equal(run.horizonDays, 90, "90-day behaviour must be preserved through the port");
assert.equal(run.randomSeed, null, "no fabricated seed");
assert.ok(run.outputs && typeof run.outputs === "object");
assert.ok(Number.isFinite(run.outputs.finalCashPercentiles.p50));
assert.ok(run.sourceResultRef.includes(run.runId), "provenance ref must trace to the run");

// Duplicate execution is idempotent (decisionId + alternativeId key)
const replay = executeScenario(query);
assert.equal(replay.runId, run.runId, "same decision+alternative must replay the same run");
assert.equal(replay.idempotentReplay, true);

// Missing engine parameters → deterministic failure, nothing fabricated
assert.throws(
  () => executeScenario({ ...query, simulationPolicy: {} }),
  /SIM_ENGINE_PARAMETERS_REQUIRED/
);

// Missing operation → deterministic failure
const savedOp = sim.executeScenario;
delete sim.executeScenario;
assert.throws(() => executeScenario(query), /SIM_ENGINE_OPERATION_UNAVAILABLE/);
sim.executeScenario = savedOp;

// Missing engine namespace → deterministic failure
const savedSim = globalThis.INFINICUS.SIMULATION;
delete globalThis.INFINICUS.SIMULATION;
assert.throws(() => executeScenario(query), /SIM_ENGINE_UNAVAILABLE/);
globalThis.INFINICUS.SIMULATION = savedSim;

// The run executed via ADI-16's port is readable via ADI-06's port (evidence loop)
const runs = ADI.simulationPorts.readCompletedRun({
  tenantId: T1, businessId: B1, decisionId: "dec-9", runIds: [run.runId],
});
assert.equal(runs.length, 1);
assert.equal(runs[0].runId, run.runId);

console.log("ADI-16 SIM orchestration integration tests passed.");
