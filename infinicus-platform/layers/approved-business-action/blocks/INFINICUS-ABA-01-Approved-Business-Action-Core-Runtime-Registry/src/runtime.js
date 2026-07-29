(function (global) {
  "use strict";

  global.INFINICUS = global.INFINICUS || {};
  global.INFINICUS.ABA = global.INFINICUS.ABA || {};

  const services = new Map();
  const routes = new Map();
  const listeners = new Map();
  const lifecycles = new Map();
  const manifest = new Map();

  function clone(value) {
    if (value === undefined) return undefined;
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function createId(prefix = "aba") {
    const id = global.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${id}`;
  }

  function success(data, meta = {}) {
    return {
      ok: true,
      data: clone(data),
      error: null,
      meta: { timestamp: new Date().toISOString(), ...clone(meta) }
    };
  }

  function failure(code, message, details = {}, meta = {}) {
    return {
      ok: false,
      data: null,
      error: {
        code: String(code || "ABA_ERROR"),
        message: String(message || "Approved Business Action error."),
        details: clone(details)
      },
      meta: { timestamp: new Date().toISOString(), ...clone(meta) }
    };
  }

  function registerService(name, api, metadata = {}) {
    if (!name || typeof api !== "object") {
      return failure("ABA_SERVICE_INVALID", "Service name and API object are required.");
    }
    if (services.has(name)) {
      return failure("ABA_SERVICE_DUPLICATE", `Service already registered: ${name}`);
    }
    services.set(name, { api, metadata: clone(metadata) });
    return success({ name });
  }

  function getService(name) {
    const item = services.get(name);
    return item
      ? success(item.api, { serviceMetadata: item.metadata })
      : failure("ABA_SERVICE_NOT_FOUND", `Service not found: ${name}`);
  }

  function registerRoute(name, handler, metadata = {}) {
    if (!name || typeof handler !== "function") {
      return failure("ABA_ROUTE_INVALID", "Route name and handler are required.");
    }
    if (routes.has(name)) {
      return failure("ABA_ROUTE_DUPLICATE", `Route already registered: ${name}`);
    }
    routes.set(name, { handler, metadata: clone(metadata) });
    return success({ name });
  }

  async function dispatch(name, payload = {}, context = {}) {
    const route = routes.get(name);
    if (!route) return failure("ABA_ROUTE_NOT_FOUND", `Route not found: ${name}`);
    try {
      const result = await route.handler(clone(payload), clone(context));
      return result?.ok === true || result?.ok === false ? result : success(result);
    } catch (error) {
      return failure(
        "ABA_ROUTE_EXECUTION_FAILED",
        error?.message || "Route execution failed.",
        { route: name }
      );
    }
  }

  function on(eventName, listener) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(listener);
    return () => listeners.get(eventName)?.delete(listener);
  }

  async function emit(eventName, payload = {}) {
    const event = {
      eventId: createId("aba_event"),
      eventName,
      payload: clone(payload),
      occurredAt: new Date().toISOString()
    };
    const group = listeners.get(eventName) || new Set();
    const outcomes = await Promise.allSettled(
      [...group].map(listener => listener(clone(event)))
    );
    return success({
      event,
      listenerCount: group.size,
      rejectedCount: outcomes.filter(item => item.status === "rejected").length
    });
  }

  function registerLifecycle(name, definition) {
    if (!name || !definition?.initialState || !Array.isArray(definition.states)) {
      return failure("ABA_LIFECYCLE_INVALID", "Lifecycle name, initialState, and states are required.");
    }
    if (!definition.states.includes(definition.initialState)) {
      return failure("ABA_LIFECYCLE_INITIAL_STATE_INVALID", "initialState must exist in states.");
    }
    lifecycles.set(name, clone(definition));
    return success({ name });
  }

  function validateTransition(name, fromState, toState) {
    const lifecycle = lifecycles.get(name);
    if (!lifecycle) {
      return failure("ABA_LIFECYCLE_NOT_FOUND", `Lifecycle not found: ${name}`);
    }
    const allowed = lifecycle.transitions?.[fromState] || [];
    return allowed.includes(toState)
      ? success({ valid: true, fromState, toState })
      : failure(
          "ABA_TRANSITION_NOT_ALLOWED",
          `Transition not allowed: ${fromState} → ${toState}`,
          { allowed }
        );
  }

  function registerBlock(blockId, metadata = {}) {
    manifest.set(blockId, { blockId, ...clone(metadata) });
    return success(manifest.get(blockId));
  }

  function diagnostics() {
    return success({
      namespace: "window.INFINICUS.ABA",
      serviceCount: services.size,
      routeCount: routes.size,
      lifecycleCount: lifecycles.size,
      blockCount: manifest.size,
      services: [...services.keys()],
      routes: [...routes.keys()],
      lifecycles: [...lifecycles.keys()],
      blocks: [...manifest.values()].map(clone)
    });
  }

  const ACTION_LIFECYCLE = Object.freeze({
    initialState: "draft",
    states: Object.freeze([
      "draft", "pending_validation", "pending_approval", "approved",
      "scheduled", "executing", "completed", "verified", "rejected",
      "revoked", "expired", "blocked", "failed", "partially_completed",
      "rolled_back", "cancelled"
    ]),
    transitions: Object.freeze({
      draft: ["pending_validation", "cancelled"],
      pending_validation: ["pending_approval", "blocked", "cancelled"],
      pending_approval: ["approved", "rejected", "expired", "cancelled"],
      approved: ["scheduled", "revoked", "expired", "blocked"],
      scheduled: ["executing", "revoked", "expired", "blocked", "cancelled"],
      executing: ["completed", "failed", "partially_completed", "rolled_back"],
      completed: ["verified", "rolled_back"],
      partially_completed: ["completed", "failed", "rolled_back"],
      failed: ["rolled_back"],
      blocked: ["pending_validation", "cancelled"],
      verified: [], rejected: [], revoked: [], expired: [], rolled_back: [], cancelled: []
    })
  });

  registerLifecycle("approved_business_action", ACTION_LIFECYCLE);
  registerBlock("ABA-01", {
    name: "Approved Business Action Core Runtime and Registry",
    version: "1.0.0",
    status: "active"
  });

  global.INFINICUS.ABA.runtime = Object.freeze({
    clone, createId, success, failure, registerService, getService,
    registerRoute, dispatch, on, emit, registerLifecycle,
    validateTransition, registerBlock, diagnostics, ACTION_LIFECYCLE
  });
})(window);
