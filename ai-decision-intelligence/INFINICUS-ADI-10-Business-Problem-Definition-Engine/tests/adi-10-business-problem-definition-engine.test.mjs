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
await import("../src/adi-10-business-problem-definition-engine.js");

const ADI = globalThis.INFINICUS.ADI;
const blocks = ADI.blocks;
const block = blocks["ADI-10"];
assert.ok(block, "block ADI-10 not registered on INFINICUS.ADI.blocks");
assert.equal(typeof block.createProblemDefinitionEngine, "function");
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

// service is registered after the attach chain
const service = runtime.getService("adi.problem_definition");
assert.equal(service.ok, true, "service adi.problem_definition not registered");
assert.equal(service.data.blockId, "ADI-10");

console.log("ADI-10 tests passed.");
