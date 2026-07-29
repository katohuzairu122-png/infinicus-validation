(function (global) {
  "use strict";

  function analyze(states = []) {
    const totals =
      states.reduce((acc, state) => {
        acc.spend += Number(state.spend || 0);
        acc.reach += Number(state.reach || 0);
        acc.impressions += Number(state.impressions || 0);
        acc.engagements += Number(state.engagements || 0);
        acc.leads += Number(state.leads || 0);
        acc.conversions += Number(state.conversions || 0);
        acc.attributedRevenue += Number(state.attributedRevenue || 0);
        acc.acquiredCustomers += Number(state.acquiredCustomers || 0);
        return acc;
      }, {
        spend: 0,
        reach: 0,
        impressions: 0,
        engagements: 0,
        leads: 0,
        conversions: 0,
        attributedRevenue: 0,
        acquiredCustomers: 0
      });

    const safePercent = (numerator, denominator) =>
      denominator === 0
        ? null
        : Number(
            (numerator / denominator * 100)
              .toFixed(4)
          );

    return {
      ...Object.fromEntries(
        Object.entries(totals).map(([key, value]) => [
          key,
          Number(value.toFixed(4))
        ])
      ),
      engagementRatePercent:
        safePercent(
          totals.engagements,
          totals.impressions
        ),
      leadConversionRatePercent:
        safePercent(
          totals.conversions,
          totals.leads
        ),
      customerAcquisitionCost:
        totals.acquiredCustomers === 0
          ? null
          : Number(
              (totals.spend / totals.acquiredCustomers)
                .toFixed(4)
            ),
      returnOnAdSpend:
        totals.spend === 0
          ? null
          : Number(
              (totals.attributedRevenue / totals.spend)
                .toFixed(4)
            ),
      campaignRoiPercent:
        totals.spend === 0
          ? null
          : Number(
              (
                (totals.attributedRevenue - totals.spend) /
                totals.spend *
                100
              ).toFixed(4)
            )
    };
  }

  global.INFINICUS.DT.marketingStateAnalyzer =
    Object.freeze({ analyze });
})(window);
