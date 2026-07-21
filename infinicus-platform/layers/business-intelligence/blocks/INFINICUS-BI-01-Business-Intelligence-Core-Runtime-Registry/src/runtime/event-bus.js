(function (global) {
  "use strict";

  const result = global.INFINICUS.BI.resultEnvelope;
  const listeners = new Map();

  function on(eventName, handler) {
    if (!eventName || typeof handler !== "function") {
      return result.failure(
        "EVENT_SUBSCRIPTION_INVALID",
        "eventName and handler are required."
      );
    }

    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(handler);

    return result.success({
      eventName,
      unsubscribe() {
        listeners.get(eventName)?.delete(handler);
      }
    });
  }

  async function emit(eventName, detail = {}, meta = {}) {
    const handlers = [...(listeners.get(eventName) || [])];
    const outcomes = [];

    for (const handler of handlers) {
      try {
        outcomes.push({
          ok: true,
          value: await handler(structuredClone(detail))
        });
      } catch (error) {
        outcomes.push({
          ok: false,
          error: error?.message || "Event handler failed."
        });
      }
    }

    global.dispatchEvent(
      new CustomEvent(eventName, {
        detail: structuredClone(detail)
      })
    );

    return result.success({
      eventName,
      deliveredTo: handlers.length,
      outcomes
    }, meta);
  }

  function diagnostics() {
    return {
      eventTypes: [...listeners.keys()],
      listenerCount: [...listeners.values()]
        .reduce((sum, set) => sum + set.size, 0)
    };
  }

  global.INFINICUS.BI.eventBus = Object.freeze({
    on,
    emit,
    diagnostics
  });
})(window);
