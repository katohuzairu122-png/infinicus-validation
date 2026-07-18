(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.opportunityKey
    ) {
      return runtime.failure(
        "STRATEGIC_OPPORTUNITY_INVALID",
        "twinId, name, and opportunityKey are required."
      );
    }

    return runtime.success({
      strategicOpportunityId:
        input.strategicOpportunityId ||
        runtime.createId(
          "dt_strategic_opportunity"
        ),
      twinId:
        String(input.twinId),
      businessId:
        String(input.businessId || ""),
      opportunityKey:
        String(input.opportunityKey),
      name:
        String(input.name),
      description:
        String(input.description || ""),
      domain:
        String(input.domain || "general"),
      strategicObjectiveIds:
        Array.isArray(
          input.strategicObjectiveIds
        )
          ? input.strategicObjectiveIds
              .map(String)
          : [],
      requiredCapabilityIds:
        Array.isArray(
          input.requiredCapabilityIds
        )
          ? input.requiredCapabilityIds
              .map(String)
          : [],
      dependencyStateKeys:
        Array.isArray(
          input.dependencyStateKeys
        )
          ? input.dependencyStateKeys
              .map(String)
          : [],
      expectedValueScore:
        Number(input.expectedValueScore || 0),
      readinessScore:
        Number(input.readinessScore || 0),
      feasibilityScore:
        Number(input.feasibilityScore || 0),
      strategicFitScore:
        Number(input.strategicFitScore || 0),
      effortScore:
        Number(input.effortScore || 0),
      linkedRiskIds:
        Array.isArray(input.linkedRiskIds)
          ? input.linkedRiskIds.map(String)
          : [],
      riskScore:
        Number(input.riskScore || 0),
      timeHorizon:
        String(input.timeHorizon || "medium_term"),
      sourceType:
        String(input.sourceType || "inferred"),
      evidence:
        runtime.clone(input.evidence || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 0.5),
      status:
        String(input.status || "identified"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.strategicOpportunityModel =
    Object.freeze({ create });
})(window);
