(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-22",
        purpose:
          "Turn governed intelligence into dashboards, reports, drill-downs, and exploration datasets.",
        widgetTypes: [
          "metric_card",
          "line_chart",
          "bar_chart",
          "area_chart",
          "table",
          "ranking",
          "signal_list",
          "root_cause_graph",
          "text_summary"
        ],
        handoffTarget:
          "BI-23"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
