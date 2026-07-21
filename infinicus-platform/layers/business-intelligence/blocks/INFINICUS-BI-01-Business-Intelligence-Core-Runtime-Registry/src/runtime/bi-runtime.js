(function (global) {
  "use strict";

  const result = global.INFINICUS.BI.resultEnvelope;
  const createRegistry = global.INFINICUS.BI.createRegistry;
  const eventBus = global.INFINICUS.BI.eventBus;

  const services = createRegistry("service");
  const routes = createRegistry("route");
  const datasets = createRegistry("dataset");
  const metrics = createRegistry("metric");
  const connectors = createRegistry("connector");

  const createId = prefix =>
    `${String(prefix || "bi")}_${crypto.randomUUID()}`;

  const clone = value =>
    value == null ? value : structuredClone(value);

  async function call(routeName, payload = {}, meta = {}) {
    const found = routes.get(routeName);

    if (!found.ok) {
      return result.failure(
        "ROUTE_NOT_FOUND",
        `No BI route registered for ${routeName}.`,
        { routeName },
        meta
      );
    }

    const handler = found.data.value;

    if (typeof handler !== "function") {
      return result.failure(
        "ROUTE_HANDLER_INVALID",
        `BI route does not contain a callable handler: ${routeName}`,
        null,
        meta
      );
    }

    try {
      return await handler(clone(payload), meta);
    } catch (error) {
      return result.failure(
        "ROUTE_CALL_FAILED",
        error?.message || `BI route failed: ${routeName}`,
        { routeName },
        meta
      );
    }
  }

  function diagnostics() {
    const eventDiagnostics = eventBus.diagnostics();

    return result.success({
      layer: "Business Intelligence",
      version: "1.0.0",
      services: services.size(),
      routes: routes.size(),
      datasets: datasets.size(),
      metrics: metrics.size(),
      connectors: connectors.size(),
      eventTypes: eventDiagnostics.eventTypes.length,
      listeners: eventDiagnostics.listenerCount,
      checkedAt: new Date().toISOString()
    });
  }

  const runtime = Object.freeze({
    success: result.success,
    failure: result.failure,
    createId,
    clone,
    registerService: services.register,
    getService: services.get,
    listServices: services.list,
    registerRoute: routes.register,
    getRoute: routes.get,
    listRoutes: routes.list,
    call,
    registerDataset: datasets.register,
    getDataset: datasets.get,
    listDatasets: datasets.list,
    registerMetric: metrics.register,
    getMetric: metrics.get,
    listMetrics: metrics.list,
    registerConnector: connectors.register,
    getConnector: connectors.get,
    listConnectors: connectors.list,
    on: eventBus.on,
    emit: eventBus.emit,
    diagnostics
  });

  global.INFINICUS.BI.runtime = runtime;
})(window);
