(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const retention =
      profile.employeeRetentionRatePercent == null
        ? 50
        : clamp(profile.employeeRetentionRatePercent);

    const attendance =
      profile.attendanceRatePercent == null
        ? 50
        : clamp(profile.attendanceRatePercent);

    const engagement =
      profile.employeeEngagementScore == null
        ? 50
        : clamp(profile.employeeEngagementScore * 20);

    const productivity =
      profile.workforceProductivityGrowthPercent == null
        ? 50
        : clamp(50 + profile.workforceProductivityGrowthPercent * 2);

    const skills =
      profile.criticalSkillCoveragePercent == null
        ? 50
        : clamp(profile.criticalSkillCoveragePercent);

    const total =
      retention * 0.25 +
      attendance * 0.2 +
      engagement * 0.2 +
      productivity * 0.2 +
      skills * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        retention,
        attendance,
        engagement,
        productivity,
        skills
      }
    };
  }

  global.INFINICUS.BI.workforceHealthScorer =
    Object.freeze({ score });
})(window);
