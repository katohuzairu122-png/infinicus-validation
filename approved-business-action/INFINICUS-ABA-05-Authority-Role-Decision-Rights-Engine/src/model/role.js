(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_ROLE_INVALID",
        "Role name and code are required."
      );
    }

    return runtime.success({
      roleId:
        input.roleId || runtime.createId("aba_role"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      departmentId:
        input.departmentId || null,
      legalEntityId:
        input.legalEntityId || null,
      rank:
        Number(input.rank || 0),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.roleModel =
    Object.freeze({ create });
})(window);
