(function (global) {
  "use strict";

  function latest(states = [], accounts = []) {
    const accountById =
      new Map(
        accounts.map(account => [
          account.financialAccountId,
          account
        ])
      );

    const sums = {
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      costs: 0,
      expenses: 0,
      cashFlow: 0,
      budgets: 0,
      targets: 0
    };

    for (const state of states) {
      const account =
        accountById.get(state.financialAccountId);

      if (!account) continue;

      const value = Number(state.value || 0);

      if (account.accountType === "asset") sums.assets += value;
      if (account.accountType === "liability") sums.liabilities += value;
      if (account.accountType === "equity") sums.equity += value;
      if (account.accountType === "revenue") sums.revenue += value;
      if (account.accountType === "cost") sums.costs += value;
      if (account.accountType === "expense") sums.expenses += value;
      if (account.accountType === "cash_flow") sums.cashFlow += value;
      if (account.accountType === "budget") sums.budgets += value;
      if (account.accountType === "target") sums.targets += value;
    }

    const grossProfit =
      sums.revenue - sums.costs;

    const operatingProfit =
      grossProfit - sums.expenses;

    return {
      ...sums,
      grossProfit:
        Number(grossProfit.toFixed(4)),
      operatingProfit:
        Number(operatingProfit.toFixed(4)),
      grossMarginPercent:
        sums.revenue === 0
          ? null
          : Number(
              (grossProfit / sums.revenue * 100)
                .toFixed(4)
            ),
      operatingMarginPercent:
        sums.revenue === 0
          ? null
          : Number(
              (operatingProfit / sums.revenue * 100)
                .toFixed(4)
            )
    };
  }

  global.INFINICUS.DT.financialProfileBuilder =
    Object.freeze({ latest });
})(window);
