(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (!existing || new Date(result.calculatedAt) > new Date(existing.calculatedAt)) {
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
        .getIntelligenceHandoff({ intelligenceHandoffId });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      headcount:
        read(byCode, ["headcount", "employee_headcount"]),
      attendanceRatePercent:
        read(byCode, ["attendance_rate", "attendance_rate_percent"]),
      absenceRatePercent:
        read(byCode, ["absence_rate", "absence_rate_percent"]),
      employeeTurnoverRatePercent:
        read(byCode, ["employee_turnover_rate", "employee_turnover_rate_percent"]),
      employeeRetentionRatePercent:
        read(byCode, ["employee_retention_rate", "employee_retention_rate_percent"]),
      employeeEngagementScore:
        read(byCode, ["employee_engagement_score"]),
      workforceProductivity:
        read(byCode, ["workforce_productivity", "output_per_employee"]),
      workforceProductivityGrowthPercent:
        read(byCode, ["workforce_productivity_growth_percent"]),
      averageWorkloadUtilizationPercent:
        read(byCode, ["average_workload_utilization_percent"]),
      criticalSkillCoveragePercent:
        read(byCode, ["critical_skill_coverage_percent"]),
      trainingCompletionRatePercent:
        read(byCode, ["training_completion_rate_percent"]),
      vacancyRatePercent:
        read(byCode, ["vacancy_rate_percent"])
    };

    const health =
      global.INFINICUS.BI
        .workforceHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .workforceSignalEngine
        .generate(profile);

    const teamRanking =
      global.INFINICUS.BI
        .workforceRanker
        .rank(results, [
          "productivity_by_team",
          "engagement_by_team",
          "retention_by_team"
        ]);

    const roleRiskRanking =
      global.INFINICUS.BI
        .workforceRanker
        .rank(results, [
          "turnover_by_role",
          "vacancy_rate_by_role",
          "workload_by_role"
        ]);

    const locationRanking =
      global.INFINICUS.BI
        .workforceRanker
        .rank(results, [
          "productivity_by_location",
          "attendance_by_location",
          "engagement_by_location"
        ]);

    const workforceAnalysis = {
      workforceAnalysisId:
        runtime.createId("bi_workforce_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile: runtime.clone(profile),
      health: runtime.clone(health),
      teamRanking: teamRanking.map(runtime.clone),
      roleRiskRanking: roleRiskRanking.map(runtime.clone),
      locationRanking: locationRanking.map(runtime.clone),
      summary: {
        headcount: profile.headcount,
        retention:
          profile.employeeRetentionRatePercent != null
            ? `${profile.employeeRetentionRatePercent}%`
            : "insufficient data",
        engagement: profile.employeeEngagementScore,
        productivityGrowth:
          profile.workforceProductivityGrowthPercent != null
            ? `${profile.workforceProductivityGrowthPercent}%`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.BI
      .workforceStore
      .put("analyses", workforceAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        workforceSignalId:
          runtime.createId("bi_workforce_signal"),
        workforceAnalysisId:
          workforceAnalysis.workforceAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .workforceStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-17",
      workforceAnalysisId:
        workforceAnalysis.workforceAnalysisId,
      calculationRunId:
        workforceAnalysis.calculationRunId,
      correlationId:
        workforceAnalysis.correlationId,
      workforceHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      teamRanking:
        teamRanking.map(runtime.clone),
      roleRiskRanking:
        roleRiskRanking.map(runtime.clone),
      locationRanking:
        locationRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .workforceStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.workforce_intelligence.completed",
      {
        workforceAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      workforceAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ workforceAnalysisId }) =>
      global.INFINICUS.BI.workforceStore.get(
        "analyses",
        workforceAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.workforceStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.workforceStore.list("signals")
  });

  runtime.registerService(
    "bi.workforce_intelligence",
    api,
    { block: "BI-17" }
  );

  runtime.registerRoute(
    "bi.workforce_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.workforceIntelligenceEngine = api;
})(window);
