(function (global) {
  "use strict";

  function publish({
    name,
    sourceSystem,
    semanticEntity,
    mappings,
    publishedBy
  }) {
    const runtime = global.INFINICUS.BI.runtime;

    if (
      !name ||
      !sourceSystem ||
      !semanticEntity ||
      !Array.isArray(mappings)
    ) {
      return runtime.failure(
        "DATASET_CONTRACT_INVALID",
        "name, sourceSystem, semanticEntity, and mappings are required."
      );
    }

    const targetFields =
      new Set(mappings.map(mapping => mapping.targetField));

    const missingRequiredFields =
      semanticEntity.fields
        .filter(field => !field.nullable)
        .filter(field => !targetFields.has(field.name))
        .map(field => field.name);

    if (missingRequiredFields.length) {
      return runtime.failure(
        "DATASET_CONTRACT_INCOMPLETE",
        "Required semantic fields are not mapped.",
        { missingRequiredFields }
      );
    }

    return runtime.success({
      datasetContractId:
        runtime.createId("bi_dataset_contract"),
      name: String(name),
      sourceSystemId:
        sourceSystem.sourceSystemId,
      semanticEntityId:
        semanticEntity.semanticEntityId,
      version: Number(semanticEntity.version || 1),
      grain: semanticEntity.grain,
      entityType: semanticEntity.entityType,
      mappings:
        mappings.map(runtime.clone),
      lineage: mappings.map(mapping => ({
        sourceSystemId: mapping.sourceSystemId,
        sourceDataset: mapping.sourceDataset,
        sourceField: mapping.sourceField,
        targetField: mapping.targetField
      })),
      status: "published",
      publishedBy: String(publishedBy || ""),
      publishedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.datasetContractPublisher =
    Object.freeze({ publish });
})(window);
