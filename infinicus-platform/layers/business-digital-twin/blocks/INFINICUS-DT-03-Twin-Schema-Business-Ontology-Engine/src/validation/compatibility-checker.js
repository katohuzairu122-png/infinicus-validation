(function (global) {
  "use strict";

  function check(previous, next) {
    if (!previous) {
      return {
        compatible: true,
        breakingChanges: []
      };
    }

    const breakingChanges = [];
    const nextByCode =
      new Map(next.entityTypes.map(item => [item.code, item]));

    for (const priorEntity of previous.entityTypes) {
      const nextEntity = nextByCode.get(priorEntity.code);

      if (!nextEntity) {
        breakingChanges.push(
          `Entity type removed: ${priorEntity.code}`
        );
        continue;
      }

      const nextAttributes =
        new Map(
          (nextEntity.attributes || [])
            .map(item => [item.code, item])
        );

      for (const priorAttribute of priorEntity.attributes || []) {
        const nextAttribute =
          nextAttributes.get(priorAttribute.code);

        if (!nextAttribute) {
          breakingChanges.push(
            `Attribute removed: ${priorEntity.code}.${priorAttribute.code}`
          );
        } else if (
          nextAttribute.valueType !==
          priorAttribute.valueType
        ) {
          breakingChanges.push(
            `Attribute type changed: ${priorEntity.code}.${priorAttribute.code}`
          );
        }
      }
    }

    return {
      compatible:
        breakingChanges.length === 0,
      breakingChanges
    };
  }

  global.INFINICUS.DT.ontologyCompatibilityChecker =
    Object.freeze({ check });
})(window);
