(function (global) {
  "use strict";

  const createRegistry =
    global.INFINICUS.DT.registryFactory.createRegistry;

  const registries = Object.freeze({
    services: createRegistry("service"),
    routes: createRegistry("route"),
    entities: createRegistry("entity"),
    states: createRegistry("state"),
    schemas: createRegistry("schema"),
    events: createRegistry("event"),
    adapters: createRegistry("adapter"),
    twins: createRegistry("twin")
  });

  const eventBus =
    global.INFINICUS.DT.eventBusFactory.createEventBus();

  async function callRoute(routeId, payload = {}) {
    const route = registries.routes.get(routeId);

    if (!route.ok) return route;

    try {
      return await route.data.value(
        structuredClone(payload)
      );
    } catch (error) {
      return global.INFINICUS.DT.result.failure(
        "ROUTE_EXECUTION_FAILED",
        error?.message || "Digital Twin route failed.",
        { routeId }
      );
    }
  }

  function diagnostics() {
    return global.INFINICUS.DT.result.success({
      layer:
        global.INFINICUS.DT.manifest.layer,
      version:
        global.INFINICUS.DT.manifest.version,
      blockCount:
        global.INFINICUS.DT.manifest.blockCount,
      registries:
        Object.fromEntries(
          Object.entries(registries).map(
            ([name, registry]) => [
              name,
              registry.size()
            ]
          )
        ),
      generatedAt:
        new Date().toISOString()
    });
  }

  const runtime = Object.freeze({
    success:
      global.INFINICUS.DT.result.success,
    failure:
      global.INFINICUS.DT.result.failure,
    createId:
      global.INFINICUS.DT.id.createId,
    clone:
      value => structuredClone(value),
    lifecycle:
      global.INFINICUS.DT.lifecycle,
    manifest:
      global.INFINICUS.DT.manifest,
    registries,
    registerService:
      (id, value, metadata) =>
        registries.services.register(id, value, metadata),
    registerRoute:
      (id, value, metadata) =>
        registries.routes.register(id, value, metadata),
    registerEntity:
      (id, value, metadata) =>
        registries.entities.register(id, value, metadata),
    registerState:
      (id, value, metadata) =>
        registries.states.register(id, value, metadata),
    registerSchema:
      (id, value, metadata) =>
        registries.schemas.register(id, value, metadata),
    registerEvent:
      (id, value, metadata) =>
        registries.events.register(id, value, metadata),
    registerAdapter:
      (id, value, metadata) =>
        registries.adapters.register(id, value, metadata),
    registerTwin:
      (id, value, metadata) =>
        registries.twins.register(id, value, metadata),
    on:
      eventBus.on,
    emit:
      eventBus.emit,
    callRoute,
    diagnostics
  });

  global.INFINICUS.DT.runtime = runtime;
})(window);
