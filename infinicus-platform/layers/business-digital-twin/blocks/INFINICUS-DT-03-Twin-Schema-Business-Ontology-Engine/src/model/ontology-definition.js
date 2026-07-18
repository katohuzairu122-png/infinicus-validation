(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.version
    ) {
      return runtime.failure(
        "ONTOLOGY_DEFINITION_INVALID",
        "twinId, name, and version are required."
      );
    }

    return runtime.success({
      ontologyId:
        input.ontologyId ||
        runtime.createId("dt_ontology"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      description:
        String(input.description || ""),
      version:
        String(input.version),
      supersedesOntologyId:
        input.supersedesOntologyId || null,
      entityTypes:
        runtime.clone(input.entityTypes || []),
      relationshipTypes:
        runtime.clone(input.relationshipTypes || []),
      stateModels:
        runtime.clone(input.stateModels || []),
      vocabularies:
        runtime.clone(input.vocabularies || []),
      constraints:
        runtime.clone(input.constraints || []),
      status:
        String(input.status || "draft"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.ontologyDefinitionModel =
    Object.freeze({ create });
})(window);
