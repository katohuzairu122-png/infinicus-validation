import { createId } from "./id-factory.js";
import { success, failure } from "./result-envelope.js";

export function createEventBus({ historyLimit = 1000 } = {}) {
  const listeners = new Map();
  const history = [];

  function subscribe(topic, handler) {
    if (!topic || typeof handler !== "function") {
      return failure("ADI_EVENT_SUBSCRIPTION_INVALID", "Topic and handler are required.");
    }
    const topicListeners = listeners.get(topic) ?? new Set();
    topicListeners.add(handler);
    listeners.set(topic, topicListeners);
    return success(() => topicListeners.delete(handler));
  }

  async function emit(topic, payload = null, context = {}) {
    if (!topic) return failure("ADI_EVENT_TOPIC_REQUIRED", "Event topic is required.");
    const event = Object.freeze({
      eventId: createId("evt"), topic, payload, context: Object.freeze({ ...context }),
      occurredAt: new Date().toISOString()
    });
    history.push(event);
    if (history.length > historyLimit) history.splice(0, history.length - historyLimit);
    const handlers = [...(listeners.get(topic) ?? []), ...(listeners.get("*") ?? [])];
    const errors = [];
    for (const handler of handlers) {
      try { await handler(event); } catch (error) { errors.push(error.message); }
    }
    return success(event, errors.length ? { listenerErrors: errors } : {});
  }

  return Object.freeze({ subscribe, emit, history: () => success([...history]) });
}
