(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.financialAccountId ||
      !input.period ||
      !Number.isFinite(Number(input.value))
    ) {
      return runtime.failure(
        "FINANCIAL_STATE_INVALID",
        "twinId, financialAccountId, period, and numeric value are required."
      );
    }

    return runtime.success({
      financialStateId:
        input.financialStateId ||
        runtime.createId("dt_financial_state"),
      twinId:
        String(input.twinId),
      financialAccountId:
        String(input.financialAccountId),
      organizationUnitId:
        input.organizationUnitId || null,
      period:
        String(input.period),
      currency:
        String(input.currency || "USD").toUpperCase(),
      value:
        Number(input.value),
      sourceType:
        String(input.sourceType || "observed"),
      formula:
        input.formula || null,
      assumptions:
        runtime.clone(input.assumptions || []),
      sourceReferences:
        runtime.clone(input.sourceReferences || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      status:
        String(input.status || "current"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.financialStateModel =
    Object.freeze({ create });
})(window);
