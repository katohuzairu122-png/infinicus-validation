(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function registerOntology(input = {}) {
    const twin =
      await global.INFINICUS.DT
        .twinInstanceRegistry
        .getTwin({
          twinId: input.twinId
        });

    if (!twin.ok) return twin;

    const entityTypes = [];

    for (const inputEntity of input.entityTypes || []) {
      const built =
        global.INFINICUS.DT
          .entityTypeModel
          .create(inputEntity);

      if (!built.ok) return built;
      entityTypes.push(built.data);
    }

    const relationshipTypes = [];

    for (const inputRelationship of input.relationshipTypes || []) {
      const built =
        global.INFINICUS.DT
          .relationshipTypeModel
          .create(inputRelationship);

      if (!built.ok) return built;
      relationshipTypes.push(built.data);
    }

    const stateModels = [];

    for (const inputStateModel of input.stateModels || []) {
      const built =
        global.INFINICUS.DT
          .stateModel
          .create(inputStateModel);

      if (!built.ok) return built;
      stateModels.push(built.data);
    }

    const built =
      global.INFINICUS.DT
        .ontologyDefinitionModel
        .create({
          ...input,
          entityTypes,
          relationshipTypes,
          stateModels
        });

    if (!built.ok) return built;

    const validation =
      global.INFINICUS.DT
        .ontologyValidator
        .validate(built.data);

    if (!validation.valid) {
      return runtime.failure(
        "ONTOLOGY_VALIDATION_FAILED",
        "Ontology validation failed.",
        validation
      );
    }

    let previous = null;

    if (built.data.supersedesOntologyId) {
      const found =
        await global.INFINICUS.DT
          .ontologyStore
          .get(
            "ontologies",
            built.data.supersedesOntologyId
          );

      if (!found.ok) return found;
      previous = found.data;

      const compatibility =
        global.INFINICUS.DT
          .ontologyCompatibilityChecker
          .check(previous, built.data);

      if (
        !compatibility.compatible &&
        input.allowBreakingChanges !== true
      ) {
        return runtime.failure(
          "ONTOLOGY_BREAKING_CHANGE",
          "Breaking ontology changes require explicit approval.",
          compatibility
        );
      }
    }

    const stored =
      await global.INFINICUS.DT
        .ontologyStore
        .put("ontologies", built.data);

    if (!stored.ok) return stored;

    runtime.registerSchema(
      built.data.ontologyId,
      built.data,
      {
        twinId:
          built.data.twinId,
        version:
          built.data.version
      }
    );

    await runtime.emit(
      "dt.ontology.registered",
      stored.data
    );

    return runtime.success({
      ontology:
        stored.data,
      supersededOntology:
        previous
    });
  }

  async function prepareIntakeHandoff({
    ontologyId,
    schemaHandoffId
  } = {}) {
    const ontology =
      await global.INFINICUS.DT
        .ontologyStore
        .get("ontologies", ontologyId);

    if (!ontology.ok) return ontology;

    const identity =
      await global.INFINICUS.DT
        .twinInstanceRegistry
        .getSchemaHandoff({
          schemaHandoffId
        });

    if (!identity.ok) return identity;

    if (
      identity.data.twin.twinId !==
      ontology.data.twinId
    ) {
      return runtime.failure(
        "ONTOLOGY_TWIN_MISMATCH",
        "Ontology and identity handoff reference different twins."
      );
    }

    const handoff = {
      intakeHandoffId:
        runtime.createId("dt_intake_handoff"),
      targetBlock: "DT-04",
      schemaHandoffId,
      ontologyId,
      twin:
        runtime.clone(identity.data.twin),
      business:
        runtime.clone(identity.data.business),
      ontology:
        runtime.clone(ontology.data),
      requiredEntityTypes:
        ontology.data.entityTypes.map(entity => ({
          entityTypeId:
            entity.entityTypeId,
          code:
            entity.code,
          attributes:
            entity.attributes
              .filter(attribute => attribute.required)
              .map(attribute => attribute.code)
        })),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    const stored =
      await global.INFINICUS.DT
        .ontologyStore
        .put("intake_handoffs", handoff);

    if (stored.ok) {
      await runtime.emit(
        "dt.intake_handoff.prepared",
        stored.data
      );
    }

    return stored;
  }

  const api = Object.freeze({
    registerOntology,
    prepareIntakeHandoff,
    getOntology: ({ ontologyId }) =>
      global.INFINICUS.DT
        .ontologyStore
        .get("ontologies", ontologyId),
    listTwinOntologies: ({ twinId }) =>
      global.INFINICUS.DT
        .ontologyStore
        .listByTwin(twinId),
    getIntakeHandoff: ({ intakeHandoffId }) =>
      global.INFINICUS.DT
        .ontologyStore
        .get("intake_handoffs", intakeHandoffId)
  });

  runtime.registerService(
    "dt.schema_ontology",
    api,
    { block: "DT-03" }
  );

  runtime.registerRoute(
    "dt.ontology.register",
    registerOntology
  );

  runtime.registerRoute(
    "dt.intake_handoff.prepare",
    prepareIntakeHandoff
  );

  global.INFINICUS.DT.schemaOntologyEngine = api;
})(window);
