import test from "node:test";
import assert from "node:assert/strict";
import { createADIRuntime } from "../src/index.js";

test("runtime registers its core service and routes", async () => {
  const runtime = createADIRuntime();
  assert.equal(runtime.getService("adi.core_runtime").ok, true);
  assert.equal((await runtime.dispatch("adi.runtime.diagnose")).data.state, "ready");
  assert.equal(runtime.listRoutes().data.length, 2);
});

test("runtime rejects duplicate services", () => {
  const runtime = createADIRuntime();
  assert.equal(runtime.registerService("example", {}).ok, true);
  assert.equal(runtime.registerService("example", {}).error.code, "ADI_REGISTRY_DUPLICATE");
});

test("lifecycle prevents invalid approval bypass", () => {
  const runtime = createADIRuntime();
  const entity = { status: "received", statusHistory: [] };
  assert.equal(runtime.lifecycle.transition(entity, "handed_to_aba").ok, false);
  assert.equal(runtime.lifecycle.transition(entity, "validated").ok, true);
});
