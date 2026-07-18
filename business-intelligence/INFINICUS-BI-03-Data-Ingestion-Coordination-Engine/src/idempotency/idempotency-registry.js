(function (global) {
  "use strict";

  const keys = new Map();

  function reserve(key, metadata = {}) {
    const normalized = String(key || "").trim();

    if (!normalized) {
      return {
        reserved: false,
        reason: "Idempotency key is required."
      };
    }

    if (keys.has(normalized)) {
      return {
        reserved: false,
        reason: "Duplicate idempotency key.",
        existing: structuredClone(keys.get(normalized))
      };
    }

    const record = {
      key: normalized,
      metadata: structuredClone(metadata),
      reservedAt: new Date().toISOString()
    };

    keys.set(normalized, record);

    return {
      reserved: true,
      record
    };
  }

  function get(key) {
    return keys.get(String(key || "")) || null;
  }

  global.INFINICUS.BI.ingestionIdempotencyRegistry =
    Object.freeze({
      reserve,
      get
    });
})(window);
