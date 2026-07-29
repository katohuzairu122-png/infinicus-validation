(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.capacityUtilizationPercent != null &&
      profile.capacityUtilizationPercent > 95
    ) {
      add("OVER_CAPACITY", "critical", "Capacity utilization exceeds 95%.", "capacityUtilizationPercent");
    }

    if (
      profile.capacityUtilizationPercent != null &&
      profile.capacityUtilizationPercent < 50
    ) {
      add("UNDER_UTILIZATION", "warning", "Capacity utilization is below 50%.", "capacityUtilizationPercent");
    }

    if (
      profile.slaCompliancePercent != null &&
      profile.slaCompliancePercent < 90
    ) {
      add("SLA_BREACH_RISK", "warning", "SLA compliance is below 90%.", "slaCompliancePercent");
    }

    if (
      profile.defectRatePercent != null &&
      profile.defectRatePercent > 5
    ) {
      add("HIGH_DEFECT_RATE", "critical", "Defect rate exceeds 5%.", "defectRatePercent");
    }

    if (
      profile.productivityGrowthPercent != null &&
      profile.productivityGrowthPercent > 10
    ) {
      add("PRODUCTIVITY_GAIN", "opportunity", "Productivity has improved by more than 10%.", "productivityGrowthPercent");
    }

    if (
      profile.throughputGrowthPercent != null &&
      profile.throughputGrowthPercent > 10
    ) {
      add("THROUGHPUT_GROWTH", "opportunity", "Throughput is growing strongly.", "throughputGrowthPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.operationsSignalEngine =
    Object.freeze({ generate });
})(window);
