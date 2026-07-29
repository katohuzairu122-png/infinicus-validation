(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function buildGraph({
    entityGraphHandoffId,
    entityInputs = [],
    relationshipInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .intelligenceIntakeEngine
        .getEntityGraphHandoff({
          entityGraphHandoffId
        });

    if (!handoff.ok) return handoff;

    const ontology =
      handoff.data.ontology;

    const entityTypes =
      new Map(
        ontology.entityTypes.map(item => [
          item.entityTypeId,
          item
        ])
      );

    const relationshipTypes =
      new Map(
        ontology.relationshipTypes.map(item => [
          item.relationshipTypeId,
          item
        ])
      );

    const entities = [];
    const rejectedEntities = [];

    for (const input of entityInputs) {
      const built =
        global.INFINICUS.DT
          .entityInstanceModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId,
            businessId:
              handoff.data.businessId,
            ontologyId:
              handoff.data.ontologyId
          });

      if (!built.ok) {
        rejectedEntities.push({
          input:
            runtime.clone(input),
          error:
            built.error
        });
        continue;
      }

      const validation =
        global.INFINICUS.DT
          .entityInstanceValidator
          .validate(
            built.data,
            entityTypes.get(
              built.data.entityTypeId
            )
          );

      if (!validation.valid) {
        rejectedEntities.push({
          input:
            runtime.clone(input),
          issues:
            validation.issues
        });
        continue;
      }

      entities.push(built.data);

      await global.INFINICUS.DT
        .graphStore
        .put("entities", built.data);

      runtime.registerEntity(
        built.data.entityInstanceId,
        built.data,
        {
          twinId:
            built.data.twinId,
          entityTypeId:
            built.data.entityTypeId
        }
      );
    }

    const entityById =
      new Map(
        entities.map(item => [
          item.entityInstanceId,
          item
        ])
      );

    const relationships = [];
    const rejectedRelationships = [];

    for (const input of relationshipInputs) {
      const built =
        global.INFINICUS.DT
          .relationshipInstanceModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) {
        rejectedRelationships.push({
          input:
            runtime.clone(input),
          error:
            built.error
        });
        continue;
      }

      const validation =
        global.INFINICUS.DT
          .relationshipInstanceValidator
          .validate({
            relationship:
              built.data,
            relationshipType:
              relationshipTypes.get(
                built.data.relationshipTypeId
              ),
            sourceEntity:
              entityById.get(
                built.data.sourceEntityInstanceId
              ),
            targetEntity:
              entityById.get(
                built.data.targetEntityInstanceId
              ),
            existingRelationships:
              relationships
          });

      if (!validation.valid) {
        rejectedRelationships.push({
          input:
            runtime.clone(input),
          issues:
            validation.issues
        });
        continue;
      }

      relationships.push(built.data);

      await global.INFINICUS.DT
        .graphStore
        .put(
          "relationships",
          built.data
        );
    }

    const integrity =
      global.INFINICUS.DT
        .graphIntegrityAnalyzer
        .analyze(
          entities,
          relationships
        );

    const graphBuild = {
      graphBuildId:
        runtime.createId("dt_graph_build"),
      entityGraphHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      ontologyId:
        handoff.data.ontologyId,
      entityCount:
        entities.length,
      relationshipCount:
        relationships.length,
      rejectedEntityCount:
        rejectedEntities.length,
      rejectedRelationshipCount:
        rejectedRelationships.length,
      integrity:
        runtime.clone(integrity),
      status:
        integrity.valid
          ? "completed"
          : "completed_with_issues",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .graphStore
      .put("graph_builds", graphBuild);

    const organizationHandoff = {
      organizationHandoffId:
        runtime.createId("dt_organization_handoff"),
      targetBlock: "DT-06",
      graphBuildId:
        graphBuild.graphBuildId,
      businessId:
        graphBuild.businessId,
      twinId:
        graphBuild.twinId,
      ontologyId:
        graphBuild.ontologyId,
      entities:
        entities.map(runtime.clone),
      relationships:
        relationships.map(runtime.clone),
      graphIntegrity:
        runtime.clone(integrity),
      sourceContext: {
        businessState:
          runtime.clone(handoff.data.businessState),
        domainStates:
          handoff.data.domainStates.map(runtime.clone),
        lineage:
          handoff.data.lineage.map(runtime.clone),
        confidence:
          runtime.clone(handoff.data.confidence),
        freshness:
          runtime.clone(handoff.data.freshness)
      },
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .graphStore
      .put(
        "organization_handoffs",
        organizationHandoff
      );

    await runtime.emit(
      "dt.entity_graph.completed",
      {
        graphBuild,
        organizationHandoffId:
          organizationHandoff.organizationHandoffId
      }
    );

    return runtime.success({
      graphBuild,
      entities,
      relationships,
      rejectedEntities,
      rejectedRelationships,
      organizationHandoff
    });
  }

  async function traverse({
    twinId,
    startEntityInstanceId,
    depth = 1
  } = {}) {
    const entities =
      await global.INFINICUS.DT
        .graphStore
        .listByTwin("entities", twinId);

    if (!entities.ok) return entities;

    const relationships =
      await global.INFINICUS.DT
        .graphStore
        .listByTwin(
          "relationships",
          twinId
        );

    if (!relationships.ok) {
      return relationships;
    }

    const adjacency =
      global.INFINICUS.DT
        .graphIndex
        .build(
          entities.data,
          relationships.data
        );

    return runtime.success(
      global.INFINICUS.DT
        .graphIndex
        .traverse(
          startEntityInstanceId,
          adjacency,
          Math.max(1, Number(depth || 1))
        )
    );
  }

  const api = Object.freeze({
    buildGraph,
    traverse,
    getEntity: ({ entityInstanceId }) =>
      global.INFINICUS.DT
        .graphStore
        .get("entities", entityInstanceId),
    getRelationship: ({ relationshipInstanceId }) =>
      global.INFINICUS.DT
        .graphStore
        .get(
          "relationships",
          relationshipInstanceId
        ),
    listTwinEntities: ({ twinId }) =>
      global.INFINICUS.DT
        .graphStore
        .listByTwin("entities", twinId),
    listTwinRelationships: ({ twinId }) =>
      global.INFINICUS.DT
        .graphStore
        .listByTwin(
          "relationships",
          twinId
        ),
    getOrganizationHandoff: ({ organizationHandoffId }) =>
      global.INFINICUS.DT
        .graphStore
        .get(
          "organization_handoffs",
          organizationHandoffId
        )
  });

  runtime.registerService(
    "dt.entity_relationship_graph",
    api,
    { block: "DT-05" }
  );

  runtime.registerRoute(
    "dt.entity_graph.build",
    buildGraph
  );

  runtime.registerRoute(
    "dt.entity_graph.traverse",
    traverse
  );

  global.INFINICUS.DT.entityRelationshipGraphEngine = api;
})(window);
