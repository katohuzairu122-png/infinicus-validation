import test from "node:test";
import assert from "node:assert/strict";
import { attachToADIRuntime } from "../src/index.js";

test("attaches service and route to a compatible runtime", async () => {
  const services = new Map(); const routes = new Map();
  const runtime = {
    createId:prefix => `${prefix}_fixed`, emit:async () => ({ok:true}), success:data => ({ok:true,data}),
    registerService:(name,value) => { services.set(name,value); return {ok:true}; },
    registerRoute:(name,value) => { routes.set(name,value); return {ok:true}; }
  };
  const attached = attachToADIRuntime(runtime, { now:() => new Date("2026-07-18T00:00:00Z") });
  assert.equal(attached.ok, true);
  assert.equal(services.has("adi.decision_request_intake"), true);
  assert.equal(routes.has("adi.decision_request.submit"), true);
});

test("rejects an incompatible runtime", () => {
  assert.equal(attachToADIRuntime({}).error.code, "ADI_RUNTIME_INCOMPATIBLE");
});
