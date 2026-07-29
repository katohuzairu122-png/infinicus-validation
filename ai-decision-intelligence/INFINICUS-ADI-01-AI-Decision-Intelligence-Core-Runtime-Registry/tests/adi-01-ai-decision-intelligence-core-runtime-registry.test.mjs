import assert from "node:assert/strict";

// Browser-global IIFEs target window; provide it for Node.
globalThis.window ??= globalThis;

await import("../src/adi-01-ai-decision-intelligence-core-runtime-registry.js");

const ADI = globalThis.INFINICUS.ADI;
const blocks = ADI.blocks;
const block = blocks["ADI-01"];
assert.ok(block, "block ADI-01 not registered on INFINICUS.ADI.blocks");
assert.equal(typeof block.createADIRuntime, "function");
assert.equal(typeof block.installGlobal, "function");

const runtime = blocks["ADI-01"].installGlobal(globalThis);
assert.ok(runtime, "ADI-01 runtime not installed");


// runtime behaviour
const diag = runtime.diagnose();
assert.equal(diag.ok, true);
assert.equal(diag.data.blockId, "ADI-01");
const reg = runtime.registerService("test.service", { hello: true }, { blockId: "TEST" });
assert.equal(reg.ok, true);
assert.equal(runtime.getService("test.service").ok, true);
const manifest = runtime.getBlockManifest();
assert.equal(manifest.ok, true);
assert.equal(manifest.data.length, 25);
assert.equal(block.DECISION_STATES.length, 13);
assert.equal(block.lifecycle.canTransition("received", "validated"), true);
assert.equal(block.lifecycle.canTransition("received", "recommended"), false);

console.log("ADI-01 tests passed.");
