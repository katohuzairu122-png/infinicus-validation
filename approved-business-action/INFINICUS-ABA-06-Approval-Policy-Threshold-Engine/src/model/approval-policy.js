(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_APPROVAL_POLICY_INVALID",
        "Approval policy name and code are required."
      );
    }

    return runtime.success({
      approvalPolicyId:
        input.approvalPolicyId ||
        runtime.createId("aba_approval_policy"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      description:
        String(input.description || ""),
      priority:
        Number(input.priority || 0),
      status:
        String(input.status || "active"),
      validFrom:
        input.validFrom || new Date().toISOString(),
      validUntil:
        input.validUntil || null,
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.approvalPolicyModel =
    Object.freeze({ create });
})(window);
