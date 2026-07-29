import assert from "node:assert/strict";

// Browser-global IIFEs target window; provide it for Node.
globalThis.window ??= globalThis;

await import("../../INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/adi-01-ai-decision-intelligence-core-runtime-registry.js");
await import("../../INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/adi-02-decision-request-intake-validation-engine.js");
await import("../../INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/adi-03-decision-identity-ownership-access-control-engine.js");
await import("../../INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/adi-04-decision-context-acquisition-normalization-engine.js");
await import("../../INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/adi-05-business-digital-twin-context-adapter.js");
await import("../../INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/src/adi-06-simulation-engine-results-adapter.js");
await import("../../INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/adi-07-decision-evidence-provenance-registry.js");
await import("../../INFINICUS-ADI-08-Business-Goal-Registry/src/adi-08-business-goal-registry.js");
await import("../../INFINICUS-ADI-09-Decision-Trigger-Registry/src/adi-09-decision-trigger-registry.js");
await import("../../INFINICUS-ADI-10-Business-Problem-Definition-Engine/src/adi-10-business-problem-definition-engine.js");
await import("../../INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/src/adi-11-decision-context-evidence-assembly-engine.js");
await import("../../INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/src/adi-12-decision-objectives-constraints-criteria-engine.js");
await import("../../INFINICUS-ADI-13-Strategic-Alternative-Generation-Engine/src/adi-13-strategic-alternative-generation-engine.js");
await import("../../INFINICUS-ADI-14-Alternative-Feasibility-Eligibility-Filter/src/adi-14-alternative-feasibility-eligibility-filter.js");
await import("../../INFINICUS-ADI-15-Impact-Dependency-Trade-off-Analysis-Engine/src/adi-15-impact-dependency-trade-off-analysis-engine.js");
await import("../../INFINICUS-ADI-16-Simulation-Orchestration-Scenario-Comparison-Engine/src/adi-16-simulation-orchestration-scenario-comparison-engine.js");
await import("../../INFINICUS-ADI-17-Risk-Opportunity-Downside-Assessment-Engine/src/adi-17-risk-opportunity-downside-assessment-engine.js");
await import("../../INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine/src/adi-18-multi-criteria-decision-scoring-ranking-engine.js");
await import("../../INFINICUS-ADI-19-Uncertainty-Confidence-Calibration-Engine/src/adi-19-uncertainty-confidence-calibration-engine.js");
await import("../src/adi-20-explainability-evidence-trace-reasoning-engine.js");

const ADI = globalThis.INFINICUS.ADI;
const blocks = ADI.blocks;
const block = blocks["ADI-20"];
assert.ok(block, "block ADI-20 not registered on INFINICUS.ADI.blocks");
assert.equal(typeof block.createExplainabilityEngine, "function");
assert.equal(typeof block.attachToADIRuntime, "function");

const runtime = blocks["ADI-01"].installGlobal(globalThis);
assert.ok(runtime, "ADI-01 runtime not installed");
{
  const result = blocks["ADI-02"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-02 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-03"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-03 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-04"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-04 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-05"].attachToADIRuntime(runtime, { readSnapshot: async () => null });
  assert.equal(result.ok, true, "attach ADI-05 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-06"].attachToADIRuntime(runtime, { readCompletedRun: async () => null });
  assert.equal(result.ok, true, "attach ADI-06 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-07"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-07 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-08"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-08 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-09"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-09 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-10"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-10 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-11"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-11 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-12"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-12 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-13"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-13 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-14"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-14 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-15"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-15 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-16"].attachToADIRuntime(runtime, { executeScenario: async () => { throw new Error("not connected"); } });
  assert.equal(result.ok, true, "attach ADI-16 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-17"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-17 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-18"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-18 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-19"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-19 failed: " + JSON.stringify(result.error));
}
{
  const result = blocks["ADI-20"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-20 failed: " + JSON.stringify(result.error));
}

// service is registered after the attach chain
const service = runtime.getService("adi.explainability");
assert.equal(service.ok, true, "service adi.explainability not registered");
assert.equal(service.data.blockId, "ADI-20");

console.log("ADI-20 tests passed.");
