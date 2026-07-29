(function (global) {
  "use strict";

  function domainFromKey(stateKey) {
    return String(stateKey || "").split(".")[0] || "unknown";
  }

  function validate({
    handoff,
    policy
  }) {
    const issues = [];
    const states = handoff.synchronizedState || [];
    const domains = new Set(states.map(item => domainFromKey(item.stateKey)));

    for (const domain of policy.requiredDomains) {
      if (!domains.has(domain)) {
        issues.push({
          code: "REQUIRED_DOMAIN_MISSING",
          severity: "high",
          domain,
          message: `Required twin domain is missing: ${domain}`
        });
      }
    }

    const invalidConfidence = states.filter(item =>
      Number(item.confidence) < 0 ||
      Number(item.confidence) > 1
    );

    if (invalidConfidence.length) {
      issues.push({
        code: "INVALID_CONFIDENCE",
        severity: "high",
        count: invalidConfidence.length,
        message: "One or more states have invalid confidence values."
      });
    }

    const simulated = states.filter(item =>
      item.sourceType === "simulated"
    );

    if (simulated.length) {
      issues.push({
        code: "SIMULATED_STATE_IN_ACTUAL_TWIN",
        severity: "critical",
        count: simulated.length,
        message: "Simulated state is present in the actual synchronized twin."
      });
    }

    const assumed = states.filter(item =>
      item.sourceType === "assumed"
    );

    const assumedPercent =
      states.length === 0
        ? 0
        : assumed.length / states.length * 100;

    if (assumedPercent > policy.maximumAssumedStatePercent) {
      issues.push({
        code: "ASSUMED_STATE_EXCESSIVE",
        severity: "medium",
        assumedPercent: Number(assumedPercent.toFixed(4)),
        message: "Assumed-state percentage exceeds policy."
      });
    }

    const stale = states.filter(item => {
      const timestamp = new Date(
        item.observedAt || item.updatedAt || item.createdAt
      ).getTime();

      if (Number.isNaN(timestamp)) return true;

      return (
        Date.now() - timestamp
      ) / 60000 > policy.maximumStateAgeMinutes;
    });

    if (stale.length) {
      issues.push({
        code: "STALE_STATE_PRESENT",
        severity: "medium",
        count: stale.length,
        message: "One or more synchronized states exceed freshness policy."
      });
    }

    const conflicts = handoff.conflicts || [];
    const blockingBreaches = (handoff.breaches || [])
      .filter(item => item.status === "blocking");

    if (conflicts.length > policy.maximumConflictCount) {
      issues.push({
        code: "UNRESOLVED_CONFLICTS",
        severity: "high",
        count: conflicts.length,
        message: "Unresolved state conflicts exceed policy."
      });
    }

    if (blockingBreaches.length > policy.maximumBlockingBreachCount) {
      issues.push({
        code: "BLOCKING_BREACHES",
        severity: "critical",
        count: blockingBreaches.length,
        message: "Blocking constraint breaches exceed policy."
      });
    }

    return {
      valid: !issues.some(issue =>
        ["high", "critical"].includes(issue.severity)
      ),
      issues,
      domainCount: domains.size,
      stateCount: states.length,
      assumedPercent: Number(assumedPercent.toFixed(4)),
      staleStateCount: stale.length,
      conflictCount: conflicts.length,
      blockingBreachCount: blockingBreaches.length
    };
  }

  global.INFINICUS.DT.twinIntegrityValidator =
    Object.freeze({ domainFromKey, validate });
})(window);
