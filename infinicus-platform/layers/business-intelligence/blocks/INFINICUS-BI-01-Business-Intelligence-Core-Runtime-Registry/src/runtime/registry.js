(function (global) {
  "use strict";

  const result = global.INFINICUS.BI.resultEnvelope;

  function createRegistry(type) {
    const records = new Map();

    function register(key, value, metadata = {}) {
      const normalizedKey = String(key || "").trim();

      if (!normalizedKey) {
        return result.failure(
          "REGISTRY_KEY_REQUIRED",
          `${type} key is required.`
        );
      }

      if (records.has(normalizedKey)) {
        return result.failure(
          "REGISTRY_DUPLICATE",
          `${type} already registered: ${normalizedKey}`
        );
      }

      const record = Object.freeze({
        key: normalizedKey,
        value,
        metadata: structuredClone(metadata),
        registeredAt: new Date().toISOString()
      });

      records.set(normalizedKey, record);
      return result.success(record);
    }

    function get(key) {
      const record = records.get(String(key || ""));
      return record
        ? result.success(record)
        : result.failure(
            "REGISTRY_NOT_FOUND",
            `${type} was not found: ${key}`
          );
    }

    function remove(key) {
      const normalizedKey = String(key || "");
      const existed = records.delete(normalizedKey);

      return existed
        ? result.success({ key: normalizedKey, removed: true })
        : result.failure(
            "REGISTRY_NOT_FOUND",
            `${type} was not found: ${normalizedKey}`
          );
    }

    function list() {
      return result.success(
        [...records.values()].map(record => ({
          key: record.key,
          metadata: structuredClone(record.metadata),
          registeredAt: record.registeredAt
        }))
      );
    }

    function has(key) {
      return records.has(String(key || ""));
    }

    function size() {
      return records.size;
    }

    return Object.freeze({
      register,
      get,
      remove,
      list,
      has,
      size
    });
  }

  global.INFINICUS.BI.createRegistry = createRegistry;
})(window);
