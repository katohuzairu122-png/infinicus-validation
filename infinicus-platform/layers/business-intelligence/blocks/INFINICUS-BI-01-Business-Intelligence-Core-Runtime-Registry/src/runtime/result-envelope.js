(function (global) {
  "use strict";

  const now = () => new Date().toISOString();

  const success = (data = null, meta = {}) => Object.freeze({
    ok: true,
    code: "OK",
    message: meta.message || "Success",
    data,
    warnings: Array.isArray(meta.warnings) ? [...meta.warnings] : [],
    correlationId: meta.correlationId || null,
    timestamp: now()
  });

  const failure = (code, message, details = null, meta = {}) => Object.freeze({
    ok: false,
    code: String(code || "UNKNOWN_ERROR"),
    message: String(message || "Operation failed."),
    data: details,
    warnings: Array.isArray(meta.warnings) ? [...meta.warnings] : [],
    correlationId: meta.correlationId || null,
    timestamp: now()
  });

  global.INFINICUS = global.INFINICUS || {};
  global.INFINICUS.BI = global.INFINICUS.BI || {};
  global.INFINICUS.BI.resultEnvelope = Object.freeze({
    success,
    failure
  });
})(window);
