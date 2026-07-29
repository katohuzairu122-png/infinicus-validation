import assert from "node:assert/strict";

// Browser-global IIFEs target window; provide it for Node.
globalThis.window ??= globalThis;

await import("../../INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/adi-01-ai-decision-intelligence-core-runtime-registry.js");
await import("../src/adi-02-decision-request-intake-validation-engine.js");

const ADI = globalThis.INFINICUS.ADI;
const blocks = ADI.blocks;
const block = blocks["ADI-02"];
assert.ok(block, "block ADI-02 not registered on INFINICUS.ADI.blocks");
assert.equal(typeof block.createDecisionRequestIntakeEngine, "function");
assert.equal(typeof block.attachToADIRuntime, "function");

const runtime = blocks["ADI-01"].installGlobal(globalThis);
assert.ok(runtime, "ADI-01 runtime not installed");
{
  const result = blocks["ADI-02"].attachToADIRuntime(runtime, {});
  assert.equal(result.ok, true, "attach ADI-02 failed: " + JSON.stringify(result.error));
}

// service is registered after the attach chain
const service = runtime.getService("adi.decision_request_intake");
assert.equal(service.ok, true, "service adi.decision_request_intake not registered");
assert.equal(service.data.blockId, "ADI-02");

console.log("ADI-02 tests passed.");
