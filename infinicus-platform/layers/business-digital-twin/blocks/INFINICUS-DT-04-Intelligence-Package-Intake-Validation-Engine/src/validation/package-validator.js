(function (global) {
  "use strict";

  function validate({
    handoff,
    intakeContext,
    policy
  }) {
    const issues = [];

    if (
      handoff.businessId !==
      intakeContext.business.businessId
    ) {
      issues.push(
        "Business identity does not match the target twin."
      );
    }

    if (
      handoff.schemaVersion !==
      intakeContext.ontology.version
    ) {
      issues.push(
        "Intelligence schema version does not match ontology version."
      );
    }

    const generatedAt =
      new Date(handoff.createdAt).getTime();

    const ageMinutes =
      Number.isNaN(generatedAt)
        ? Infinity
        : Math.max(
            0,
            (Date.now() - generatedAt) / 60000
          );

    if (
      ageMinutes >
      policy.maximumAgeMinutes
    ) {
      issues.push(
        "Intelligence package exceeds the freshness policy."
      );
    }

    const confidence =
      Number(handoff.confidence?.score ?? 0);

    if (
      confidence <
      policy.minimumConfidence
    ) {
      issues.push(
        "Intelligence package confidence is below policy."
      );
    }

    for (const section of policy.requiredSections) {
      if (handoff[section] == null) {
        issues.push(
          `Missing required section: ${section}`
        );
      }
    }

    if (
      policy.requireLineage &&
      (!Array.isArray(handoff.lineage) ||
       handoff.lineage.length === 0)
    ) {
      issues.push(
        "Lineage is required but was not provided."
      );
    }

    return {
      valid:
        issues.length === 0,
      issues,
      ageMinutes:
        Number.isFinite(ageMinutes)
          ? Number(ageMinutes.toFixed(2))
          : null,
      confidence
    };
  }

  global.INFINICUS.DT.intelligencePackageValidator =
    Object.freeze({ validate });
})(window);
