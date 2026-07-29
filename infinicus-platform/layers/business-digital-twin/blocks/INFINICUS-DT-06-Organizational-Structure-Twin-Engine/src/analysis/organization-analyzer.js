(function (global) {
  "use strict";

  function analyze(units = [], positions = []) {
    const directReports = new Map();

    for (const position of positions) {
      if (!position.reportsToPositionId) continue;

      if (!directReports.has(position.reportsToPositionId)) {
        directReports.set(position.reportsToPositionId, []);
      }

      directReports.get(position.reportsToPositionId)
        .push(position.positionId);
    }

    const spanOfControl =
      [...directReports.entries()]
        .map(([managerPositionId, reports]) => ({
          managerPositionId,
          directReportCount:
            reports.length,
          risk:
            reports.length > 10
              ? "overloaded"
              : reports.length < 2
                ? "underutilized"
                : "balanced"
        }));

    const vacantPositions =
      positions.filter(position =>
        !position.occupantEntityInstanceId ||
        position.status === "vacant"
      );

    const rootPositions =
      positions.filter(position =>
        !position.reportsToPositionId
      );

    function depth(positionId) {
      const byId =
        new Map(
          positions.map(item => [
            item.positionId,
            item
          ])
        );

      let level = 1;
      let current = byId.get(positionId);
      const seen = new Set();

      while (current?.reportsToPositionId) {
        if (seen.has(current.positionId)) break;

        seen.add(current.positionId);
        current =
          byId.get(current.reportsToPositionId);
        level += 1;
      }

      return level;
    }

    const maximumManagementLayers =
      positions.length
        ? Math.max(
            ...positions.map(position =>
              depth(position.positionId)
            )
          )
        : 0;

    const unitsWithoutLeaders =
      units.filter(unit =>
        !unit.leaderPositionId
      );

    return {
      spanOfControl,
      vacantPositions:
        vacantPositions.map(structuredClone),
      rootPositions:
        rootPositions.map(structuredClone),
      maximumManagementLayers,
      unitsWithoutLeaders:
        unitsWithoutLeaders.map(structuredClone)
    };
  }

  global.INFINICUS.DT.organizationAnalyzer =
    Object.freeze({ analyze });
})(window);
