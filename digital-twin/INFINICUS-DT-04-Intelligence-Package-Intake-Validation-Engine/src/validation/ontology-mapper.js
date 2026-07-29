(function (global) {
  "use strict";

  function mapPackage(handoff, ontology) {
    const entityCodes =
      new Set(
        ontology.entityTypes.map(item => item.code)
      );

    const mapped = [];
    const unmapped = [];

    const candidateStates = [
      ...(handoff.domainStates || []),
      ...(handoff.metricStates || []),
      ...(handoff.signalStates || [])
    ];

    for (const state of candidateStates) {
      const entityCode =
        state.entityTypeCode ||
        state.domainCode ||
        state.type ||
        null;

      if (
        entityCode &&
        entityCodes.has(entityCode)
      ) {
        mapped.push(structuredClone(state));
      } else {
        unmapped.push(structuredClone(state));
      }
    }

    return {
      mapped,
      unmapped,
      mappingRate:
        candidateStates.length === 0
          ? 1
          : Number(
              (mapped.length / candidateStates.length)
                .toFixed(4)
            )
    };
  }

  global.INFINICUS.DT.intelligenceOntologyMapper =
    Object.freeze({ mapPackage });
})(window);
