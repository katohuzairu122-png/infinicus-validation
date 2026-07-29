(function (global) {
  "use strict";

  global.addEventListener(
    "DOMContentLoaded",
    () => {
      document.querySelector(
        "#output"
      ).textContent =
        JSON.stringify({
          block: "DT-13",
          purpose:
            "Represent workforce capacity, skills, workload, productivity, attendance, and capability gaps.",
          outputs: [
            "workforce registry",
            "skills",
            "capabilities",
            "workload state",
            "utilization",
            "productivity",
            "absence rate",
            "vacancies",
            "skill coverage",
            "overloaded members",
            "DT-14 handoff"
          ]
        }, null, 2);
    }
  );
})(window);
