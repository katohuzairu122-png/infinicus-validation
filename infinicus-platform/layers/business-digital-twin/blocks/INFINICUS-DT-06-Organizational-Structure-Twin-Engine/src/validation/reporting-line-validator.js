(function (global) {
  "use strict";

  function validate(positions = []) {
    const issues = [];
    const byId =
      new Map(
        positions.map(item => [
          item.positionId,
          item
        ])
      );

    for (const position of positions) {
      if (
        position.reportsToPositionId &&
        !byId.has(position.reportsToPositionId)
      ) {
        issues.push(
          `Unknown manager position: ${position.reportsToPositionId}`
        );
      }

      if (
        position.reportsToPositionId ===
        position.positionId
      ) {
        issues.push(
          `Position reports to itself: ${position.positionId}`
        );
      }
    }

    function hasCycle(startId) {
      const seen = new Set();
      let current = byId.get(startId);

      while (current?.reportsToPositionId) {
        if (seen.has(current.positionId)) {
          return true;
        }

        seen.add(current.positionId);
        current =
          byId.get(current.reportsToPositionId);
      }

      return false;
    }

    for (const position of positions) {
      if (hasCycle(position.positionId)) {
        issues.push(
          `Reporting cycle detected from position: ${position.positionId}`
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.reportingLineValidator =
    Object.freeze({ validate });
})(window);
