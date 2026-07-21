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
      profile.employeeTurnoverRatePercent != null &&
      profile.employeeTurnoverRatePercent > 15
    ) {
      add("HIGH_EMPLOYEE_TURNOVER", "critical", "Employee turnover exceeds 15%.", "employeeTurnoverRatePercent");
    }

    if (
      profile.absenceRatePercent != null &&
      profile.absenceRatePercent > 5
    ) {
      add("HIGH_ABSENCE_RATE", "warning", "Employee absence rate exceeds 5%.", "absenceRatePercent");
    }

    if (
      profile.employeeEngagementScore != null &&
      profile.employeeEngagementScore < 3
    ) {
      add("LOW_ENGAGEMENT", "warning", "Employee engagement score is below 3 out of 5.", "employeeEngagementScore");
    }

    if (
      profile.averageWorkloadUtilizationPercent != null &&
      profile.averageWorkloadUtilizationPercent > 95
    ) {
      add("WORKLOAD_OVERLOAD", "critical", "Average workload utilization exceeds 95%.", "averageWorkloadUtilizationPercent");
    }

    if (
      profile.workforceProductivityGrowthPercent != null &&
      profile.workforceProductivityGrowthPercent > 10
    ) {
      add("PRODUCTIVITY_IMPROVEMENT", "opportunity", "Workforce productivity improved by more than 10%.", "workforceProductivityGrowthPercent");
    }

    if (
      profile.criticalSkillCoveragePercent != null &&
      profile.criticalSkillCoveragePercent >= 90
    ) {
      add("STRONG_SKILL_COVERAGE", "opportunity", "Critical skill coverage is at least 90%.", "criticalSkillCoveragePercent");
    }

    return signals;
  }

  global.INFINICUS.BI.workforceSignalEngine =
    Object.freeze({ generate });
})(window);
