(function (global) {
  "use strict";

  function build(signal, rankedDrivers = []) {
    const nodes = [
      {
        id: signal.businessSignalId,
        type: "signal",
        label: signal.code
      }
    ];

    const edges = [];

    for (const driver of rankedDrivers) {
      nodes.push({
        id: driver.driverCandidateId,
        type: "driver",
        label: driver.name,
        confidence: driver.confidence
      });

      edges.push({
        from: driver.driverCandidateId,
        to: signal.businessSignalId,
        relationship: "contributes_to",
        confidence: driver.confidence
      });
    }

    return { nodes, edges };
  }

  global.INFINICUS.BI.rootCauseGraphBuilder =
    Object.freeze({ build });
})(window);
