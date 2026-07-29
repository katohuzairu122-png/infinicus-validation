(function (global) {
  "use strict";

  function build(units = [], positions = [], roles = []) {
    const roleById =
      new Map(
        roles.map(role => [role.roleId, role])
      );

    const children = new Map();

    for (const position of positions) {
      const parent =
        position.reportsToPositionId || "__root__";

      if (!children.has(parent)) {
        children.set(parent, []);
      }

      children.get(parent).push(position);
    }

    function node(position) {
      return {
        positionId:
          position.positionId,
        role:
          roleById.get(position.roleId)?.name || "Unknown role",
        organizationUnitId:
          position.organizationUnitId,
        occupantEntityInstanceId:
          position.occupantEntityInstanceId,
        status:
          position.status,
        children:
          (children.get(position.positionId) || [])
            .map(node)
      };
    }

    return {
      units:
        units.map(structuredClone),
      roots:
        (children.get("__root__") || [])
          .map(node),
      generatedAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.DT.organizationChartBuilder =
    Object.freeze({ build });
})(window);
