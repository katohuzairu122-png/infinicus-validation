import assert from "node:assert/strict";

// Browser-global IIFEs target window; provide it for Node.
globalThis.window ??= globalThis;

await import("../../INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/src/adi-01-ai-decision-intelligence-core-runtime-registry.js");
await import("../../INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/src/adi-02-decision-request-intake-validation-engine.js");
await import("../../INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/src/adi-03-decision-identity-ownership-access-control-engine.js");
await import("../../INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/src/adi-04-decision-context-acquisition-normalization-engine.js");
await import("../src/adi-05-business-digital-twin-context-adapter.js");

const ADI = globalThis.INFINICUS.ADI;
const blocks = ADI.blocks;
const block = blocks["ADI-05"];
assert.ok(block, "block ADI-05 not registered on INFINICUS.ADI.blocks");
assert.equal(typeof block.createDigitalTwinContextAdapter, "function");
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

// service is registered after the attach chain
const service = runtime.getService("adi.digital_twin_context_adapter");
assert.equal(service.ok, true, "service adi.digital_twin_context_adapter not registered");
assert.equal(service.data.blockId, "ADI-05");

console.log("ADI-05 tests passed.");
