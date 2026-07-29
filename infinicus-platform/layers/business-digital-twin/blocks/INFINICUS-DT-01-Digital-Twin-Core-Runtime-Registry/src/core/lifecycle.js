(function (global) {
  "use strict";

  const STATES = Object.freeze([
    "initializing",
    "inactive",
    "synchronizing",
    "active",
    "degraded",
    "suspended",
    "retired"
  ]);

  const allowed = Object.freeze({
    initializing: ["inactive", "degraded"],
    inactive: ["synchronizing", "retired"],
    synchronizing: ["active", "degraded", "suspended"],
    active: ["synchronizing", "degraded", "suspended", "retired"],
    degraded: ["synchronizing", "active", "suspended", "retired"],
    suspended: ["synchronizing", "retired"],
    retired: []
  });

  function mayTransition(from, to) {
    return STATES.includes(from) &&
      STATES.includes(to) &&
      (allowed[from] || []).includes(to);
  }

  global.INFINICUS.DT.lifecycle =
    Object.freeze({
      STATES,
      allowed,
      mayTransition
    });
})(window);
