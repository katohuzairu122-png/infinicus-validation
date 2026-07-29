(function (global) {
  "use strict";

  function success(data = null, metadata = {}) {
    return Object.freeze({
      ok: true,
      data,
      error: null,
      metadata: structuredClone(metadata)
    });
  }

  function failure(code, message, details = null, metadata = {}) {
    return Object.freeze({
      ok: false,
      data: null,
      error: {
        code: String(code || "UNKNOWN_ERROR"),
        message: String(message || "An unknown error occurred."),
        details: structuredClone(details)
      },
      metadata: structuredClone(metadata)
    });
  }

  global.INFINICUS.DT.result =
    Object.freeze({ success, failure });
})(window);
