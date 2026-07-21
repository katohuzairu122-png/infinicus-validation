import { success, failure } from "./result-envelope.js";
import { createId } from "./id-factory.js";
import { createRegistry } from "./registry.js";
import { createEventBus } from "./event-bus.js";
import { createRouteRegistry } from "./route-registry.js";
import { lifecycle } from "./lifecycle.js";
import { ADI_BLOCK_MANIFEST } from "./block-manifest.js";

export function createADIRuntime(options = {}) {
  const registries = Object.freeze({
    services: createRegistry("service"), capabilities: createRegistry("capability"),
    decisionTypes: createRegistry("decision type"), policies: createRegistry("policy"),
    models: createRegistry("model"), prompts: createRegistry("prompt"),
    dataSources: createRegistry("data source"), handoffContracts: createRegistry("handoff contract")
  });
  const routes = createRouteRegistry();
  const events = createEventBus({ historyLimit: options.eventHistoryLimit ?? 1000 });
  const runtimeId = createId("runtime");

  const runtime = {
    runtimeId, blockId: "ADI-01", version: "1.0.0", lifecycle,
    success, failure, createId,
    registerService: registries.services.register, getService: registries.services.get,
    listServices: registries.services.list,
    registerCapability: registries.capabilities.register, listCapabilities: registries.capabilities.list,
    registerDecisionType: registries.decisionTypes.register, listDecisionTypes: registries.decisionTypes.list,
    registerPolicy: registries.policies.register, listPolicies: registries.policies.list,
    registerModel: registries.models.register, listModels: registries.models.list,
    registerPrompt: registries.prompts.register, listPrompts: registries.prompts.list,
    registerDataSource: registries.dataSources.register, listDataSources: registries.dataSources.list,
    registerHandoffContract: registries.handoffContracts.register,
    listHandoffContracts: registries.handoffContracts.list,
    registerRoute: routes.register, dispatch: routes.dispatch, listRoutes: routes.list,
    subscribe: events.subscribe, emit: events.emit, listEvents: events.history,
    getBlockManifest: () => success(ADI_BLOCK_MANIFEST.map(item => ({ ...item }))),
    diagnose: () => success({
      runtimeId, blockId: "ADI-01", version: "1.0.0", state: "ready",
      services: registries.services.list().data.length,
      routes: routes.list().data.length,
      events: events.history().data.length
    })
  };

  Object.freeze(runtime);
  runtime.registerService("adi.core_runtime", runtime, { blockId: "ADI-01", version: "1.0.0" });
  runtime.registerRoute("adi.runtime.diagnose", async () => runtime.diagnose(), { blockId: "ADI-01" });
  runtime.registerRoute("adi.runtime.manifest", async () => runtime.getBlockManifest(), { blockId: "ADI-01" });
  void runtime.emit("adi.runtime.ready", { runtimeId, blockId: "ADI-01", version: "1.0.0" });
  return runtime;
}
