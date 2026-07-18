import { createRegistry } from "./registry.js";
import { failure } from "./result-envelope.js";

export function createRouteRegistry() {
  const registry = createRegistry("route");

  async function dispatch(name, request = {}, context = {}) {
    const resolved = registry.get(name);
    if (!resolved.ok) return resolved;
    try {
      return await resolved.data(request, context);
    } catch (error) {
      return failure("ADI_ROUTE_FAILED", `Route failed: ${name}`, { message: error.message });
    }
  }

  return Object.freeze({ register: registry.register, describe: registry.describe, list: registry.list, dispatch });
}
