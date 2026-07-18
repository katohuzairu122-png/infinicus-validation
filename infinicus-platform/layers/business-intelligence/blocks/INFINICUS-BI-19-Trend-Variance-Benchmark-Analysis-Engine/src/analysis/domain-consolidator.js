(function (global) {
  "use strict";

  function consolidate(handoffs = []) {
    return handoffs.map(handoff => ({
      sourceBlock:
        handoff.sourceBlock,
      analysisHandoffId:
        handoff.analysisHandoffId,
      correlationId:
        handoff.correlationId,
      health:
        handoff.financialHealth ||
        handoff.salesHealth ||
        handoff.customerHealth ||
        handoff.marketingHealth ||
        handoff.operationsHealth ||
        handoff.inventoryHealth ||
        handoff.workforceHealth ||
        handoff.marketHealth ||
        null,
      profile:
        structuredClone(handoff.profile || {}),
      signals:
        structuredClone(handoff.signals || [])
    }));
  }

  global.INFINICUS.BI.domainIntelligenceConsolidator =
    Object.freeze({ consolidate });
})(window);
