(function (global) {
  "use strict";
  global.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#output").textContent = JSON.stringify({
      block: "DT-12",
      purpose: "Represent products, locations, stock, replenishment, suppliers, purchase orders, and supply risk.",
      outputs: [
        "product registry",
        "inventory locations",
        "inventory balances",
        "supplier network",
        "purchase orders",
        "stock availability",
        "stockout rate",
        "days on hand",
        "waste and shrinkage",
        "reorder candidates",
        "DT-13 handoff"
      ]
    }, null, 2);
  });
})(window);
