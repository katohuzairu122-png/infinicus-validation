(function (global) {
  "use strict";

  function analyze(
    opportunities = [],
    capabilities = []
  ) {
    const capabilityById =
      new Map(
        capabilities.map(item => [
          item.strategicCapabilityId,
          item
        ])
      );

    const enriched =
      opportunities.map(opportunity => {
        const scoring =
          global.INFINICUS.DT
            .opportunityScorer
            .score(opportunity);

        const capabilityGaps =
          opportunity.requiredCapabilityIds
            .map(id =>
              capabilityById.get(id)
            )
            .filter(Boolean)
            .filter(capability =>
              capability.currentStrengthScore <
              capability.targetStrengthScore
            )
            .map(capability => ({
              strategicCapabilityId:
                capability
                  .strategicCapabilityId,
              name:
                capability.name,
              gap:
                Number(
                  (
                    capability
                      .targetStrengthScore -
                    capability
                      .currentStrengthScore
                  ).toFixed(4)
                )
            }));

        return {
          ...structuredClone(opportunity),
          ...scoring,
          priorityCategory:
            global.INFINICUS.DT
              .opportunityScorer
              .category(
                scoring
                  .riskAdjustedOpportunityScore
              ),
          capabilityGaps
        };
      });

    const ranked =
      [...enriched].sort(
        (a, b) =>
          b.riskAdjustedOpportunityScore -
          a.riskAdjustedOpportunityScore
      );

    const byDomain = new Map();

    for (const item of enriched) {
      if (!byDomain.has(item.domain)) {
        byDomain.set(item.domain, []);
      }

      byDomain.get(item.domain)
        .push(item);
    }

    const domains =
      [...byDomain.entries()]
        .map(([domain, items]) => ({
          domain,
          opportunityCount:
            items.length,
          averageRiskAdjustedScore:
            Number(
              (
                items.reduce(
                  (sum, item) =>
                    sum +
                    item
                      .riskAdjustedOpportunityScore,
                  0
                ) / items.length
              ).toFixed(4)
            )
        }))
        .sort(
          (a, b) =>
            b.averageRiskAdjustedScore -
            a.averageRiskAdjustedScore
        );

    return {
      enriched,
      ranked,
      domains,
      priorityCount:
        enriched.filter(
          item =>
            item.priorityCategory ===
            "priority"
        ).length,
      averageRiskAdjustedScore:
        enriched.length
          ? Number(
              (
                enriched.reduce(
                  (sum, item) =>
                    sum +
                    item
                      .riskAdjustedOpportunityScore,
                  0
                ) / enriched.length
              ).toFixed(4)
            )
          : 0
    };
  }

  global.INFINICUS.DT
    .opportunityPortfolioAnalyzer =
      Object.freeze({ analyze });
})(window);
