import { createDecisionRequestIntakeEngine } from "./intake-engine.js";
import { failure } from "./result-envelope.js";

export function attachToADIRuntime(runtime, options = {}) {
  const required = ["registerService", "registerRoute", "emit", "createId"];
  if (!runtime || required.some(name => typeof runtime[name] !== "function")) {
    return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
  }
  const engine = createDecisionRequestIntakeEngine({
    ...options, createId: runtime.createId, emit: runtime.emit
  });
  const service = runtime.registerService("adi.decision_request_intake", engine, { blockId: "ADI-02", version: "1.0.0" });
  if (!service.ok) return service;
  const route = runtime.registerRoute("adi.decision_request.submit", (request, context) => engine.submit(request, context), { blockId: "ADI-02" });
  if (!route.ok) return route;
  void runtime.emit("adi.block.ready", { blockId: "ADI-02", version: "1.0.0" });
  return runtime.success({ blockId: "ADI-02", version: "1.0.0", service: "adi.decision_request_intake", route: "adi.decision_request.submit" });
}
