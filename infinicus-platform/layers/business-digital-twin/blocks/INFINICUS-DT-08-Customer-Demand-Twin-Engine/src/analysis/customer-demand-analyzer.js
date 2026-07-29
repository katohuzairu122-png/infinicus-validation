(function (global) {
  "use strict";

  function analyze(states = []) {
    const totalDemand =
      states.reduce(
        (sum, state) =>
          sum + Number(state.demandUnits || 0),
        0
      );

    const totalRevenue =
      states.reduce(
        (sum, state) =>
          sum + Number(state.revenueValue || 0),
        0
      );

    const weighted = (field, weightField = "demandUnits") => {
      const usable =
        states.filter(state =>
          Number.isFinite(Number(state[field]))
        );

      const weight =
        usable.reduce(
          (sum, state) =>
            sum + Math.max(
              0,
              Number(state[weightField] || 0)
            ),
          0
        );

      if (!usable.length) return null;

      if (weight === 0) {
        return Number((
          usable.reduce(
            (sum, state) =>
              sum + Number(state[field]),
            0
          ) / usable.length
        ).toFixed(4));
      }

      return Number((
        usable.reduce(
          (sum, state) =>
            sum +
            Number(state[field]) *
            Math.max(
              0,
              Number(state[weightField] || 0)
            ),
          0
        ) / weight
      ).toFixed(4));
    };

    const grouped =
      new Map();

    for (const state of states) {
      const key =
        state.customerSegmentId ||
        state.customerProfileId ||
        "unclassified";

      if (!grouped.has(key)) {
        grouped.set(key, 0);
      }

      grouped.set(
        key,
        grouped.get(key) +
        Number(state.revenueValue || 0)
      );
    }

    const concentration =
      totalRevenue === 0
        ? []
        : [...grouped.entries()]
            .map(([key, revenue]) => ({
              key,
              revenue:
                Number(revenue.toFixed(4)),
              sharePercent:
                Number(
                  (revenue / totalRevenue * 100)
                    .toFixed(4)
                )
            }))
            .sort((a, b) =>
              b.sharePercent - a.sharePercent
            );

    return {
      totalDemand:
        Number(totalDemand.toFixed(4)),
      totalRevenue:
        Number(totalRevenue.toFixed(4)),
      retentionRatePercent:
        weighted("retentionRatePercent"),
      churnRatePercent:
        weighted("churnRatePercent"),
      purchaseFrequency:
        weighted("purchaseFrequency"),
      lifetimeValue:
        weighted("lifetimeValue"),
      satisfactionScore:
        weighted("satisfactionScore"),
      advocacyScore:
        weighted("advocacyScore"),
      concentration
    };
  }

  global.INFINICUS.DT.customerDemandAnalyzer =
    Object.freeze({ analyze });
})(window);
