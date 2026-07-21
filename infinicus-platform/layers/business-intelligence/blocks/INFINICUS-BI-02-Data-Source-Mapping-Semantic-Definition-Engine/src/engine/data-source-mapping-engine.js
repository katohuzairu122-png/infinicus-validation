(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerSourceSystem(input = {}) {
    const built =
      global.INFINICUS.BI.sourceSystemModel.create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI.semanticStore.put(
        "source_systems",
        built.data
      );

    if (stored.ok) {
      runtime.registerConnector(
        built.data.sourceSystemId,
        built.data,
        {
          sourceType: built.data.sourceType,
          layer: built.data.layer
        }
      );

      await runtime.emit(
        "bi.source_system.registered",
        stored.data
      );
    }

    return stored;
  }

  async function registerSemanticEntity(input = {}) {
    const built =
      global.INFINICUS.BI.semanticEntityModel.create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI.semanticStore.put(
        "semantic_entities",
        built.data
      );

    if (stored.ok) {
      await runtime.emit(
        "bi.semantic_entity.registered",
        stored.data
      );
    }

    return stored;
  }

  async function registerFieldMapping(input = {}) {
    const source =
      await global.INFINICUS.BI.semanticStore.get(
        "source_systems",
        input.sourceSystemId
      );

    if (!source.ok) return source;

    const entity =
      await global.INFINICUS.BI.semanticStore.get(
        "semantic_entities",
        input.semanticEntityId
      );

    if (!entity.ok) return entity;

    const targetField =
      entity.data.fields.find(
        field => field.name === input.targetField
      );

    if (!targetField) {
      return runtime.failure(
        "TARGET_FIELD_NOT_FOUND",
        `Target field was not found: ${input.targetField}`
      );
    }

    const built =
      global.INFINICUS.BI.fieldMappingModel.create({
        ...input,
        targetDataType: targetField.dataType
      });

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI.semanticStore.put(
        "field_mappings",
        built.data
      );

    if (stored.ok) {
      await runtime.emit(
        "bi.field_mapping.registered",
        stored.data
      );
    }

    return stored;
  }

  async function publishDatasetContract({
    name,
    sourceSystemId,
    semanticEntityId,
    publishedBy
  } = {}) {
    const source =
      await global.INFINICUS.BI.semanticStore.get(
        "source_systems",
        sourceSystemId
      );

    if (!source.ok) return source;

    const entity =
      await global.INFINICUS.BI.semanticStore.get(
        "semantic_entities",
        semanticEntityId
      );

    if (!entity.ok) return entity;

    const allMappings =
      await global.INFINICUS.BI.semanticStore.list(
        "field_mappings"
      );

    if (!allMappings.ok) return allMappings;

    const mappings =
      allMappings.data.filter(mapping =>
        mapping.sourceSystemId === sourceSystemId &&
        mapping.semanticEntityId === semanticEntityId &&
        mapping.status === "active"
      );

    const published =
      global.INFINICUS.BI.datasetContractPublisher.publish({
        name,
        sourceSystem: source.data,
        semanticEntity: entity.data,
        mappings,
        publishedBy
      });

    if (!published.ok) return published;

    const stored =
      await global.INFINICUS.BI.semanticStore.put(
        "dataset_contracts",
        published.data
      );

    if (stored.ok) {
      runtime.registerDataset(
        published.data.datasetContractId,
        published.data,
        {
          entityType: published.data.entityType,
          semanticEntityId
        }
      );

      await runtime.emit(
        "bi.dataset_contract.published",
        stored.data
      );
    }

    return stored;
  }

  async function prepareIngestionHandoff({
    datasetContractId
  } = {}) {
    const contract =
      await global.INFINICUS.BI.semanticStore.get(
        "dataset_contracts",
        datasetContractId
      );

    if (!contract.ok) return contract;

    return runtime.success({
      handoffId:
        runtime.createId("bi_ingestion_handoff"),
      targetBlock: "BI-03",
      datasetContractId,
      sourceSystemId:
        contract.data.sourceSystemId,
      semanticEntityId:
        contract.data.semanticEntityId,
      mappingVersion:
        contract.data.version,
      expectedGrain:
        contract.data.grain,
      mappings:
        contract.data.mappings.map(runtime.clone),
      status: "ready",
      createdAt: new Date().toISOString()
    });
  }

  const api = Object.freeze({
    registerSourceSystem,
    registerSemanticEntity,
    registerFieldMapping,
    publishDatasetContract,
    prepareIngestionHandoff,
    getSourceSystem: ({ sourceSystemId }) =>
      global.INFINICUS.BI.semanticStore.get(
        "source_systems",
        sourceSystemId
      ),
    getSemanticEntity: ({ semanticEntityId }) =>
      global.INFINICUS.BI.semanticStore.get(
        "semantic_entities",
        semanticEntityId
      ),
    getDatasetContract: ({ datasetContractId }) =>
      global.INFINICUS.BI.semanticStore.get(
        "dataset_contracts",
        datasetContractId
      ),
    listDatasetContracts: () =>
      global.INFINICUS.BI.semanticStore.list(
        "dataset_contracts"
      )
  });

  runtime.registerService(
    "bi.data_source_mapping",
    api,
    { block: "BI-02" }
  );

  runtime.registerRoute(
    "bi.source_system.register",
    registerSourceSystem
  );

  runtime.registerRoute(
    "bi.semantic_entity.register",
    registerSemanticEntity
  );

  runtime.registerRoute(
    "bi.field_mapping.register",
    registerFieldMapping
  );

  runtime.registerRoute(
    "bi.dataset_contract.publish",
    publishDatasetContract
  );

  runtime.registerRoute(
    "bi.ingestion_handoff.prepare",
    prepareIngestionHandoff
  );

  global.INFINICUS.BI.dataSourceMappingEngine = api;
})(window);
