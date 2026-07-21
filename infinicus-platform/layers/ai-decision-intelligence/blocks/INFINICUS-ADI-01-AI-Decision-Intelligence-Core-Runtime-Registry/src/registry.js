import { success, failure } from "./result-envelope.js";

export function createRegistry(kind) {
  const records = new Map();

  function register(id, value, metadata = {}) {
    if (typeof id !== "string" || !id.trim() || value == null) {
      return failure("ADI_REGISTRY_INVALID", `${kind} id and value are required.`);
    }
    if (records.has(id)) {
      return failure("ADI_REGISTRY_DUPLICATE", `${kind} already exists: ${id}`);
    }
    const record = Object.freeze({
      id,
      value,
      metadata: Object.freeze({ ...metadata }),
      registeredAt: new Date().toISOString()
    });
    records.set(id, record);
    return success({ id, metadata: record.metadata });
  }

  function get(id) {
    const record = records.get(id);
    return record ? success(record.value, { id }) :
      failure("ADI_REGISTRY_NOT_FOUND", `${kind} was not found: ${id}`);
  }

  function describe(id) {
    const record = records.get(id);
    return record ? success({ id: record.id, metadata: record.metadata, registeredAt: record.registeredAt }) :
      failure("ADI_REGISTRY_NOT_FOUND", `${kind} was not found: ${id}`);
  }

  function list() {
    return success([...records.values()].map(({ id, metadata, registeredAt }) => ({
      id, metadata: { ...metadata }, registeredAt
    })));
  }

  return Object.freeze({ kind, register, get, describe, list, has: id => records.has(id) });
}
