(function (global) {
  "use strict";

  function createEventBus() {
    const listeners = new Map();

    function on(eventName, handler) {
      const name = String(eventName || "");

      if (!name || typeof handler !== "function") {
        return global.INFINICUS.DT.result.failure(
          "EVENT_SUBSCRIPTION_INVALID",
          "Event name and handler are required."
        );
      }

      if (!listeners.has(name)) {
        listeners.set(name, new Set());
      }

      listeners.get(name).add(handler);

      return global.INFINICUS.DT.result.success({
        eventName: name,
        unsubscribe() {
          listeners.get(name)?.delete(handler);
        }
      });
    }

    async function emit(eventName, payload = null, metadata = {}) {
      const name = String(eventName || "");
      const handlers = [...(listeners.get(name) || [])];

      const event = Object.freeze({
        eventId:
          global.INFINICUS.DT.id.createId("dt_event"),
        eventName: name,
        payload: structuredClone(payload),
        metadata: structuredClone(metadata),
        occurredAt: new Date().toISOString()
      });

      const outcomes = [];

      for (const handler of handlers) {
        try {
          outcomes.push(await handler(event));
        } catch (error) {
          outcomes.push({
            ok: false,
            error:
              error?.message || "Event handler failed."
          });
        }
      }

      return global.INFINICUS.DT.result.success({
        event,
        handlerCount: handlers.length,
        outcomes
      });
    }

    return Object.freeze({ on, emit });
  }

  global.INFINICUS.DT.eventBusFactory =
    Object.freeze({ createEventBus });
})(window);
