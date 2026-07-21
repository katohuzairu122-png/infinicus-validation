(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_ACTION_CATEGORY_INVALID",
        "Action category name and code are required."
      );
    }

    return runtime.success({
      actionCategoryId:
        input.actionCategoryId || runtime.createId("aba_action_category"),
      name: String(input.name),
      code: String(input.code)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      description: String(input.description || ""),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionCategoryModel =
    Object.freeze({ create });
})(window);
