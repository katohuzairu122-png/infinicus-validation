(function (global) {
  "use strict";

  const ACCOUNT_TYPES = Object.freeze([
    "asset",
    "liability",
    "equity",
    "revenue",
    "cost",
    "expense",
    "cash_flow",
    "budget",
    "target"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.code ||
      !input.name ||
      !ACCOUNT_TYPES.includes(input.accountType)
    ) {
      return runtime.failure(
        "FINANCIAL_ACCOUNT_INVALID",
        "twinId, code, name, and supported accountType are required."
      );
    }

    return runtime.success({
      financialAccountId:
        input.financialAccountId ||
        runtime.createId("dt_financial_account"),
      twinId:
        String(input.twinId),
      organizationUnitId:
        input.organizationUnitId || null,
      code:
        String(input.code).trim().toUpperCase(),
      name:
        String(input.name),
      accountType:
        input.accountType,
      parentFinancialAccountId:
        input.parentFinancialAccountId || null,
      currency:
        String(input.currency || "USD").toUpperCase(),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.financialAccountModel =
    Object.freeze({
      ACCOUNT_TYPES,
      create
    });
})(window);
