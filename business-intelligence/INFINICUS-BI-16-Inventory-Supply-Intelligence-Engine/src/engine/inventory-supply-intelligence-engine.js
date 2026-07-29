(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({ intelligenceHandoffId } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      stockAvailabilityPercent:
        read(byCode, ["stock_availability", "stock_availability_percent"]),
      stockoutRatePercent:
        read(byCode, ["stockout_rate", "stockout_rate_percent"]),
      inventoryTurnover:
        read(byCode, ["inventory_turnover"]),
      inventoryTurnoverGrowthPercent:
        read(byCode, ["inventory_turnover_growth_percent"]),
      inventoryDaysOnHand:
        read(byCode, ["inventory_days_on_hand", "days_on_hand"]),
      excessInventoryValue:
        read(byCode, ["excess_inventory_value"]),
      obsoleteInventoryValue:
        read(byCode, ["obsolete_inventory_value"]),
      wasteRatePercent:
        read(byCode, ["waste_rate", "waste_rate_percent"]),
      shrinkageRatePercent:
        read(byCode, ["shrinkage_rate", "shrinkage_rate_percent"]),
      supplierOnTimeDeliveryPercent:
        read(byCode, ["supplier_on_time_delivery", "supplier_on_time_delivery_percent"]),
      averageSupplierLeadTimeDays:
        read(byCode, ["average_supplier_lead_time_days"]),
      reorderCoverageDays:
        read(byCode, ["reorder_coverage_days"])
    };

    const health =
      global.INFINICUS.BI
        .inventoryHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .inventorySignalEngine
        .generate(profile);

    const productRiskRanking =
      global.INFINICUS.BI
        .inventoryRanker
        .rank(results, [
          "stockout_rate_by_product",
          "days_on_hand_by_product",
          "waste_rate_by_product"
        ]);

    const warehouseRanking =
      global.INFINICUS.BI
        .inventoryRanker
        .rank(results, [
          "stock_availability_by_warehouse",
          "inventory_turnover_by_warehouse"
        ]);

    const supplierRanking =
      global.INFINICUS.BI
        .inventoryRanker
        .rank(results, [
          "supplier_on_time_delivery_by_supplier",
          "supplier_quality_score_by_supplier"
        ]);

    const inventoryAnalysis = {
      inventoryAnalysisId:
        runtime.createId("bi_inventory_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      productRiskRanking:
        productRiskRanking.map(runtime.clone),
      warehouseRanking:
        warehouseRanking.map(runtime.clone),
      supplierRanking:
        supplierRanking.map(runtime.clone),
      summary: {
        availability:
          profile.stockAvailabilityPercent != null
            ? `${profile.stockAvailabilityPercent}%`
            : "insufficient data",
        stockoutRate:
          profile.stockoutRatePercent != null
            ? `${profile.stockoutRatePercent}%`
            : "insufficient data",
        turnover:
          profile.inventoryTurnover,
        daysOnHand:
          profile.inventoryDaysOnHand
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .inventoryStore
      .put("analyses", inventoryAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        inventorySignalId:
          runtime.createId("bi_inventory_signal"),
        inventoryAnalysisId:
          inventoryAnalysis.inventoryAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .inventoryStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-16",
      inventoryAnalysisId:
        inventoryAnalysis.inventoryAnalysisId,
      calculationRunId:
        inventoryAnalysis.calculationRunId,
      correlationId:
        inventoryAnalysis.correlationId,
      inventoryHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      productRiskRanking:
        productRiskRanking.map(runtime.clone),
      warehouseRanking:
        warehouseRanking.map(runtime.clone),
      supplierRanking:
        supplierRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .inventoryStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.inventory_supply_intelligence.completed",
      {
        inventoryAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      inventoryAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ inventoryAnalysisId }) =>
      global.INFINICUS.BI.inventoryStore.get(
        "analyses",
        inventoryAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.inventoryStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.inventoryStore.list("signals")
  });

  runtime.registerService(
    "bi.inventory_supply_intelligence",
    api,
    { block: "BI-16" }
  );

  runtime.registerRoute(
    "bi.inventory_supply_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.inventorySupplyIntelligenceEngine = api;
})(window);
