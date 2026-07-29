(function (global) {
  "use strict";

  function createId(prefix = "dt") {
    const random =
      global.crypto?.randomUUID?.() ||
      `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return `${String(prefix).replace(/[^a-zA-Z0-9_-]/g, "_")}_${random}`;
  }

  global.INFINICUS.DT.id =
    Object.freeze({ createId });
})(window);
