(function (global) {
  "use strict";

  const CATEGORIES = Object.freeze({
    revenue: ["revenue", "sales", "income"],
    cost: ["cost", "expense", "cogs", "opex"],
    profit: ["profit", "ebit", "ebitda", "net_income"],
    margin: ["margin"],
    cash: ["cash", "cash_flow"],
    liquidity: ["liquidity", "current_ratio", "quick_ratio"],
    burn: ["burn"],
    runway: ["runway"],
    budget: ["budget", "variance"]
  });

  function classify(metricCode = "") {
    const code = String(metricCode).toLowerCase();

    for (const [category, tokens] of Object.entries(CATEGORIES)) {
      if (tokens.some(token => code.includes(token))) {
        return category;
      }
    }

    return "other";
  }

  global.INFINICUS.BI.financialMetricClassifier =
    Object.freeze({ CATEGORIES, classify });
})(window);
