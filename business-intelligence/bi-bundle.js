/* BI LAYER BUNDLE */
/* Auto-generated — do not edit directly */
/* Contains: INFINICUS-BI-01 through INFINICUS-BI-25 */


/* ===== INFINICUS-BI-01-Business-Intelligence-Core-Runtime-Registry ===== */

/* --- business-intelligence/INFINICUS-BI-01-Business-Intelligence-Core-Runtime-Registry/src/runtime/result-envelope.js --- */
(function (global) {
  "use strict";

  const now = () => new Date().toISOString();

  const success = (data = null, meta = {}) => Object.freeze({
    ok: true,
    code: "OK",
    message: meta.message || "Success",
    data,
    warnings: Array.isArray(meta.warnings) ? [...meta.warnings] : [],
    correlationId: meta.correlationId || null,
    timestamp: now()
  });

  const failure = (code, message, details = null, meta = {}) => Object.freeze({
    ok: false,
    code: String(code || "UNKNOWN_ERROR"),
    message: String(message || "Operation failed."),
    data: details,
    warnings: Array.isArray(meta.warnings) ? [...meta.warnings] : [],
    correlationId: meta.correlationId || null,
    timestamp: now()
  });

  global.INFINICUS = global.INFINICUS || {};
  global.INFINICUS.BI = global.INFINICUS.BI || {};
  global.INFINICUS.BI.resultEnvelope = Object.freeze({
    success,
    failure
  });
})(window);

/* --- business-intelligence/INFINICUS-BI-01-Business-Intelligence-Core-Runtime-Registry/src/runtime/registry.js --- */
(function (global) {
  "use strict";

  const result = global.INFINICUS.BI.resultEnvelope;

  function createRegistry(type) {
    const records = new Map();

    function register(key, value, metadata = {}) {
      const normalizedKey = String(key || "").trim();

      if (!normalizedKey) {
        return result.failure(
          "REGISTRY_KEY_REQUIRED",
          `${type} key is required.`
        );
      }

      if (records.has(normalizedKey)) {
        return result.failure(
          "REGISTRY_DUPLICATE",
          `${type} already registered: ${normalizedKey}`
        );
      }

      const record = Object.freeze({
        key: normalizedKey,
        value,
        metadata: structuredClone(metadata),
        registeredAt: new Date().toISOString()
      });

      records.set(normalizedKey, record);
      return result.success(record);
    }

    function get(key) {
      const record = records.get(String(key || ""));
      return record
        ? result.success(record)
        : result.failure(
            "REGISTRY_NOT_FOUND",
            `${type} was not found: ${key}`
          );
    }

    function remove(key) {
      const normalizedKey = String(key || "");
      const existed = records.delete(normalizedKey);

      return existed
        ? result.success({ key: normalizedKey, removed: true })
        : result.failure(
            "REGISTRY_NOT_FOUND",
            `${type} was not found: ${normalizedKey}`
          );
    }

    function list() {
      return result.success(
        [...records.values()].map(record => ({
          key: record.key,
          metadata: structuredClone(record.metadata),
          registeredAt: record.registeredAt
        }))
      );
    }

    function has(key) {
      return records.has(String(key || ""));
    }

    function size() {
      return records.size;
    }

    return Object.freeze({
      register,
      get,
      remove,
      list,
      has,
      size
    });
  }

  global.INFINICUS.BI.createRegistry = createRegistry;
})(window);

/* --- business-intelligence/INFINICUS-BI-01-Business-Intelligence-Core-Runtime-Registry/src/runtime/event-bus.js --- */
(function (global) {
  "use strict";

  const result = global.INFINICUS.BI.resultEnvelope;
  const listeners = new Map();

  function on(eventName, handler) {
    if (!eventName || typeof handler !== "function") {
      return result.failure(
        "EVENT_SUBSCRIPTION_INVALID",
        "eventName and handler are required."
      );
    }

    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(handler);

    return result.success({
      eventName,
      unsubscribe() {
        listeners.get(eventName)?.delete(handler);
      }
    });
  }

  async function emit(eventName, detail = {}, meta = {}) {
    const handlers = [...(listeners.get(eventName) || [])];
    const outcomes = [];

    for (const handler of handlers) {
      try {
        outcomes.push({
          ok: true,
          value: await handler(structuredClone(detail))
        });
      } catch (error) {
        outcomes.push({
          ok: false,
          error: error?.message || "Event handler failed."
        });
      }
    }

    global.dispatchEvent(
      new CustomEvent(eventName, {
        detail: structuredClone(detail)
      })
    );

    return result.success({
      eventName,
      deliveredTo: handlers.length,
      outcomes
    }, meta);
  }

  function diagnostics() {
    return {
      eventTypes: [...listeners.keys()],
      listenerCount: [...listeners.values()]
        .reduce((sum, set) => sum + set.size, 0)
    };
  }

  global.INFINICUS.BI.eventBus = Object.freeze({
    on,
    emit,
    diagnostics
  });
})(window);

/* --- business-intelligence/INFINICUS-BI-01-Business-Intelligence-Core-Runtime-Registry/src/runtime/bi-runtime.js --- */
(function (global) {
  "use strict";

  const result = global.INFINICUS.BI.resultEnvelope;
  const createRegistry = global.INFINICUS.BI.createRegistry;
  const eventBus = global.INFINICUS.BI.eventBus;

  const services = createRegistry("service");
  const routes = createRegistry("route");
  const datasets = createRegistry("dataset");
  const metrics = createRegistry("metric");
  const connectors = createRegistry("connector");

  const createId = prefix =>
    `${String(prefix || "bi")}_${crypto.randomUUID()}`;

  const clone = value =>
    value == null ? value : structuredClone(value);

  async function call(routeName, payload = {}, meta = {}) {
    const found = routes.get(routeName);

    if (!found.ok) {
      return result.failure(
        "ROUTE_NOT_FOUND",
        `No BI route registered for ${routeName}.`,
        { routeName },
        meta
      );
    }

    const handler = found.data.value;

    if (typeof handler !== "function") {
      return result.failure(
        "ROUTE_HANDLER_INVALID",
        `BI route does not contain a callable handler: ${routeName}`,
        null,
        meta
      );
    }

    try {
      return await handler(clone(payload), meta);
    } catch (error) {
      return result.failure(
        "ROUTE_CALL_FAILED",
        error?.message || `BI route failed: ${routeName}`,
        { routeName },
        meta
      );
    }
  }

  function diagnostics() {
    const eventDiagnostics = eventBus.diagnostics();

    return result.success({
      layer: "Business Intelligence",
      version: "1.0.0",
      services: services.size(),
      routes: routes.size(),
      datasets: datasets.size(),
      metrics: metrics.size(),
      connectors: connectors.size(),
      eventTypes: eventDiagnostics.eventTypes.length,
      listeners: eventDiagnostics.listenerCount,
      checkedAt: new Date().toISOString()
    });
  }

  const runtime = Object.freeze({
    success: result.success,
    failure: result.failure,
    createId,
    clone,
    registerService: services.register,
    getService: services.get,
    listServices: services.list,
    registerRoute: routes.register,
    getRoute: routes.get,
    listRoutes: routes.list,
    call,
    registerDataset: datasets.register,
    getDataset: datasets.get,
    listDatasets: datasets.list,
    registerMetric: metrics.register,
    getMetric: metrics.get,
    listMetrics: metrics.list,
    registerConnector: connectors.register,
    getConnector: connectors.get,
    listConnectors: connectors.list,
    on: eventBus.on,
    emit: eventBus.emit,
    diagnostics
  });

  global.INFINICUS.BI.runtime = runtime;
})(window);

/* --- business-intelligence/INFINICUS-BI-01-Business-Intelligence-Core-Runtime-Registry/src/manifest/layer-manifest.js --- */
(function (global) {
  "use strict";

  const BLOCKS = Object.freeze([
    { number: 1, code: "BI-01", name: "Business Intelligence Core Runtime and Registry" },
    { number: 2, code: "BI-02", name: "Data Source Mapping and Semantic Definition" },
    { number: 3, code: "BI-03", name: "Data Ingestion Coordination" },
    { number: 4, code: "BI-04", name: "Data Validation and Quality Control" },
    { number: 5, code: "BI-05", name: "Data Cleaning and Standardization" },
    { number: 6, code: "BI-06", name: "Entity Resolution and Record Matching" },
    { number: 7, code: "BI-07", name: "Data Transformation and Enrichment" },
    { number: 8, code: "BI-08", name: "Business Data Warehouse and Analytical Storage" },
    { number: 9, code: "BI-09", name: "Business Metric and KPI Registry" },
    { number: 10, code: "BI-10", name: "Metric Calculation and Aggregation" },
    { number: 11, code: "BI-11", name: "Financial Intelligence" },
    { number: 12, code: "BI-12", name: "Sales and Revenue Intelligence" },
    { number: 13, code: "BI-13", name: "Customer Intelligence" },
    { number: 14, code: "BI-14", name: "Marketing Intelligence" },
    { number: 15, code: "BI-15", name: "Operations and Productivity Intelligence" },
    { number: 16, code: "BI-16", name: "Inventory and Supply Intelligence" },
    { number: 17, code: "BI-17", name: "Workforce and Organizational Intelligence" },
    { number: 18, code: "BI-18", name: "Market and Competitive Intelligence" },
    { number: 19, code: "BI-19", name: "Trend, Variance and Benchmark Analysis" },
    { number: 20, code: "BI-20", name: "Anomaly and Business Signal Detection" },
    { number: 21, code: "BI-21", name: "Root-Cause and Driver Analysis" },
    { number: 22, code: "BI-22", name: "Dashboard, Reporting and Data Exploration" },
    { number: 23, code: "BI-23", name: "Alerts, Scheduled Intelligence and Distribution" },
    { number: 24, code: "BI-24", name: "Intelligence Dataset Publication and Digital Twin Handoff" }
  ]);

  global.INFINICUS.BI.layerManifest = Object.freeze({
    layer: "Business Intelligence",
    version: "1.0.0",
    blockCount: BLOCKS.length,
    blocks: BLOCKS
  });
})(window);

/* ===== INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  if (!global.INFINICUS?.BI?.runtime) {
    throw new Error(
      "INFINICUS BI-01 must be loaded before BI-02."
    );
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/model/source-system.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.name || !input.sourceType) {
      return runtime.failure(
        "SOURCE_SYSTEM_INVALID",
        "name and sourceType are required."
      );
    }

    return runtime.success({
      sourceSystemId:
        input.sourceSystemId ||
        runtime.createId("bi_source_system"),
      name: String(input.name),
      sourceType: String(input.sourceType),
      owner: String(input.owner || ""),
      layer: String(input.layer || "business_operations"),
      connectionReference:
        String(input.connectionReference || ""),
      status: String(input.status || "active"),
      metadata: runtime.clone(input.metadata || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.sourceSystemModel =
    Object.freeze({ create });
})(window);

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/model/semantic-entity.js --- */
(function (global) {
  "use strict";

  const ENTITY_TYPES = Object.freeze([
    "entity",
    "fact",
    "dimension"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const entityType = String(input.entityType || "entity");

    if (!input.name || !ENTITY_TYPES.includes(entityType)) {
      return runtime.failure(
        "SEMANTIC_ENTITY_INVALID",
        "A valid name and entityType are required."
      );
    }

    const fields = Array.isArray(input.fields)
      ? input.fields.map(field => ({
          fieldId:
            field.fieldId ||
            runtime.createId("bi_semantic_field"),
          name: String(field.name || ""),
          dataType: String(field.dataType || "string"),
          nullable: Boolean(field.nullable),
          keyType: field.keyType || null,
          description: String(field.description || ""),
          unit: field.unit || null
        }))
      : [];

    if (fields.some(field => !field.name)) {
      return runtime.failure(
        "SEMANTIC_FIELD_INVALID",
        "Every semantic field requires a name."
      );
    }

    return runtime.success({
      semanticEntityId:
        input.semanticEntityId ||
        runtime.createId("bi_semantic_entity"),
      name: String(input.name),
      entityType,
      description: String(input.description || ""),
      grain: String(input.grain || ""),
      fields,
      businessOwner: String(input.businessOwner || ""),
      dataOwner: String(input.dataOwner || ""),
      version: Number(input.version || 1),
      status: String(input.status || "draft"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.semanticEntityModel =
    Object.freeze({
      ENTITY_TYPES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/mapping/type-compatibility.js --- */
(function (global) {
  "use strict";

  const COMPATIBILITY = Object.freeze({
    string: ["string"],
    integer: ["integer", "number", "string"],
    number: ["integer", "number", "string"],
    boolean: ["boolean", "string", "integer"],
    date: ["date", "datetime", "string"],
    datetime: ["date", "datetime", "string"],
    currency: ["integer", "number", "string"],
    percentage: ["integer", "number", "string"],
    identifier: ["string", "integer"]
  });

  function evaluate({
    sourceType,
    targetType,
    conversionRule = null
  }) {
    const accepted =
      COMPATIBILITY[targetType] || [targetType];

    const directlyCompatible =
      accepted.includes(sourceType);

    const compatible =
      directlyCompatible ||
      Boolean(conversionRule);

    return {
      compatible,
      directlyCompatible,
      sourceType,
      targetType,
      conversionRequired:
        !directlyCompatible && Boolean(conversionRule),
      reason:
        compatible
          ? null
          : `Cannot map ${sourceType} to ${targetType} without a conversion rule.`
    };
  }

  global.INFINICUS.BI.typeCompatibility =
    Object.freeze({
      COMPATIBILITY,
      evaluate
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/mapping/field-mapping.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    const required = [
      "sourceSystemId",
      "sourceField",
      "sourceDataType",
      "semanticEntityId",
      "targetField",
      "targetDataType"
    ];

    const missing =
      required.filter(key => !input[key]);

    if (missing.length) {
      return runtime.failure(
        "FIELD_MAPPING_INVALID",
        "Required mapping values are missing.",
        { missing }
      );
    }

    const compatibility =
      global.INFINICUS.BI.typeCompatibility.evaluate({
        sourceType: String(input.sourceDataType),
        targetType: String(input.targetDataType),
        conversionRule: input.conversionRule || null
      });

    if (!compatibility.compatible) {
      return runtime.failure(
        "TYPE_INCOMPATIBLE",
        compatibility.reason,
        compatibility
      );
    }

    return runtime.success({
      fieldMappingId:
        input.fieldMappingId ||
        runtime.createId("bi_field_mapping"),
      sourceSystemId: String(input.sourceSystemId),
      sourceDataset: String(input.sourceDataset || ""),
      sourceField: String(input.sourceField),
      sourceDataType: String(input.sourceDataType),
      semanticEntityId:
        String(input.semanticEntityId),
      targetField: String(input.targetField),
      targetDataType: String(input.targetDataType),
      conversionRule:
        input.conversionRule || null,
      defaultValue:
        input.defaultValue ?? null,
      required: Boolean(input.required),
      lineage: {
        sourceSystemId:
          String(input.sourceSystemId),
        sourceDataset:
          String(input.sourceDataset || ""),
        sourceField:
          String(input.sourceField),
        mappedAt:
          new Date().toISOString()
      },
      compatibility,
      version: Number(input.version || 1),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.fieldMappingModel =
    Object.freeze({ create });
})(window);

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/contracts/dataset-contract.js --- */
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

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/storage/semantic-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_SEMANTIC_MODEL";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["source_systems", "sourceSystemId"],
          ["semantic_entities", "semanticEntityId"],
          ["field_mappings", "fieldMappingId"],
          ["dataset_contracts", "datasetContractId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    } catch (error) {
      return runtime.failure(
        "SEMANTIC_STORAGE_ERROR",
        error?.message ||
          "Semantic storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "SEMANTIC_RECORD_NOT_FOUND",
            "Semantic record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "SEMANTIC_STORAGE_ERROR",
        error?.message ||
          "Semantic retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "SEMANTIC_STORAGE_ERROR",
        error?.message ||
          "Semantic listing failed."
      );
    }
  }

  global.INFINICUS.BI.semanticStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-02-Data-Source-Mapping-Semantic-Definition-Engine/src/engine/data-source-mapping-engine.js --- */
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

/* ===== INFINICUS-BI-03-Data-Ingestion-Coordination-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-03-Data-Ingestion-Coordination-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  if (!global.INFINICUS?.BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-03.");
  }

  if (!global.INFINICUS?.BI?.dataSourceMappingEngine) {
    throw new Error("INFINICUS BI-02 must be loaded before BI-03.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-03-Data-Ingestion-Coordination-Engine/src/model/ingestion-job.js --- */
(function (global) {
  "use strict";

  const MODES = Object.freeze([
    "batch",
    "incremental",
    "stream"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const mode = String(input.mode || "batch");

    if (!input.name || !input.datasetContractId || !MODES.includes(mode)) {
      return runtime.failure(
        "INGESTION_JOB_INVALID",
        "name, datasetContractId, and a supported mode are required."
      );
    }

    return runtime.success({
      ingestionJobId:
        input.ingestionJobId ||
        runtime.createId("bi_ingestion_job"),
      name: String(input.name),
      datasetContractId:
        String(input.datasetContractId),
      mode,
      schedule: input.schedule || null,
      sourceCursorField:
        input.sourceCursorField || null,
      sourceWatermarkField:
        input.sourceWatermarkField || null,
      batchSize:
        Math.max(1, Number(input.batchSize || 500)),
      maximumRetries:
        Math.max(0, Number(input.maximumRetries || 3)),
      status: String(input.status || "active"),
      metadata: runtime.clone(input.metadata || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.ingestionJobModel =
    Object.freeze({
      MODES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-03-Data-Ingestion-Coordination-Engine/src/model/ingestion-run.js --- */
(function (global) {
  "use strict";

  function create({
    ingestionJob,
    correlationId,
    idempotencyKey,
    cursor = null,
    watermark = null
  }) {
    const runtime = global.INFINICUS.BI.runtime;

    return {
      ingestionRunId:
        runtime.createId("bi_ingestion_run"),
      ingestionJobId:
        ingestionJob.ingestionJobId,
      datasetContractId:
        ingestionJob.datasetContractId,
      correlationId:
        correlationId || runtime.createId("correlation"),
      idempotencyKey:
        String(idempotencyKey || ""),
      mode: ingestionJob.mode,
      status: "running",
      cursor,
      watermark,
      attempt: 1,
      counts: {
        received: 0,
        mapped: 0,
        rejected: 0,
        pendingQuality: 0
      },
      errors: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString()
    };
  }

  global.INFINICUS.BI.ingestionRunModel =
    Object.freeze({ create });
})(window);

/* --- business-intelligence/INFINICUS-BI-03-Data-Ingestion-Coordination-Engine/src/mapping/record-mapper.js --- */
(function (global) {
  "use strict";

  function getValue(record, path) {
    return String(path || "")
      .split(".")
      .filter(Boolean)
      .reduce((value, key) => value?.[key], record);
  }

  function convert(value, rule, targetType) {
    if (value == null) return value;

    if (rule === "trim") {
      return String(value).trim();
    }

    if (rule === "uppercase") {
      return String(value).toUpperCase();
    }

    if (rule === "lowercase") {
      return String(value).toLowerCase();
    }

    if (rule === "to_number") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Cannot convert value to number: ${value}`);
      }
      return parsed;
    }

    if (rule === "to_boolean") {
      if (typeof value === "boolean") return value;
      const normalized = String(value).trim().toLowerCase();
      if (["true", "1", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
      throw new Error(`Cannot convert value to boolean: ${value}`);
    }

    if (targetType === "integer") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Cannot convert value to integer: ${value}`);
      }
      return parsed;
    }

    if (["number", "currency", "percentage"].includes(targetType)) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Cannot convert value to number: ${value}`);
      }
      return parsed;
    }

    if (["date", "datetime"].includes(targetType)) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Cannot convert value to date: ${value}`);
      }
      return date.toISOString();
    }

    return String(value);
  }

  function mapRecord(record, mappings = []) {
    const output = {};
    const errors = [];

    for (const mapping of mappings) {
      try {
        let value = getValue(record, mapping.sourceField);

        if (
          (value == null || value === "") &&
          mapping.defaultValue != null
        ) {
          value = mapping.defaultValue;
        }

        if (
          mapping.required &&
          (value == null || value === "")
        ) {
          throw new Error(
            `Required source value is missing: ${mapping.sourceField}`
          );
        }

        output[mapping.targetField] = convert(
          value,
          mapping.conversionRule,
          mapping.targetDataType
        );
      } catch (error) {
        errors.push({
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          code: "MAPPING_FAILED",
          message: error?.message || "Record mapping failed."
        });
      }
    }

    return {
      valid: errors.length === 0,
      record: output,
      errors
    };
  }

  global.INFINICUS.BI.ingestionRecordMapper =
    Object.freeze({
      getValue,
      convert,
      mapRecord
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-03-Data-Ingestion-Coordination-Engine/src/idempotency/idempotency-registry.js --- */
(function (global) {
  "use strict";

  const keys = new Map();

  function reserve(key, metadata = {}) {
    const normalized = String(key || "").trim();

    if (!normalized) {
      return {
        reserved: false,
        reason: "Idempotency key is required."
      };
    }

    if (keys.has(normalized)) {
      return {
        reserved: false,
        reason: "Duplicate idempotency key.",
        existing: structuredClone(keys.get(normalized))
      };
    }

    const record = {
      key: normalized,
      metadata: structuredClone(metadata),
      reservedAt: new Date().toISOString()
    };

    keys.set(normalized, record);

    return {
      reserved: true,
      record
    };
  }

  function get(key) {
    return keys.get(String(key || "")) || null;
  }

  global.INFINICUS.BI.ingestionIdempotencyRegistry =
    Object.freeze({
      reserve,
      get
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-03-Data-Ingestion-Coordination-Engine/src/storage/ingestion-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_INGESTION";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["jobs", "ingestionJobId"],
          ["runs", "ingestionRunId"],
          ["quality_handoffs", "qualityHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    } catch (error) {
      return runtime.failure(
        "INGESTION_STORAGE_ERROR",
        error?.message || "Ingestion storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "INGESTION_RECORD_NOT_FOUND",
            "Ingestion record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "INGESTION_STORAGE_ERROR",
        error?.message || "Ingestion retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "INGESTION_STORAGE_ERROR",
        error?.message || "Ingestion listing failed."
      );
    }
  }

  global.INFINICUS.BI.ingestionStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-03-Data-Ingestion-Coordination-Engine/src/engine/data-ingestion-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerJob(input = {}) {
    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            input.datasetContractId
        });

    if (!contract.ok) return contract;

    if (contract.data.status !== "published") {
      return runtime.failure(
        "CONTRACT_NOT_PUBLISHED",
        "Only published dataset contracts may be used."
      );
    }

    const built =
      global.INFINICUS.BI
        .ingestionJobModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .ingestionStore
        .put("jobs", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.ingestion_job.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    ingestionJobId,
    records = [],
    idempotencyKey,
    correlationId = null,
    cursor = null,
    watermark = null
  } = {}) {
    const job =
      await global.INFINICUS.BI
        .ingestionStore
        .get("jobs", ingestionJobId);

    if (!job.ok) return job;

    if (job.data.status !== "active") {
      return runtime.failure(
        "INGESTION_JOB_INACTIVE",
        "The ingestion job is not active."
      );
    }

    const idempotency =
      global.INFINICUS.BI
        .ingestionIdempotencyRegistry
        .reserve(idempotencyKey, {
          ingestionJobId
        });

    if (!idempotency.reserved) {
      return runtime.failure(
        "DUPLICATE_INGESTION",
        idempotency.reason,
        idempotency
      );
    }

    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            job.data.datasetContractId
        });

    if (!contract.ok) return contract;

    const run =
      global.INFINICUS.BI
        .ingestionRunModel
        .create({
          ingestionJob: job.data,
          correlationId,
          idempotencyKey,
          cursor,
          watermark
        });

    run.counts.received =
      Array.isArray(records) ? records.length : 0;

    const mappedRecords = [];
    const rejectedRecords = [];

    for (let index = 0; index < records.length; index += 1) {
      const mapped =
        global.INFINICUS.BI
          .ingestionRecordMapper
          .mapRecord(
            records[index],
            contract.data.mappings
          );

      if (mapped.valid) {
        mappedRecords.push({
          sourceIndex: index,
          record: mapped.record
        });
      } else {
        rejectedRecords.push({
          sourceIndex: index,
          sourceRecord:
            runtime.clone(records[index]),
          errors: mapped.errors
        });
      }
    }

    run.counts.mapped = mappedRecords.length;
    run.counts.rejected = rejectedRecords.length;
    run.counts.pendingQuality = mappedRecords.length;
    run.status =
      rejectedRecords.length === records.length &&
      records.length > 0
        ? "failed"
        : "completed";
    run.errors =
      rejectedRecords.flatMap(item => item.errors);
    run.completedAt = new Date().toISOString();
    run.updatedAt = run.completedAt;

    await global.INFINICUS.BI
      .ingestionStore
      .put("runs", run);

    const handoff = {
      qualityHandoffId:
        runtime.createId("bi_quality_handoff"),
      targetBlock: "BI-04",
      ingestionRunId:
        run.ingestionRunId,
      ingestionJobId,
      datasetContractId:
        run.datasetContractId,
      correlationId:
        run.correlationId,
      records:
        mappedRecords.map(runtime.clone),
      rejectedRecords:
        rejectedRecords.map(runtime.clone),
      cursor,
      watermark,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .ingestionStore
      .put("quality_handoffs", handoff);

    await runtime.emit(
      "bi.ingestion.completed",
      {
        run,
        qualityHandoffId:
          handoff.qualityHandoffId
      }
    );

    return runtime.success({
      run,
      handoff
    });
  }

  async function retry({
    ingestionRunId,
    records = []
  } = {}) {
    const previous =
      await global.INFINICUS.BI
        .ingestionStore
        .get("runs", ingestionRunId);

    if (!previous.ok) return previous;

    const job =
      await global.INFINICUS.BI
        .ingestionStore
        .get(
          "jobs",
          previous.data.ingestionJobId
        );

    if (!job.ok) return job;

    if (
      previous.data.attempt >=
      job.data.maximumRetries + 1
    ) {
      return runtime.failure(
        "RETRY_LIMIT_REACHED",
        "Maximum ingestion retries reached."
      );
    }

    const nextKey =
      `${previous.data.idempotencyKey}:retry:${previous.data.attempt + 1}`;

    const result = await execute({
      ingestionJobId:
        previous.data.ingestionJobId,
      records,
      idempotencyKey: nextKey,
      correlationId:
        previous.data.correlationId,
      cursor: previous.data.cursor,
      watermark:
        previous.data.watermark
    });

    if (result.ok) {
      result.data.run.attempt =
        previous.data.attempt + 1;

      await global.INFINICUS.BI
        .ingestionStore
        .put("runs", result.data.run);
    }

    return result;
  }

  const api = Object.freeze({
    registerJob,
    execute,
    retry,
    getJob: ({ ingestionJobId }) =>
      global.INFINICUS.BI
        .ingestionStore
        .get("jobs", ingestionJobId),
    getRun: ({ ingestionRunId }) =>
      global.INFINICUS.BI
        .ingestionStore
        .get("runs", ingestionRunId),
    getQualityHandoff: ({ qualityHandoffId }) =>
      global.INFINICUS.BI
        .ingestionStore
        .get(
          "quality_handoffs",
          qualityHandoffId
        ),
    listRuns: () =>
      global.INFINICUS.BI
        .ingestionStore
        .list("runs")
  });

  runtime.registerService(
    "bi.data_ingestion",
    api,
    { block: "BI-03" }
  );

  runtime.registerRoute(
    "bi.ingestion_job.register",
    registerJob
  );

  runtime.registerRoute(
    "bi.ingestion.execute",
    execute
  );

  runtime.registerRoute(
    "bi.ingestion.retry",
    retry
  );

  global.INFINICUS.BI.dataIngestionEngine = api;
})(window);

/* ===== INFINICUS-BI-04-Data-Validation-Quality-Control-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-04-Data-Validation-Quality-Control-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  if (!global.INFINICUS?.BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-04.");
  }

  if (!global.INFINICUS?.BI?.dataSourceMappingEngine) {
    throw new Error("INFINICUS BI-02 must be loaded before BI-04.");
  }

  if (!global.INFINICUS?.BI?.dataIngestionEngine) {
    throw new Error("INFINICUS BI-03 must be loaded before BI-04.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-04-Data-Validation-Quality-Control-Engine/src/model/quality-rule.js --- */
(function (global) {
  "use strict";

  const RULE_TYPES = Object.freeze([
    "required",
    "type",
    "range",
    "pattern",
    "allowed_values",
    "unique",
    "referential",
    "timeliness"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const ruleType = String(input.ruleType || "");

    if (
      !input.datasetContractId ||
      !input.field ||
      !RULE_TYPES.includes(ruleType)
    ) {
      return runtime.failure(
        "QUALITY_RULE_INVALID",
        "datasetContractId, field, and a supported ruleType are required."
      );
    }

    return runtime.success({
      qualityRuleId:
        input.qualityRuleId ||
        runtime.createId("bi_quality_rule"),
      datasetContractId:
        String(input.datasetContractId),
      field: String(input.field),
      ruleType,
      severity:
        String(input.severity || "error"),
      configuration:
        runtime.clone(input.configuration || {}),
      description:
        String(input.description || ""),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.qualityRuleModel =
    Object.freeze({
      RULE_TYPES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-04-Data-Validation-Quality-Control-Engine/src/validation/rule-evaluator.js --- */
(function (global) {
  "use strict";

  function isType(value, type) {
    if (value == null) return true;

    if (type === "string") {
      return typeof value === "string";
    }

    if (type === "integer") {
      return Number.isInteger(value);
    }

    if (
      ["number", "currency", "percentage"]
        .includes(type)
    ) {
      return typeof value === "number" &&
        Number.isFinite(value);
    }

    if (type === "boolean") {
      return typeof value === "boolean";
    }

    if (["date", "datetime"].includes(type)) {
      return !Number.isNaN(
        new Date(value).getTime()
      );
    }

    return true;
  }

  function evaluate({
    rule,
    record,
    context = {}
  }) {
    const value = record?.[rule.field];
    const config = rule.configuration || {};
    let passed = true;
    let message = "";

    switch (rule.ruleType) {
      case "required":
        passed =
          value !== null &&
          value !== undefined &&
          value !== "";
        message =
          `Required value missing: ${rule.field}`;
        break;

      case "type":
        passed =
          isType(value, config.dataType);
        message =
          `Invalid type for ${rule.field}; expected ${config.dataType}.`;
        break;

      case "range":
        passed =
          value == null ||
          (
            (config.minimum == null ||
              value >= config.minimum) &&
            (config.maximum == null ||
              value <= config.maximum)
          );
        message =
          `Value outside permitted range for ${rule.field}.`;
        break;

      case "pattern":
        passed =
          value == null ||
          new RegExp(config.pattern || ".*")
            .test(String(value));
        message =
          `Value does not match required pattern for ${rule.field}.`;
        break;

      case "allowed_values":
        passed =
          value == null ||
          (config.values || []).includes(value);
        message =
          `Value is not allowed for ${rule.field}.`;
        break;

      case "unique":
        passed =
          value == null ||
          !context.seenValues
            ?.get(rule.field)
            ?.has(value);
        message =
          `Duplicate value detected for ${rule.field}.`;
        break;

      case "referential":
        passed =
          value == null ||
          context.references
            ?.get(rule.field)
            ?.has(value);
        message =
          `Reference was not found for ${rule.field}.`;
        break;

      case "timeliness": {
        const date = new Date(value);
        const maximumAgeMinutes =
          Number(config.maximumAgeMinutes || 0);

        passed =
          value == null ||
          (
            !Number.isNaN(date.getTime()) &&
            (
              !maximumAgeMinutes ||
              Date.now() - date.getTime() <=
                maximumAgeMinutes * 60000
            )
          );

        message =
          `Value is stale or invalid for ${rule.field}.`;
        break;
      }

      default:
        passed = false;
        message = `Unsupported rule type: ${rule.ruleType}`;
    }

    return {
      passed,
      qualityRuleId:
        rule.qualityRuleId,
      field:
        rule.field,
      ruleType:
        rule.ruleType,
      severity:
        rule.severity,
      value,
      message:
        passed ? null : message
    };
  }

  global.INFINICUS.BI.qualityRuleEvaluator =
    Object.freeze({
      isType,
      evaluate
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-04-Data-Validation-Quality-Control-Engine/src/scoring/quality-scorer.js --- */
(function (global) {
  "use strict";

  function score({
    totalRecords,
    acceptedRecords,
    warningCount,
    errorCount
  }) {
    if (!totalRecords) {
      return {
        score: 100,
        level: "empty",
        acceptanceRate: 1
      };
    }

    const acceptanceRate =
      acceptedRecords / totalRecords;

    const warningPenalty =
      Math.min(10, warningCount * 0.5);

    const errorPenalty =
      Math.min(50, errorCount * 2);

    const value = Math.max(
      0,
      acceptanceRate * 100 -
      warningPenalty -
      errorPenalty
    );

    return {
      score: Number(value.toFixed(2)),
      level:
        value >= 95 ? "excellent" :
        value >= 85 ? "good" :
        value >= 70 ? "acceptable" :
        value >= 50 ? "poor" :
        "critical",
      acceptanceRate:
        Number(acceptanceRate.toFixed(4))
    };
  }

  global.INFINICUS.BI.qualityScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-04-Data-Validation-Quality-Control-Engine/src/storage/quality-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_DATA_QUALITY";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["rules", "qualityRuleId"],
          ["quality_runs", "qualityRunId"],
          ["issues", "qualityIssueId"],
          ["quarantine", "quarantineRecordId"],
          ["cleaning_handoffs", "cleaningHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    } catch (error) {
      return runtime.failure(
        "QUALITY_STORAGE_ERROR",
        error?.message || "Quality storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "QUALITY_RECORD_NOT_FOUND",
            "Quality record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "QUALITY_STORAGE_ERROR",
        error?.message || "Quality retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "QUALITY_STORAGE_ERROR",
        error?.message || "Quality listing failed."
      );
    }
  }

  global.INFINICUS.BI.qualityStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-04-Data-Validation-Quality-Control-Engine/src/engine/data-quality-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            input.datasetContractId
        });

    if (!contract.ok) return contract;

    const targetFields =
      contract.data.mappings
        .map(mapping => mapping.targetField);

    if (!targetFields.includes(input.field)) {
      return runtime.failure(
        "QUALITY_FIELD_NOT_FOUND",
        `Field is not present in the dataset contract: ${input.field}`
      );
    }

    const built =
      global.INFINICUS.BI
        .qualityRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .qualityStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.quality_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function evaluateHandoff({
    qualityHandoffId,
    references = {}
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .dataIngestionEngine
        .getQualityHandoff({
          qualityHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .qualityStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data.filter(rule =>
        rule.datasetContractId ===
          handoff.data.datasetContractId &&
        rule.status === "active"
      );

    const seenValues = new Map();
    const referenceMap = new Map(
      Object.entries(references).map(
        ([field, values]) =>
          [field, new Set(values)]
      )
    );

    const acceptedRecords = [];
    const warningRecords = [];
    const quarantinedRecords = [];
    const issues = [];

    for (const item of handoff.data.records) {
      const recordIssues = [];

      for (const rule of rules) {
        const outcome =
          global.INFINICUS.BI
            .qualityRuleEvaluator
            .evaluate({
              rule,
              record: item.record,
              context: {
                seenValues,
                references: referenceMap
              }
            });

        if (!outcome.passed) {
          recordIssues.push(outcome);
        }
      }

      for (const rule of rules.filter(
        rule => rule.ruleType === "unique"
      )) {
        if (!seenValues.has(rule.field)) {
          seenValues.set(rule.field, new Set());
        }

        const value = item.record[rule.field];

        if (value != null) {
          seenValues.get(rule.field).add(value);
        }
      }

      const errors =
        recordIssues.filter(issue =>
          issue.severity === "error"
        );

      const warnings =
        recordIssues.filter(issue =>
          issue.severity !== "error"
        );

      for (const issue of recordIssues) {
        const issueRecord = {
          qualityIssueId:
            runtime.createId("bi_quality_issue"),
          qualityHandoffId,
          ingestionRunId:
            handoff.data.ingestionRunId,
          datasetContractId:
            handoff.data.datasetContractId,
          sourceIndex:
            item.sourceIndex,
          ...runtime.clone(issue),
          status: "open",
          createdAt:
            new Date().toISOString()
        };

        issues.push(issueRecord);

        await global.INFINICUS.BI
          .qualityStore
          .put("issues", issueRecord);
      }

      if (errors.length) {
        const quarantine = {
          quarantineRecordId:
            runtime.createId("bi_quarantine"),
          qualityHandoffId,
          ingestionRunId:
            handoff.data.ingestionRunId,
          datasetContractId:
            handoff.data.datasetContractId,
          sourceIndex:
            item.sourceIndex,
          record:
            runtime.clone(item.record),
          issues:
            errors.map(runtime.clone),
          status: "quarantined",
          createdAt:
            new Date().toISOString()
        };

        quarantinedRecords.push(quarantine);

        await global.INFINICUS.BI
          .qualityStore
          .put("quarantine", quarantine);
      } else {
        acceptedRecords.push(
          runtime.clone(item)
        );

        if (warnings.length) {
          warningRecords.push({
            ...runtime.clone(item),
            warnings:
              warnings.map(runtime.clone)
          });
        }
      }
    }

    const warningCount =
      issues.filter(issue =>
        issue.severity !== "error"
      ).length;

    const errorCount =
      issues.filter(issue =>
        issue.severity === "error"
      ).length;

    const qualityScore =
      global.INFINICUS.BI
        .qualityScorer
        .score({
          totalRecords:
            handoff.data.records.length,
          acceptedRecords:
            acceptedRecords.length,
          warningCount,
          errorCount
        });

    const qualityRun = {
      qualityRunId:
        runtime.createId("bi_quality_run"),
      qualityHandoffId,
      ingestionRunId:
        handoff.data.ingestionRunId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        evaluated:
          handoff.data.records.length,
        accepted:
          acceptedRecords.length,
        warningRecords:
          warningRecords.length,
        quarantined:
          quarantinedRecords.length,
        issues:
          issues.length
      },
      qualityScore,
      status:
        qualityScore.level === "critical"
          ? "failed"
          : "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .qualityStore
      .put("quality_runs", qualityRun);

    const cleaningHandoff = {
      cleaningHandoffId:
        runtime.createId("bi_cleaning_handoff"),
      targetBlock: "BI-05",
      qualityRunId:
        qualityRun.qualityRunId,
      ingestionRunId:
        qualityRun.ingestionRunId,
      datasetContractId:
        qualityRun.datasetContractId,
      correlationId:
        qualityRun.correlationId,
      acceptedRecords:
        acceptedRecords.map(runtime.clone),
      warningRecords:
        warningRecords.map(runtime.clone),
      quarantinedRecords:
        quarantinedRecords.map(runtime.clone),
      qualityScore:
        runtime.clone(qualityScore),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .qualityStore
      .put(
        "cleaning_handoffs",
        cleaningHandoff
      );

    await runtime.emit(
      "bi.data_quality.completed",
      {
        qualityRun,
        cleaningHandoffId:
          cleaningHandoff.cleaningHandoffId
      }
    );

    return runtime.success({
      qualityRun,
      cleaningHandoff,
      issues
    });
  }

  const api = Object.freeze({
    registerRule,
    evaluateHandoff,
    getQualityRun: ({ qualityRunId }) =>
      global.INFINICUS.BI
        .qualityStore
        .get("quality_runs", qualityRunId),
    getCleaningHandoff: ({ cleaningHandoffId }) =>
      global.INFINICUS.BI
        .qualityStore
        .get(
          "cleaning_handoffs",
          cleaningHandoffId
        ),
    listIssues: () =>
      global.INFINICUS.BI
        .qualityStore
        .list("issues"),
    listQuarantine: () =>
      global.INFINICUS.BI
        .qualityStore
        .list("quarantine")
  });

  runtime.registerService(
    "bi.data_quality",
    api,
    { block: "BI-04" }
  );

  runtime.registerRoute(
    "bi.quality_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.data_quality.evaluate",
    evaluateHandoff
  );

  global.INFINICUS.BI.dataQualityEngine = api;
})(window);

/* ===== INFINICUS-BI-05-Data-Cleaning-Standardization-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-05-Data-Cleaning-Standardization-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-05.");
  }

  if (!BI?.dataSourceMappingEngine) {
    throw new Error("INFINICUS BI-02 must be loaded before BI-05.");
  }

  if (!BI?.dataIngestionEngine) {
    throw new Error("INFINICUS BI-03 must be loaded before BI-05.");
  }

  if (!BI?.dataQualityEngine) {
    throw new Error("INFINICUS BI-04 must be loaded before BI-05.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-05-Data-Cleaning-Standardization-Engine/src/model/cleaning-rule.js --- */
(function (global) {
  "use strict";

  const RULE_TYPES = Object.freeze([
    "trim",
    "lowercase",
    "uppercase",
    "title_case",
    "collapse_whitespace",
    "replace_null",
    "to_number",
    "round_number",
    "standardize_date",
    "standardize_datetime",
    "normalize_email",
    "normalize_phone",
    "normalize_identifier",
    "replace_pattern"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const ruleType = String(input.ruleType || "");

    if (
      !input.datasetContractId ||
      !input.field ||
      !RULE_TYPES.includes(ruleType)
    ) {
      return runtime.failure(
        "CLEANING_RULE_INVALID",
        "datasetContractId, field, and a supported ruleType are required."
      );
    }

    return runtime.success({
      cleaningRuleId:
        input.cleaningRuleId ||
        runtime.createId("bi_cleaning_rule"),
      datasetContractId:
        String(input.datasetContractId),
      field: String(input.field),
      ruleType,
      sequence:
        Math.max(1, Number(input.sequence || 1)),
      configuration:
        runtime.clone(input.configuration || {}),
      mode:
        String(input.mode || "automatic"),
      status:
        String(input.status || "active"),
      description:
        String(input.description || ""),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.cleaningRuleModel =
    Object.freeze({
      RULE_TYPES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-05-Data-Cleaning-Standardization-Engine/src/cleaning/value-cleaner.js --- */
(function (global) {
  "use strict";

  function titleCase(value) {
    return String(value)
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function normalizePhone(value, defaultCountryCode = "") {
    const original = String(value || "").trim();
    const hasPlus = original.startsWith("+");
    const digits = original.replace(/\D/g, "");

    if (!digits) return "";

    if (hasPlus) return `+${digits}`;

    const country = String(defaultCountryCode || "")
      .replace(/\D/g, "");

    return country
      ? `+${country}${digits.replace(/^0+/, "")}`
      : digits;
  }

  function apply(value, rule) {
    const config = rule.configuration || {};

    switch (rule.ruleType) {
      case "trim":
        return value == null ? value : String(value).trim();

      case "lowercase":
        return value == null ? value : String(value).toLowerCase();

      case "uppercase":
        return value == null ? value : String(value).toUpperCase();

      case "title_case":
        return value == null ? value : titleCase(value);

      case "collapse_whitespace":
        return value == null
          ? value
          : String(value).replace(/\s+/g, " ").trim();

      case "replace_null":
        return value == null || value === ""
          ? config.defaultValue ?? null
          : value;

      case "to_number": {
        if (value == null || value === "") return value;

        const cleaned =
          String(value)
            .replace(/[^\d.-]/g, "");

        const parsed = Number(cleaned);

        if (!Number.isFinite(parsed)) {
          throw new Error(`Cannot normalize number: ${value}`);
        }

        return parsed;
      }

      case "round_number": {
        if (value == null || value === "") return value;

        const decimals =
          Math.max(0, Number(config.decimals || 0));

        const parsed = Number(value);

        if (!Number.isFinite(parsed)) {
          throw new Error(`Cannot round number: ${value}`);
        }

        return Number(parsed.toFixed(decimals));
      }

      case "standardize_date": {
        if (value == null || value === "") return value;

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot standardize date: ${value}`);
        }

        return date.toISOString().slice(0, 10);
      }

      case "standardize_datetime": {
        if (value == null || value === "") return value;

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot standardize datetime: ${value}`);
        }

        return date.toISOString();
      }

      case "normalize_email":
        return value == null
          ? value
          : String(value).trim().toLowerCase();

      case "normalize_phone":
        return value == null
          ? value
          : normalizePhone(
              value,
              config.defaultCountryCode
            );

      case "normalize_identifier":
        return value == null
          ? value
          : String(value)
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9_-]/g, "");

      case "replace_pattern":
        return value == null
          ? value
          : String(value).replace(
              new RegExp(
                config.pattern || "",
                config.flags || "g"
              ),
              config.replacement || ""
            );

      default:
        throw new Error(
          `Unsupported cleaning rule: ${rule.ruleType}`
        );
    }
  }

  global.INFINICUS.BI.valueCleaner =
    Object.freeze({
      titleCase,
      normalizePhone,
      apply
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-05-Data-Cleaning-Standardization-Engine/src/cleaning/record-cleaner.js --- */
(function (global) {
  "use strict";

  function clean(record, rules = []) {
    const output = structuredClone(record);
    const changes = [];
    const errors = [];

    const orderedRules =
      [...rules].sort(
        (a, b) => a.sequence - b.sequence
      );

    for (const rule of orderedRules) {
      if (rule.status !== "active") continue;

      if (rule.mode !== "automatic") {
        continue;
      }

      const before = output[rule.field];

      try {
        const after =
          global.INFINICUS.BI
            .valueCleaner
            .apply(before, rule);

        output[rule.field] = after;

        if (!Object.is(before, after)) {
          changes.push({
            cleaningRuleId:
              rule.cleaningRuleId,
            field:
              rule.field,
            ruleType:
              rule.ruleType,
            before,
            after
          });
        }
      } catch (error) {
        errors.push({
          cleaningRuleId:
            rule.cleaningRuleId,
          field:
            rule.field,
          ruleType:
            rule.ruleType,
          message:
            error?.message ||
            "Cleaning rule failed."
        });
      }
    }

    return {
      valid: errors.length === 0,
      record: output,
      changes,
      errors
    };
  }

  global.INFINICUS.BI.recordCleaner =
    Object.freeze({ clean });
})(window);

/* --- business-intelligence/INFINICUS-BI-05-Data-Cleaning-Standardization-Engine/src/storage/cleaning-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_DATA_CLEANING";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["rules", "cleaningRuleId"],
          ["cleaning_runs", "cleaningRunId"],
          ["cleaned_records", "cleanedRecordId"],
          ["manual_remediation", "remediationId"],
          ["resolution_handoffs", "resolutionHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    } catch (error) {
      return runtime.failure(
        "CLEANING_STORAGE_ERROR",
        error?.message ||
          "Cleaning storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "CLEANING_RECORD_NOT_FOUND",
            "Cleaning record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "CLEANING_STORAGE_ERROR",
        error?.message ||
          "Cleaning retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "CLEANING_STORAGE_ERROR",
        error?.message ||
          "Cleaning listing failed."
      );
    }
  }

  global.INFINICUS.BI.cleaningStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-05-Data-Cleaning-Standardization-Engine/src/engine/data-cleaning-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            input.datasetContractId
        });

    if (!contract.ok) return contract;

    const targetFields =
      contract.data.mappings
        .map(mapping => mapping.targetField);

    if (!targetFields.includes(input.field)) {
      return runtime.failure(
        "CLEANING_FIELD_NOT_FOUND",
        `Field is not present in the dataset contract: ${input.field}`
      );
    }

    const built =
      global.INFINICUS.BI
        .cleaningRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .cleaningStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.cleaning_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    cleaningHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .dataQualityEngine
        .getCleaningHandoff({
          cleaningHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .cleaningStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data.filter(rule =>
        rule.datasetContractId ===
          handoff.data.datasetContractId &&
        rule.status === "active"
      );

    const inputRecords = [
      ...handoff.data.acceptedRecords,
      ...handoff.data.warningRecords
    ];

    const cleanedRecords = [];
    const failedRecords = [];

    for (const item of inputRecords) {
      const cleaned =
        global.INFINICUS.BI
          .recordCleaner
          .clean(item.record, rules);

      const cleanedRecord = {
        cleanedRecordId:
          runtime.createId("bi_cleaned_record"),
        cleaningHandoffId,
        qualityRunId:
          handoff.data.qualityRunId,
        ingestionRunId:
          handoff.data.ingestionRunId,
        datasetContractId:
          handoff.data.datasetContractId,
        sourceIndex:
          item.sourceIndex,
        originalRecord:
          runtime.clone(item.record),
        cleanedRecord:
          runtime.clone(cleaned.record),
        changes:
          cleaned.changes.map(runtime.clone),
        errors:
          cleaned.errors.map(runtime.clone),
        status:
          cleaned.valid
            ? "cleaned"
            : "failed",
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.BI
        .cleaningStore
        .put(
          "cleaned_records",
          cleanedRecord
        );

      if (cleaned.valid) {
        cleanedRecords.push(cleanedRecord);
      } else {
        failedRecords.push(cleanedRecord);
      }
    }

    const manualRemediation = [];

    for (const quarantined of
      handoff.data.quarantinedRecords) {
      const remediation = {
        remediationId:
          runtime.createId("bi_remediation"),
        cleaningHandoffId,
        datasetContractId:
          handoff.data.datasetContractId,
        quarantineRecordId:
          quarantined.quarantineRecordId,
        record:
          runtime.clone(quarantined.record),
        issues:
          quarantined.issues.map(runtime.clone),
        status: "manual_review_required",
        createdAt:
          new Date().toISOString()
      };

      manualRemediation.push(remediation);

      await global.INFINICUS.BI
        .cleaningStore
        .put(
          "manual_remediation",
          remediation
        );
    }

    const cleaningRun = {
      cleaningRunId:
        runtime.createId("bi_cleaning_run"),
      cleaningHandoffId,
      qualityRunId:
        handoff.data.qualityRunId,
      ingestionRunId:
        handoff.data.ingestionRunId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        received:
          inputRecords.length,
        cleaned:
          cleanedRecords.length,
        failed:
          failedRecords.length,
        manualRemediation:
          manualRemediation.length
      },
      status:
        failedRecords.length === inputRecords.length &&
        inputRecords.length > 0
          ? "failed"
          : "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .cleaningStore
      .put("cleaning_runs", cleaningRun);

    const resolutionHandoff = {
      resolutionHandoffId:
        runtime.createId("bi_resolution_handoff"),
      targetBlock: "BI-06",
      cleaningRunId:
        cleaningRun.cleaningRunId,
      datasetContractId:
        cleaningRun.datasetContractId,
      correlationId:
        cleaningRun.correlationId,
      records:
        cleanedRecords.map(record => ({
          cleanedRecordId:
            record.cleanedRecordId,
          sourceIndex:
            record.sourceIndex,
          record:
            runtime.clone(record.cleanedRecord),
          changes:
            record.changes.map(runtime.clone)
        })),
      manualRemediation:
        manualRemediation.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .cleaningStore
      .put(
        "resolution_handoffs",
        resolutionHandoff
      );

    await runtime.emit(
      "bi.data_cleaning.completed",
      {
        cleaningRun,
        resolutionHandoffId:
          resolutionHandoff.resolutionHandoffId
      }
    );

    return runtime.success({
      cleaningRun,
      resolutionHandoff,
      failedRecords
    });
  }

  const api = Object.freeze({
    registerRule,
    execute,
    getCleaningRun: ({ cleaningRunId }) =>
      global.INFINICUS.BI
        .cleaningStore
        .get("cleaning_runs", cleaningRunId),
    getResolutionHandoff: ({ resolutionHandoffId }) =>
      global.INFINICUS.BI
        .cleaningStore
        .get(
          "resolution_handoffs",
          resolutionHandoffId
        ),
    listCleanedRecords: () =>
      global.INFINICUS.BI
        .cleaningStore
        .list("cleaned_records"),
    listManualRemediation: () =>
      global.INFINICUS.BI
        .cleaningStore
        .list("manual_remediation")
  });

  runtime.registerService(
    "bi.data_cleaning",
    api,
    { block: "BI-05" }
  );

  runtime.registerRoute(
    "bi.cleaning_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.data_cleaning.execute",
    execute
  );

  global.INFINICUS.BI.dataCleaningEngine = api;
})(window);

/* ===== INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-06.");
  }

  if (!BI?.dataCleaningEngine) {
    throw new Error("INFINICUS BI-05 must be loaded before BI-06.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine/src/model/match-rule.js --- */
(function (global) {
  "use strict";

  const METHODS = Object.freeze([
    "exact",
    "normalized_exact",
    "string_similarity",
    "numeric_tolerance"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (
      !input.datasetContractId ||
      !input.entityType ||
      !Array.isArray(input.fields) ||
      !input.fields.length
    ) {
      return runtime.failure(
        "MATCH_RULE_INVALID",
        "datasetContractId, entityType, and fields are required."
      );
    }

    const fields = input.fields.map(field => ({
      field: String(field.field || ""),
      method:
        METHODS.includes(field.method)
          ? field.method
          : "exact",
      weight:
        Math.max(0, Number(field.weight || 0)),
      tolerance:
        Number(field.tolerance || 0)
    }));

    if (fields.some(field => !field.field)) {
      return runtime.failure(
        "MATCH_FIELD_INVALID",
        "Every match field requires a field name."
      );
    }

    return runtime.success({
      matchRuleId:
        input.matchRuleId ||
        runtime.createId("bi_match_rule"),
      datasetContractId:
        String(input.datasetContractId),
      entityType:
        String(input.entityType),
      blockingFields:
        Array.isArray(input.blockingFields)
          ? [...new Set(
              input.blockingFields.map(String)
            )]
          : [],
      fields,
      automaticMatchThreshold:
        Math.max(
          0,
          Math.min(
            1,
            Number(
              input.automaticMatchThreshold || 0.9
            )
          )
        ),
      reviewThreshold:
        Math.max(
          0,
          Math.min(
            1,
            Number(input.reviewThreshold || 0.7)
          )
        ),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.matchRuleModel =
    Object.freeze({
      METHODS,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine/src/matching/similarity.js --- */
(function (global) {
  "use strict";

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function levenshtein(a, b) {
    const left = String(a ?? "");
    const right = String(b ?? "");

    const matrix =
      Array.from(
        { length: left.length + 1 },
        () =>
          Array(right.length + 1).fill(0)
      );

    for (let i = 0; i <= left.length; i += 1) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= right.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= left.length; i += 1) {
      for (let j = 1; j <= right.length; j += 1) {
        const cost =
          left[i - 1] === right[j - 1]
            ? 0
            : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[left.length][right.length];
  }

  function stringSimilarity(a, b) {
    const left = normalize(a);
    const right = normalize(b);

    if (!left && !right) return 1;
    if (!left || !right) return 0;

    const distance =
      levenshtein(left, right);

    return 1 -
      distance /
      Math.max(left.length, right.length);
  }

  function fieldScore(a, b, rule) {
    switch (rule.method) {
      case "exact":
        return Object.is(a, b) ? 1 : 0;

      case "normalized_exact":
        return normalize(a) === normalize(b)
          ? 1
          : 0;

      case "string_similarity":
        return stringSimilarity(a, b);

      case "numeric_tolerance": {
        const left = Number(a);
        const right = Number(b);

        if (
          !Number.isFinite(left) ||
          !Number.isFinite(right)
        ) {
          return 0;
        }

        return Math.abs(left - right) <=
          Number(rule.tolerance || 0)
            ? 1
            : 0;
      }

      default:
        return 0;
    }
  }

  global.INFINICUS.BI.entitySimilarity =
    Object.freeze({
      normalize,
      levenshtein,
      stringSimilarity,
      fieldScore
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine/src/matching/match-scorer.js --- */
(function (global) {
  "use strict";

  function score(left, right, rule) {
    let weighted = 0;
    let totalWeight = 0;
    const fieldScores = [];

    for (const fieldRule of rule.fields) {
      const weight =
        Math.max(0, Number(fieldRule.weight || 0));

      const value =
        global.INFINICUS.BI
          .entitySimilarity
          .fieldScore(
            left[fieldRule.field],
            right[fieldRule.field],
            fieldRule
          );

      weighted += value * weight;
      totalWeight += weight;

      fieldScores.push({
        field:
          fieldRule.field,
        method:
          fieldRule.method,
        weight,
        score:
          Number(value.toFixed(4))
      });
    }

    const overall =
      totalWeight
        ? weighted / totalWeight
        : 0;

    const classification =
      overall >= rule.automaticMatchThreshold
        ? "automatic_match"
        : overall >= rule.reviewThreshold
          ? "manual_review"
          : "no_match";

    return {
      score:
        Number(overall.toFixed(4)),
      classification,
      fieldScores
    };
  }

  global.INFINICUS.BI.entityMatchScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine/src/matching/candidate-generator.js --- */
(function (global) {
  "use strict";

  function blockingKey(record, fields = []) {
    if (!fields.length) return "__all__";

    return fields
      .map(field =>
        global.INFINICUS.BI
          .entitySimilarity
          .normalize(record[field])
      )
      .join("|");
  }

  function generate(records = [], blockingFields = []) {
    const blocks = new Map();

    for (const item of records) {
      const key =
        blockingKey(
          item.record,
          blockingFields
        );

      if (!blocks.has(key)) {
        blocks.set(key, []);
      }

      blocks.get(key).push(item);
    }

    const pairs = [];

    for (const group of blocks.values()) {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          pairs.push({
            left: group[i],
            right: group[j]
          });
        }
      }
    }

    return pairs;
  }

  global.INFINICUS.BI.matchCandidateGenerator =
    Object.freeze({
      blockingKey,
      generate
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine/src/storage/resolution-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_ENTITY_RESOLUTION";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["rules", "matchRuleId"],
          ["resolution_runs", "resolutionRunId"],
          ["match_decisions", "matchDecisionId"],
          ["clusters", "entityClusterId"],
          ["review_queue", "reviewItemId"],
          ["merge_plans", "mergePlanId"],
          ["transformation_handoffs", "transformationHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    } catch (error) {
      return runtime.failure(
        "RESOLUTION_STORAGE_ERROR",
        error?.message ||
          "Entity-resolution storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "RESOLUTION_RECORD_NOT_FOUND",
            "Entity-resolution record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "RESOLUTION_STORAGE_ERROR",
        error?.message ||
          "Entity-resolution retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");

      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    } catch (error) {
      return runtime.failure(
        "RESOLUTION_STORAGE_ERROR",
        error?.message ||
          "Entity-resolution listing failed."
      );
    }
  }

  global.INFINICUS.BI.resolutionStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-06-Entity-Resolution-Record-Matching-Engine/src/engine/entity-resolution-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const contract =
      await global.INFINICUS.BI
        .dataSourceMappingEngine
        .getDatasetContract({
          datasetContractId:
            input.datasetContractId
        });

    if (!contract.ok) return contract;

    const fields =
      new Set(
        contract.data.mappings
          .map(mapping => mapping.targetField)
      );

    const unknown =
      (input.fields || [])
        .map(field => field.field)
        .filter(field => !fields.has(field));

    if (unknown.length) {
      return runtime.failure(
        "MATCH_FIELDS_NOT_FOUND",
        "Match fields are not present in the dataset contract.",
        { unknown }
      );
    }

    const built =
      global.INFINICUS.BI
        .matchRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .resolutionStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.match_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    resolutionHandoffId,
    matchRuleId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .dataCleaningEngine
        .getResolutionHandoff({
          resolutionHandoffId
        });

    if (!handoff.ok) return handoff;

    const rule =
      await global.INFINICUS.BI
        .resolutionStore
        .get("rules", matchRuleId);

    if (!rule.ok) return rule;

    if (
      rule.data.datasetContractId !==
      handoff.data.datasetContractId
    ) {
      return runtime.failure(
        "MATCH_RULE_CONTRACT_MISMATCH",
        "Match rule does not belong to the handoff dataset contract."
      );
    }

    const pairs =
      global.INFINICUS.BI
        .matchCandidateGenerator
        .generate(
          handoff.data.records,
          rule.data.blockingFields
        );

    const automaticMatches = [];
    const reviewMatches = [];
    const rejectedMatches = [];

    for (const pair of pairs) {
      const match =
        global.INFINICUS.BI
          .entityMatchScorer
          .score(
            pair.left.record,
            pair.right.record,
            rule.data
          );

      const decision = {
        matchDecisionId:
          runtime.createId("bi_match_decision"),
        resolutionHandoffId,
        matchRuleId,
        leftCleanedRecordId:
          pair.left.cleanedRecordId,
        rightCleanedRecordId:
          pair.right.cleanedRecordId,
        score:
          match.score,
        classification:
          match.classification,
        fieldScores:
          match.fieldScores,
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.BI
        .resolutionStore
        .put("match_decisions", decision);

      if (
        match.classification ===
        "automatic_match"
      ) {
        automaticMatches.push({
          pair,
          decision
        });
      } else if (
        match.classification ===
        "manual_review"
      ) {
        reviewMatches.push({
          pair,
          decision
        });
      } else {
        rejectedMatches.push({
          pair,
          decision
        });
      }
    }

    const clusters = automaticMatches.map(item => {
      const leftId =
        item.pair.left.cleanedRecordId;

      const rightId =
        item.pair.right.cleanedRecordId;

      return {
        entityClusterId:
          runtime.createId("bi_entity_cluster"),
        entityType:
          rule.data.entityType,
        matchRuleId,
        recordIds:
          [leftId, rightId],
        canonicalRecordId:
          leftId,
        confidence:
          item.decision.score,
        status: "automatic_match",
        createdAt:
          new Date().toISOString()
      };
    });

    for (const cluster of clusters) {
      await global.INFINICUS.BI
        .resolutionStore
        .put("clusters", cluster);
    }

    const reviewQueue = reviewMatches.map(item => ({
      reviewItemId:
        runtime.createId("bi_match_review"),
      resolutionHandoffId,
      matchRuleId,
      leftCleanedRecordId:
        item.pair.left.cleanedRecordId,
      rightCleanedRecordId:
        item.pair.right.cleanedRecordId,
      score:
        item.decision.score,
      fieldScores:
        item.decision.fieldScores,
      status: "pending_review",
      createdAt:
        new Date().toISOString()
    }));

    for (const reviewItem of reviewQueue) {
      await global.INFINICUS.BI
        .resolutionStore
        .put("review_queue", reviewItem);
    }

    const mergePlans = clusters.map(cluster => ({
      mergePlanId:
        runtime.createId("bi_merge_plan"),
      entityClusterId:
        cluster.entityClusterId,
      canonicalRecordId:
        cluster.canonicalRecordId,
      sourceRecordIds:
        [...cluster.recordIds],
      strategy:
        "preserve_canonical_fill_missing",
      status:
        "prepared",
      createdAt:
        new Date().toISOString()
    }));

    for (const plan of mergePlans) {
      await global.INFINICUS.BI
        .resolutionStore
        .put("merge_plans", plan);
    }

    const resolutionRun = {
      resolutionRunId:
        runtime.createId("bi_resolution_run"),
      resolutionHandoffId,
      matchRuleId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        records:
          handoff.data.records.length,
        candidatePairs:
          pairs.length,
        automaticMatches:
          automaticMatches.length,
        manualReview:
          reviewMatches.length,
        noMatch:
          rejectedMatches.length,
        clusters:
          clusters.length
      },
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .resolutionStore
      .put("resolution_runs", resolutionRun);

    const transformationHandoff = {
      transformationHandoffId:
        runtime.createId("bi_transformation_handoff"),
      targetBlock: "BI-07",
      resolutionRunId:
        resolutionRun.resolutionRunId,
      datasetContractId:
        resolutionRun.datasetContractId,
      correlationId:
        resolutionRun.correlationId,
      records:
        handoff.data.records.map(runtime.clone),
      clusters:
        clusters.map(runtime.clone),
      mergePlans:
        mergePlans.map(runtime.clone),
      reviewQueue:
        reviewQueue.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .resolutionStore
      .put(
        "transformation_handoffs",
        transformationHandoff
      );

    await runtime.emit(
      "bi.entity_resolution.completed",
      {
        resolutionRun,
        transformationHandoffId:
          transformationHandoff
            .transformationHandoffId
      }
    );

    return runtime.success({
      resolutionRun,
      transformationHandoff,
      automaticMatches,
      reviewMatches,
      rejectedMatches
    });
  }

  const api = Object.freeze({
    registerRule,
    execute,
    getResolutionRun: ({ resolutionRunId }) =>
      global.INFINICUS.BI
        .resolutionStore
        .get("resolution_runs", resolutionRunId),
    getTransformationHandoff: ({ transformationHandoffId }) =>
      global.INFINICUS.BI
        .resolutionStore
        .get(
          "transformation_handoffs",
          transformationHandoffId
        ),
    listReviewQueue: () =>
      global.INFINICUS.BI
        .resolutionStore
        .list("review_queue"),
    listClusters: () =>
      global.INFINICUS.BI
        .resolutionStore
        .list("clusters")
  });

  runtime.registerService(
    "bi.entity_resolution",
    api,
    { block: "BI-06" }
  );

  runtime.registerRoute(
    "bi.match_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.entity_resolution.execute",
    execute
  );

  global.INFINICUS.BI.entityResolutionEngine = api;
})(window);

/* ===== INFINICUS-BI-07-Data-Transformation-Enrichment-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-07-Data-Transformation-Enrichment-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-07.");
  }

  if (!BI?.entityResolutionEngine) {
    throw new Error("INFINICUS BI-06 must be loaded before BI-07.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-07-Data-Transformation-Enrichment-Engine/src/model/transformation-rule.js --- */
(function (global) {
  "use strict";

  const RULE_TYPES = Object.freeze([
    "rename_field",
    "copy_field",
    "constant",
    "formula",
    "classification",
    "lookup",
    "date_parts",
    "project_fields",
    "drop_field"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const ruleType = String(input.ruleType || "");

    if (
      !input.datasetContractId ||
      !RULE_TYPES.includes(ruleType)
    ) {
      return runtime.failure(
        "TRANSFORMATION_RULE_INVALID",
        "datasetContractId and a supported ruleType are required."
      );
    }

    return runtime.success({
      transformationRuleId:
        input.transformationRuleId ||
        runtime.createId("bi_transformation_rule"),
      datasetContractId:
        String(input.datasetContractId),
      ruleType,
      targetField:
        input.targetField || null,
      sourceFields:
        Array.isArray(input.sourceFields)
          ? input.sourceFields.map(String)
          : [],
      sequence:
        Math.max(1, Number(input.sequence || 1)),
      configuration:
        runtime.clone(input.configuration || {}),
      status:
        String(input.status || "active"),
      description:
        String(input.description || ""),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.transformationRuleModel =
    Object.freeze({
      RULE_TYPES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-07-Data-Transformation-Enrichment-Engine/src/transformation/formula-engine.js --- */
(function (global) {
  "use strict";

  const OPERATORS = Object.freeze({
    add: values => values.reduce((a, b) => a + b, 0),
    subtract: values => values.slice(1).reduce((a, b) => a - b, values[0] || 0),
    multiply: values => values.reduce((a, b) => a * b, 1),
    divide: values => values.slice(1).reduce((a, b) => b === 0 ? a : a / b, values[0] || 0),
    average: values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
    percentage: values => values[1] ? values[0] / values[1] * 100 : 0
  });

  function evaluate(record, configuration = {}) {
    const operator = String(configuration.operator || "");
    const fn = OPERATORS[operator];

    if (!fn) {
      throw new Error(`Unsupported formula operator: ${operator}`);
    }

    const values = (configuration.fields || []).map(field => {
      const value = Number(record[field]);
      if (!Number.isFinite(value)) {
        throw new Error(`Formula field is not numeric: ${field}`);
      }
      return value;
    });

    return fn(values);
  }

  global.INFINICUS.BI.formulaEngine =
    Object.freeze({
      OPERATORS,
      evaluate
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-07-Data-Transformation-Enrichment-Engine/src/transformation/rule-applier.js --- */
(function (global) {
  "use strict";

  function apply(record, rule, context = {}) {
    const output = structuredClone(record);
    const config = rule.configuration || {};

    switch (rule.ruleType) {
      case "rename_field": {
        const source = rule.sourceFields[0];
        output[rule.targetField] = output[source];
        delete output[source];
        break;
      }

      case "copy_field": {
        const source = rule.sourceFields[0];
        output[rule.targetField] = output[source];
        break;
      }

      case "constant":
        output[rule.targetField] = config.value ?? null;
        break;

      case "formula":
        output[rule.targetField] =
          global.INFINICUS.BI.formulaEngine.evaluate(
            output,
            config
          );
        break;

      case "classification": {
        const source = rule.sourceFields[0];
        const value = output[source];
        const matched = (config.conditions || []).find(condition => {
          if (condition.operator === "gte") return value >= condition.value;
          if (condition.operator === "gt") return value > condition.value;
          if (condition.operator === "lte") return value <= condition.value;
          if (condition.operator === "lt") return value < condition.value;
          if (condition.operator === "eq") return value === condition.value;
          if (condition.operator === "in") return (condition.value || []).includes(value);
          return false;
        });

        output[rule.targetField] =
          matched?.label ?? config.defaultLabel ?? null;
        break;
      }

      case "lookup": {
        const source = rule.sourceFields[0];
        const table = context.lookups?.[config.lookupName] || {};
        output[rule.targetField] =
          table[output[source]] ?? config.defaultValue ?? null;
        break;
      }

      case "date_parts": {
        const source = rule.sourceFields[0];
        const date = new Date(output[source]);

        if (Number.isNaN(date.getTime())) {
          throw new Error(`Invalid date value: ${output[source]}`);
        }

        const prefix = rule.targetField || source;
        output[`${prefix}_year`] = date.getUTCFullYear();
        output[`${prefix}_month`] = date.getUTCMonth() + 1;
        output[`${prefix}_day`] = date.getUTCDate();
        output[`${prefix}_weekday`] = date.getUTCDay();
        break;
      }

      case "project_fields": {
        const projected = {};
        for (const field of config.fields || []) {
          projected[field] = output[field];
        }
        return projected;
      }

      case "drop_field":
        for (const field of rule.sourceFields) {
          delete output[field];
        }
        break;

      default:
        throw new Error(`Unsupported transformation rule: ${rule.ruleType}`);
    }

    return output;
  }

  global.INFINICUS.BI.transformationRuleApplier =
    Object.freeze({ apply });
})(window);

/* --- business-intelligence/INFINICUS-BI-07-Data-Transformation-Enrichment-Engine/src/transformation/merge-plan-applier.js --- */
(function (global) {
  "use strict";

  function mergeRecords(records = [], mergePlans = []) {
    const byId = new Map(
      records.map(item => [item.cleanedRecordId, structuredClone(item)])
    );

    const consumed = new Set();

    for (const plan of mergePlans) {
      const canonical = byId.get(plan.canonicalRecordId);
      if (!canonical) continue;

      for (const sourceId of plan.sourceRecordIds || []) {
        if (sourceId === plan.canonicalRecordId) continue;
        const source = byId.get(sourceId);
        if (!source) continue;

        for (const [key, value] of Object.entries(source.record || {})) {
          if (
            canonical.record[key] == null ||
            canonical.record[key] === ""
          ) {
            canonical.record[key] = value;
          }
        }

        consumed.add(sourceId);
      }
    }

    return [...byId.values()]
      .filter(item => !consumed.has(item.cleanedRecordId));
  }

  global.INFINICUS.BI.mergePlanApplier =
    Object.freeze({ mergeRecords });
})(window);

/* --- business-intelligence/INFINICUS-BI-07-Data-Transformation-Enrichment-Engine/src/storage/transformation-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_TRANSFORMATION";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["rules", "transformationRuleId"],
          ["transformation_runs", "transformationRunId"],
          ["transformed_records", "transformedRecordId"],
          ["warehouse_handoffs", "warehouseHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName).put(structuredClone(record))
      );

      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "TRANSFORMATION_STORAGE_ERROR",
        error?.message || "Transformation storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "TRANSFORMATION_RECORD_NOT_FOUND",
            "Transformation record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "TRANSFORMATION_STORAGE_ERROR",
        error?.message || "Transformation retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "TRANSFORMATION_STORAGE_ERROR",
        error?.message || "Transformation listing failed."
      );
    }
  }

  global.INFINICUS.BI.transformationStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-07-Data-Transformation-Enrichment-Engine/src/engine/data-transformation-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const built =
      global.INFINICUS.BI
        .transformationRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .transformationStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.transformation_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function execute({
    transformationHandoffId,
    lookups = {}
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .entityResolutionEngine
        .getTransformationHandoff({
          transformationHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .transformationStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data
        .filter(rule =>
          rule.datasetContractId ===
            handoff.data.datasetContractId &&
          rule.status === "active"
        )
        .sort((a, b) => a.sequence - b.sequence);

    const merged =
      global.INFINICUS.BI
        .mergePlanApplier
        .mergeRecords(
          handoff.data.records,
          handoff.data.mergePlans
        );

    const transformedRecords = [];
    const failedRecords = [];

    for (const item of merged) {
      let current = runtime.clone(item.record);
      const lineage = [];
      const errors = [];

      for (const rule of rules) {
        try {
          const before = runtime.clone(current);
          current =
            global.INFINICUS.BI
              .transformationRuleApplier
              .apply(current, rule, { lookups });

          lineage.push({
            transformationRuleId:
              rule.transformationRuleId,
            ruleType:
              rule.ruleType,
            before,
            after:
              runtime.clone(current)
          });
        } catch (error) {
          errors.push({
            transformationRuleId:
              rule.transformationRuleId,
            ruleType:
              rule.ruleType,
            message:
              error?.message ||
              "Transformation failed."
          });
        }
      }

      const record = {
        transformedRecordId:
          runtime.createId("bi_transformed_record"),
        transformationHandoffId,
        datasetContractId:
          handoff.data.datasetContractId,
        sourceCleanedRecordId:
          item.cleanedRecordId,
        record:
          runtime.clone(current),
        lineage,
        errors,
        status:
          errors.length
            ? "failed"
            : "transformed",
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.BI
        .transformationStore
        .put("transformed_records", record);

      if (errors.length) {
        failedRecords.push(record);
      } else {
        transformedRecords.push(record);
      }
    }

    const transformationRun = {
      transformationRunId:
        runtime.createId("bi_transformation_run"),
      transformationHandoffId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      counts: {
        received:
          handoff.data.records.length,
        afterMerge:
          merged.length,
        transformed:
          transformedRecords.length,
        failed:
          failedRecords.length
      },
      status:
        failedRecords.length === merged.length &&
        merged.length > 0
          ? "failed"
          : "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .transformationStore
      .put("transformation_runs", transformationRun);

    const warehouseHandoff = {
      warehouseHandoffId:
        runtime.createId("bi_warehouse_handoff"),
      targetBlock: "BI-08",
      transformationRunId:
        transformationRun.transformationRunId,
      datasetContractId:
        transformationRun.datasetContractId,
      correlationId:
        transformationRun.correlationId,
      records:
        transformedRecords.map(record => ({
          transformedRecordId:
            record.transformedRecordId,
          record:
            runtime.clone(record.record),
          lineage:
            runtime.clone(record.lineage)
        })),
      failedRecords:
        failedRecords.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .transformationStore
      .put("warehouse_handoffs", warehouseHandoff);

    await runtime.emit(
      "bi.data_transformation.completed",
      {
        transformationRun,
        warehouseHandoffId:
          warehouseHandoff.warehouseHandoffId
      }
    );

    return runtime.success({
      transformationRun,
      warehouseHandoff,
      failedRecords
    });
  }

  const api = Object.freeze({
    registerRule,
    execute,
    getTransformationRun: ({ transformationRunId }) =>
      global.INFINICUS.BI
        .transformationStore
        .get("transformation_runs", transformationRunId),
    getWarehouseHandoff: ({ warehouseHandoffId }) =>
      global.INFINICUS.BI
        .transformationStore
        .get("warehouse_handoffs", warehouseHandoffId),
    listTransformedRecords: () =>
      global.INFINICUS.BI
        .transformationStore
        .list("transformed_records")
  });

  runtime.registerService(
    "bi.data_transformation",
    api,
    { block: "BI-07" }
  );

  runtime.registerRoute(
    "bi.transformation_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.data_transformation.execute",
    execute
  );

  global.INFINICUS.BI.dataTransformationEngine = api;
})(window);

/* ===== INFINICUS-BI-08-Business-Data-Warehouse-Analytical-Storage-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-08-Business-Data-Warehouse-Analytical-Storage-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-08.");
  }

  if (!BI?.dataTransformationEngine) {
    throw new Error("INFINICUS BI-07 must be loaded before BI-08.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-08-Business-Data-Warehouse-Analytical-Storage-Engine/src/model/warehouse-dataset.js --- */
(function (global) {
  "use strict";

  const DATASET_TYPES = Object.freeze([
    "fact",
    "dimension",
    "aggregate",
    "snapshot"
  ]);

  const LOAD_MODES = Object.freeze([
    "append",
    "replace",
    "upsert"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const datasetType = String(input.datasetType || "");
    const loadMode = String(input.loadMode || "append");

    if (
      !input.name ||
      !input.datasetContractId ||
      !DATASET_TYPES.includes(datasetType) ||
      !LOAD_MODES.includes(loadMode)
    ) {
      return runtime.failure(
        "WAREHOUSE_DATASET_INVALID",
        "name, datasetContractId, datasetType, and loadMode are required."
      );
    }

    if (!input.grain) {
      return runtime.failure(
        "WAREHOUSE_GRAIN_REQUIRED",
        "Every warehouse dataset requires a declared grain."
      );
    }

    return runtime.success({
      warehouseDatasetId:
        input.warehouseDatasetId ||
        runtime.createId("bi_warehouse_dataset"),
      name:
        String(input.name),
      datasetContractId:
        String(input.datasetContractId),
      datasetType,
      grain:
        String(input.grain),
      primaryKeyFields:
        Array.isArray(input.primaryKeyFields)
          ? input.primaryKeyFields.map(String)
          : [],
      partitionFields:
        Array.isArray(input.partitionFields)
          ? input.partitionFields.map(String)
          : [],
      loadMode,
      slowlyChangingDimensionType:
        input.slowlyChangingDimensionType || null,
      version:
        Number(input.version || 1),
      status:
        String(input.status || "active"),
      metadata:
        runtime.clone(input.metadata || {}),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.warehouseDatasetModel =
    Object.freeze({
      DATASET_TYPES,
      LOAD_MODES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-08-Business-Data-Warehouse-Analytical-Storage-Engine/src/warehouse/grain-validator.js --- */
(function (global) {
  "use strict";

  function buildKey(record, fields = []) {
    return fields
      .map(field => String(record[field] ?? ""))
      .join("|");
  }

  function validate(records = [], keyFields = []) {
    if (!keyFields.length) {
      return {
        valid: true,
        duplicateKeys: []
      };
    }

    const seen = new Set();
    const duplicates = new Set();

    for (const record of records) {
      const key = buildKey(record, keyFields);

      if (seen.has(key)) {
        duplicates.add(key);
      } else {
        seen.add(key);
      }
    }

    return {
      valid: duplicates.size === 0,
      duplicateKeys: [...duplicates]
    };
  }

  global.INFINICUS.BI.warehouseGrainValidator =
    Object.freeze({
      buildKey,
      validate
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-08-Business-Data-Warehouse-Analytical-Storage-Engine/src/warehouse/load-planner.js --- */
(function (global) {
  "use strict";

  function partitionKey(record, fields = []) {
    if (!fields.length) return "__unpartitioned__";

    return fields
      .map(field => String(record[field] ?? "unknown"))
      .join("|");
  }

  function plan({
    dataset,
    records = []
  }) {
    const partitions = new Map();

    for (const record of records) {
      const key =
        partitionKey(
          record,
          dataset.partitionFields
        );

      if (!partitions.has(key)) {
        partitions.set(key, []);
      }

      partitions.get(key).push(record);
    }

    return {
      loadMode:
        dataset.loadMode,
      partitions:
        [...partitions.entries()]
          .map(([key, rows]) => ({
            partitionKey: key,
            rows
          }))
    };
  }

  global.INFINICUS.BI.warehouseLoadPlanner =
    Object.freeze({
      partitionKey,
      plan
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-08-Business-Data-Warehouse-Analytical-Storage-Engine/src/storage/warehouse-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_WAREHOUSE";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["datasets", "warehouseDatasetId"],
          ["loads", "warehouseLoadId"],
          ["rows", "warehouseRowId"],
          ["snapshots", "warehouseSnapshotId"],
          ["metric_handoffs", "metricHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "rows") {
              store.createIndex(
                "warehouseDatasetId",
                "warehouseDatasetId",
                { unique: false }
              );
            }
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse storage failed."
      );
    }
  }

  async function clearRowsByDataset(warehouseDatasetId) {
    const db = await open();
    const tx = db.transaction("rows", "readwrite");
    const store = tx.objectStore("rows");
    const index = store.index("warehouseDatasetId");
    const keys = await request(
      index.getAllKeys(warehouseDatasetId)
    );

    for (const key of keys) {
      await request(store.delete(key));
    }

    return runtime.success({
      warehouseDatasetId,
      removed: keys.length
    });
  }

  async function rowsByDataset(warehouseDatasetId) {
    try {
      const db = await open();
      const tx = db.transaction("rows", "readonly");
      const rows = await request(
        tx.objectStore("rows")
          .index("warehouseDatasetId")
          .getAll(warehouseDatasetId)
      );

      return runtime.success(rows.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse row query failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "WAREHOUSE_RECORD_NOT_FOUND",
            "Warehouse record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "WAREHOUSE_STORAGE_ERROR",
        error?.message || "Warehouse listing failed."
      );
    }
  }

  global.INFINICUS.BI.warehouseStore =
    Object.freeze({
      open,
      put,
      get,
      list,
      clearRowsByDataset,
      rowsByDataset
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-08-Business-Data-Warehouse-Analytical-Storage-Engine/src/engine/data-warehouse-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerDataset(input = {}) {
    const built =
      global.INFINICUS.BI
        .warehouseDatasetModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .warehouseStore
        .put("datasets", built.data);

    if (stored.ok) {
      runtime.registerDataset(
        built.data.warehouseDatasetId,
        built.data,
        {
          datasetType:
            built.data.datasetType,
          grain:
            built.data.grain
        }
      );

      await runtime.emit(
        "bi.warehouse_dataset.registered",
        stored.data
      );
    }

    return stored;
  }

  async function load({
    warehouseDatasetId,
    warehouseHandoffId
  } = {}) {
    const dataset =
      await global.INFINICUS.BI
        .warehouseStore
        .get("datasets", warehouseDatasetId);

    if (!dataset.ok) return dataset;

    const handoff =
      await global.INFINICUS.BI
        .dataTransformationEngine
        .getWarehouseHandoff({
          warehouseHandoffId
        });

    if (!handoff.ok) return handoff;

    if (
      dataset.data.datasetContractId !==
      handoff.data.datasetContractId
    ) {
      return runtime.failure(
        "WAREHOUSE_CONTRACT_MISMATCH",
        "Warehouse dataset and handoff use different dataset contracts."
      );
    }

    const rawRecords =
      handoff.data.records.map(item => item.record);

    const grain =
      global.INFINICUS.BI
        .warehouseGrainValidator
        .validate(
          rawRecords,
          dataset.data.primaryKeyFields
        );

    if (!grain.valid) {
      return runtime.failure(
        "WAREHOUSE_GRAIN_VIOLATION",
        "Duplicate grain keys were detected.",
        grain
      );
    }

    if (dataset.data.loadMode === "replace") {
      await global.INFINICUS.BI
        .warehouseStore
        .clearRowsByDataset(warehouseDatasetId);
    }

    const existing =
      await global.INFINICUS.BI
        .warehouseStore
        .rowsByDataset(warehouseDatasetId);

    if (!existing.ok) return existing;

    const existingByKey = new Map();

    for (const row of existing.data) {
      const key =
        global.INFINICUS.BI
          .warehouseGrainValidator
          .buildKey(
            row.record,
            dataset.data.primaryKeyFields
          );

      existingByKey.set(key, row);
    }

    const plan =
      global.INFINICUS.BI
        .warehouseLoadPlanner
        .plan({
          dataset: dataset.data,
          records: rawRecords
        });

    let inserted = 0;
    let updated = 0;

    for (const partition of plan.partitions) {
      for (const record of partition.rows) {
        const key =
          global.INFINICUS.BI
            .warehouseGrainValidator
            .buildKey(
              record,
              dataset.data.primaryKeyFields
            );

        const existingRow =
          existingByKey.get(key);

        const row = {
          warehouseRowId:
            existingRow?.warehouseRowId ||
            runtime.createId("bi_warehouse_row"),
          warehouseDatasetId,
          warehouseLoadId: null,
          partitionKey:
            partition.partitionKey,
          grainKey: key,
          record:
            runtime.clone(record),
          version:
            Number(existingRow?.version || 0) + 1,
          loadedAt:
            new Date().toISOString()
        };

        if (
          dataset.data.loadMode === "append" &&
          existingRow
        ) {
          continue;
        }

        if (
          dataset.data.loadMode === "upsert" &&
          existingRow
        ) {
          updated += 1;
        } else {
          inserted += 1;
        }

        await global.INFINICUS.BI
          .warehouseStore
          .put("rows", row);
      }
    }

    const loadRecord = {
      warehouseLoadId:
        runtime.createId("bi_warehouse_load"),
      warehouseDatasetId,
      warehouseHandoffId,
      transformationRunId:
        handoff.data.transformationRunId,
      datasetContractId:
        handoff.data.datasetContractId,
      correlationId:
        handoff.data.correlationId,
      loadMode:
        dataset.data.loadMode,
      partitions:
        plan.partitions.map(partition => ({
          partitionKey:
            partition.partitionKey,
          rowCount:
            partition.rows.length
        })),
      counts: {
        received:
          rawRecords.length,
        inserted,
        updated,
        skipped:
          rawRecords.length - inserted - updated
      },
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .warehouseStore
      .put("loads", loadRecord);

    const rows =
      await global.INFINICUS.BI
        .warehouseStore
        .rowsByDataset(warehouseDatasetId);

    const snapshot = {
      warehouseSnapshotId:
        runtime.createId("bi_warehouse_snapshot"),
      warehouseDatasetId,
      warehouseLoadId:
        loadRecord.warehouseLoadId,
      rowCount:
        rows.ok ? rows.data.length : 0,
      version:
        dataset.data.version,
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .warehouseStore
      .put("snapshots", snapshot);

    const metricHandoff = {
      metricHandoffId:
        runtime.createId("bi_metric_handoff"),
      targetBlock: "BI-09",
      warehouseDatasetId,
      warehouseLoadId:
        loadRecord.warehouseLoadId,
      warehouseSnapshotId:
        snapshot.warehouseSnapshotId,
      datasetContractId:
        loadRecord.datasetContractId,
      datasetType:
        dataset.data.datasetType,
      grain:
        dataset.data.grain,
      primaryKeyFields:
        [...dataset.data.primaryKeyFields],
      partitionFields:
        [...dataset.data.partitionFields],
      rowCount:
        snapshot.rowCount,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .warehouseStore
      .put("metric_handoffs", metricHandoff);

    await runtime.emit(
      "bi.warehouse_load.completed",
      {
        loadRecord,
        metricHandoffId:
          metricHandoff.metricHandoffId
      }
    );

    return runtime.success({
      loadRecord,
      snapshot,
      metricHandoff
    });
  }

  async function query({
    warehouseDatasetId,
    filter = {},
    limit = 100
  } = {}) {
    const rows =
      await global.INFINICUS.BI
        .warehouseStore
        .rowsByDataset(warehouseDatasetId);

    if (!rows.ok) return rows;

    const filtered =
      rows.data
        .filter(row =>
          Object.entries(filter).every(
            ([field, value]) =>
              row.record[field] === value
          )
        )
        .slice(0, Math.max(1, Number(limit || 100)));

    return runtime.success(filtered);
  }

  const api = Object.freeze({
    registerDataset,
    load,
    query,
    getDataset: ({ warehouseDatasetId }) =>
      global.INFINICUS.BI
        .warehouseStore
        .get("datasets", warehouseDatasetId),
    getLoad: ({ warehouseLoadId }) =>
      global.INFINICUS.BI
        .warehouseStore
        .get("loads", warehouseLoadId),
    getMetricHandoff: ({ metricHandoffId }) =>
      global.INFINICUS.BI
        .warehouseStore
        .get("metric_handoffs", metricHandoffId),
    listSnapshots: () =>
      global.INFINICUS.BI
        .warehouseStore
        .list("snapshots")
  });

  runtime.registerService(
    "bi.data_warehouse",
    api,
    { block: "BI-08" }
  );

  runtime.registerRoute(
    "bi.warehouse_dataset.register",
    registerDataset
  );

  runtime.registerRoute(
    "bi.warehouse.load",
    load
  );

  runtime.registerRoute(
    "bi.warehouse.query",
    query
  );

  global.INFINICUS.BI.dataWarehouseEngine = api;
})(window);

/* ===== INFINICUS-BI-09-Business-Metric-KPI-Registry-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-09-Business-Metric-KPI-Registry-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-09.");
  }

  if (!BI?.dataWarehouseEngine) {
    throw new Error("INFINICUS BI-08 must be loaded before BI-09.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-09-Business-Metric-KPI-Registry-Engine/src/model/metric-definition.js --- */
(function (global) {
  "use strict";

  const METRIC_TYPES = Object.freeze([
    "base",
    "derived",
    "ratio",
    "rate",
    "target"
  ]);

  const AGGREGATIONS = Object.freeze([
    "sum",
    "count",
    "count_distinct",
    "average",
    "minimum",
    "maximum",
    "median",
    "first",
    "last"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const metricType = String(input.metricType || "");
    const aggregation = String(input.aggregation || "");

    if (
      !input.name ||
      !input.code ||
      !input.warehouseDatasetId ||
      !METRIC_TYPES.includes(metricType)
    ) {
      return runtime.failure(
        "METRIC_DEFINITION_INVALID",
        "name, code, warehouseDatasetId, and a supported metricType are required."
      );
    }

    if (
      metricType === "base" &&
      !AGGREGATIONS.includes(aggregation)
    ) {
      return runtime.failure(
        "METRIC_AGGREGATION_INVALID",
        "Base metrics require a supported aggregation."
      );
    }

    return runtime.success({
      metricId:
        input.metricId ||
        runtime.createId("bi_metric"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      description:
        String(input.description || ""),
      metricType,
      warehouseDatasetId:
        String(input.warehouseDatasetId),
      sourceField:
        input.sourceField || null,
      aggregation:
        aggregation || null,
      dependencies:
        Array.isArray(input.dependencies)
          ? [...new Set(input.dependencies.map(String))]
          : [],
      formula:
        runtime.clone(input.formula || null),
      filters:
        runtime.clone(input.filters || []),
      dimensions:
        Array.isArray(input.dimensions)
          ? input.dimensions.map(String)
          : [],
      timeGrain:
        String(input.timeGrain || "all_time"),
      unit:
        String(input.unit || "number"),
      currency:
        input.currency || null,
      target:
        input.target ?? null,
      thresholds:
        runtime.clone(input.thresholds || {}),
      owner:
        String(input.owner || ""),
      governanceStatus:
        String(input.governanceStatus || "draft"),
      version:
        Math.max(1, Number(input.version || 1)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.metricDefinitionModel =
    Object.freeze({
      METRIC_TYPES,
      AGGREGATIONS,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-09-Business-Metric-KPI-Registry-Engine/src/governance/dependency-validator.js --- */
(function (global) {
  "use strict";

  function detectCycle(graph, start) {
    const visited = new Set();
    const stack = new Set();

    function visit(node) {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      stack.add(node);

      for (const dependency of graph.get(node) || []) {
        if (visit(dependency)) return true;
      }

      stack.delete(node);
      return false;
    }

    return visit(start);
  }

  function validate(metrics = [], candidate) {
    const graph = new Map(
      metrics.map(metric => [
        metric.metricId,
        [...(metric.dependencies || [])]
      ])
    );

    graph.set(
      candidate.metricId,
      [...(candidate.dependencies || [])]
    );

    const unknownDependencies =
      (candidate.dependencies || [])
        .filter(dependency =>
          !graph.has(dependency)
        );

    const circular =
      detectCycle(graph, candidate.metricId);

    return {
      valid:
        unknownDependencies.length === 0 &&
        !circular,
      unknownDependencies,
      circular
    };
  }

  global.INFINICUS.BI.metricDependencyValidator =
    Object.freeze({
      detectCycle,
      validate
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-09-Business-Metric-KPI-Registry-Engine/src/governance/metric-lineage.js --- */
(function (global) {
  "use strict";

  function build(metric, warehouseDataset) {
    return {
      metricId:
        metric.metricId,
      metricCode:
        metric.code,
      warehouseDatasetId:
        metric.warehouseDatasetId,
      datasetContractId:
        warehouseDataset.datasetContractId,
      sourceField:
        metric.sourceField,
      dependencies:
        [...metric.dependencies],
      dimensions:
        [...metric.dimensions],
      filters:
        structuredClone(metric.filters),
      version:
        metric.version,
      createdAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.metricLineageBuilder =
    Object.freeze({ build });
})(window);

/* --- business-intelligence/INFINICUS-BI-09-Business-Metric-KPI-Registry-Engine/src/storage/metric-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_METRICS";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["metrics", "metricId"],
          ["lineage", "metricLineageId"],
          ["calculation_handoffs", "calculationHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store =
              db.createObjectStore(name, { keyPath });

            if (name === "metrics") {
              store.createIndex(
                "code",
                "code",
                { unique: true }
              );
            }
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "METRIC_RECORD_NOT_FOUND",
            "Metric record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric retrieval failed."
      );
    }
  }

  async function getByCode(code) {
    try {
      const db = await open();
      const tx = db.transaction("metrics", "readonly");
      const value = await request(
        tx.objectStore("metrics")
          .index("code")
          .get(code)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "METRIC_NOT_FOUND",
            `Metric was not found: ${code}`
          );
    } catch (error) {
      return runtime.failure(
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric lookup failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "METRIC_STORAGE_ERROR",
        error?.message || "Metric listing failed."
      );
    }
  }

  global.INFINICUS.BI.metricStore =
    Object.freeze({
      open,
      put,
      get,
      getByCode,
      list
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-09-Business-Metric-KPI-Registry-Engine/src/engine/metric-registry-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerMetric(input = {}) {
    const dataset =
      await global.INFINICUS.BI
        .dataWarehouseEngine
        .getDataset({
          warehouseDatasetId:
            input.warehouseDatasetId
        });

    if (!dataset.ok) return dataset;

    const built =
      global.INFINICUS.BI
        .metricDefinitionModel
        .create(input);

    if (!built.ok) return built;

    const existing =
      await global.INFINICUS.BI
        .metricStore
        .list("metrics");

    if (!existing.ok) return existing;

    const validation =
      global.INFINICUS.BI
        .metricDependencyValidator
        .validate(existing.data, built.data);

    if (!validation.valid) {
      return runtime.failure(
        "METRIC_DEPENDENCY_INVALID",
        "Metric dependencies are invalid.",
        validation
      );
    }

    const duplicate =
      existing.data.find(metric =>
        metric.code === built.data.code
      );

    if (duplicate) {
      return runtime.failure(
        "METRIC_CODE_DUPLICATE",
        `Metric code already exists: ${built.data.code}`
      );
    }

    const stored =
      await global.INFINICUS.BI
        .metricStore
        .put("metrics", built.data);

    if (!stored.ok) return stored;

    const lineage = {
      metricLineageId:
        runtime.createId("bi_metric_lineage"),
      ...global.INFINICUS.BI
        .metricLineageBuilder
        .build(built.data, dataset.data)
    };

    await global.INFINICUS.BI
      .metricStore
      .put("lineage", lineage);

    runtime.registerMetric(
      built.data.code,
      built.data,
      {
        metricId:
          built.data.metricId,
        metricType:
          built.data.metricType,
        unit:
          built.data.unit
      }
    );

    await runtime.emit(
      "bi.metric.registered",
      {
        metric:
          built.data,
        lineage
      }
    );

    return runtime.success({
      metric:
        built.data,
      lineage
    });
  }

  async function publishCalculationHandoff({
    metricIds = [],
    warehouseSnapshotId = null,
    correlationId = null
  } = {}) {
    const all =
      await global.INFINICUS.BI
        .metricStore
        .list("metrics");

    if (!all.ok) return all;

    const selected =
      metricIds.length
        ? all.data.filter(metric =>
            metricIds.includes(metric.metricId)
          )
        : all.data.filter(metric =>
            metric.status === "active" &&
            metric.governanceStatus === "approved"
          );

    if (!selected.length) {
      return runtime.failure(
        "NO_METRICS_SELECTED",
        "No approved active metrics were selected."
      );
    }

    const handoff = {
      calculationHandoffId:
        runtime.createId("bi_calculation_handoff"),
      targetBlock: "BI-10",
      warehouseSnapshotId,
      correlationId:
        correlationId ||
        runtime.createId("correlation"),
      metrics:
        selected.map(runtime.clone),
      metricVersions:
        selected.map(metric => ({
          metricId:
            metric.metricId,
          version:
            metric.version
        })),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    const stored =
      await global.INFINICUS.BI
        .metricStore
        .put(
          "calculation_handoffs",
          handoff
        );

    if (stored.ok) {
      await runtime.emit(
        "bi.metric_calculation_handoff.published",
        stored.data
      );
    }

    return stored;
  }

  const api = Object.freeze({
    registerMetric,
    publishCalculationHandoff,
    getMetric: ({ metricId }) =>
      global.INFINICUS.BI
        .metricStore
        .get("metrics", metricId),
    getMetricByCode: ({ code }) =>
      global.INFINICUS.BI
        .metricStore
        .getByCode(code),
    getCalculationHandoff: ({ calculationHandoffId }) =>
      global.INFINICUS.BI
        .metricStore
        .get(
          "calculation_handoffs",
          calculationHandoffId
        ),
    listMetrics: () =>
      global.INFINICUS.BI
        .metricStore
        .list("metrics")
  });

  runtime.registerService(
    "bi.metric_registry",
    api,
    { block: "BI-09" }
  );

  runtime.registerRoute(
    "bi.metric.register",
    registerMetric
  );

  runtime.registerRoute(
    "bi.metric_calculation_handoff.publish",
    publishCalculationHandoff
  );

  global.INFINICUS.BI.metricRegistryEngine = api;
})(window);

/* ===== INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-10.");
  }

  if (!BI?.dataWarehouseEngine) {
    throw new Error("INFINICUS BI-08 must be loaded before BI-10.");
  }

  if (!BI?.metricRegistryEngine) {
    throw new Error("INFINICUS BI-09 must be loaded before BI-10.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/calculation/aggregation-engine.js --- */
(function (global) {
  "use strict";

  function median(values) {
    const sorted =
      [...values].sort((a, b) => a - b);

    if (!sorted.length) return null;

    const middle =
      Math.floor(sorted.length / 2);

    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function aggregate(records, metric) {
    const field =
      metric.sourceField;

    const values =
      records
        .map(record => field ? record[field] : 1)
        .filter(value => value != null);

    switch (metric.aggregation) {
      case "sum":
        return values.reduce(
          (sum, value) => sum + Number(value || 0),
          0
        );

      case "count":
        return records.length;

      case "count_distinct":
        return new Set(values).size;

      case "average": {
        const numeric =
          values
            .map(Number)
            .filter(Number.isFinite);

        return numeric.length
          ? numeric.reduce((a, b) => a + b, 0) /
            numeric.length
          : null;
      }

      case "minimum":
        return values.length
          ? Math.min(...values.map(Number))
          : null;

      case "maximum":
        return values.length
          ? Math.max(...values.map(Number))
          : null;

      case "median":
        return median(
          values
            .map(Number)
            .filter(Number.isFinite)
        );

      case "first":
        return values[0] ?? null;

      case "last":
        return values.at(-1) ?? null;

      default:
        throw new Error(
          `Unsupported aggregation: ${metric.aggregation}`
        );
    }
  }

  global.INFINICUS.BI.metricAggregationEngine =
    Object.freeze({
      median,
      aggregate
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/calculation/filter-engine.js --- */
(function (global) {
  "use strict";

  function evaluate(record, filter) {
    const value = record[filter.field];

    switch (filter.operator) {
      case "eq":
        return value === filter.value;

      case "neq":
        return value !== filter.value;

      case "gt":
        return value > filter.value;

      case "gte":
        return value >= filter.value;

      case "lt":
        return value < filter.value;

      case "lte":
        return value <= filter.value;

      case "in":
        return (filter.value || []).includes(value);

      case "not_in":
        return !(filter.value || []).includes(value);

      case "contains":
        return String(value || "")
          .includes(String(filter.value || ""));

      default:
        return true;
    }
  }

  function apply(records, filters = []) {
    return records.filter(record =>
      filters.every(filter =>
        evaluate(record, filter)
      )
    );
  }

  global.INFINICUS.BI.metricFilterEngine =
    Object.freeze({
      evaluate,
      apply
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/calculation/grouping-engine.js --- */
(function (global) {
  "use strict";

  function timeBucket(value, grain) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "unknown";
    }

    const year =
      date.getUTCFullYear();

    const month =
      String(date.getUTCMonth() + 1)
        .padStart(2, "0");

    const day =
      String(date.getUTCDate())
        .padStart(2, "0");

    if (grain === "year") return `${year}`;
    if (grain === "month") return `${year}-${month}`;
    if (grain === "day") return `${year}-${month}-${day}`;

    return "all_time";
  }

  function group(records, metric) {
    const groups = new Map();

    for (const record of records) {
      const parts = [];

      for (const dimension of metric.dimensions || []) {
        parts.push(
          `${dimension}:${record[dimension] ?? "unknown"}`
        );
      }

      if (
        metric.timeGrain &&
        metric.timeGrain !== "all_time"
      ) {
        const timeField =
          metric.formula?.timeField ||
          "date";

        parts.push(
          `time:${timeBucket(
            record[timeField],
            metric.timeGrain
          )}`
        );
      }

      const key =
        parts.length
          ? parts.join("|")
          : "__all__";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(record);
    }

    return groups;
  }

  global.INFINICUS.BI.metricGroupingEngine =
    Object.freeze({
      timeBucket,
      group
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/calculation/dependency-order.js --- */
(function (global) {
  "use strict";

  function resolve(metrics = []) {
    const byId =
      new Map(
        metrics.map(metric => [metric.metricId, metric])
      );

    const visited = new Set();
    const temporary = new Set();
    const order = [];

    function visit(metricId) {
      if (visited.has(metricId)) return;

      if (temporary.has(metricId)) {
        throw new Error(
          `Circular metric dependency detected: ${metricId}`
        );
      }

      temporary.add(metricId);

      const metric = byId.get(metricId);

      if (!metric) {
        throw new Error(
          `Unknown metric dependency: ${metricId}`
        );
      }

      for (const dependency of metric.dependencies || []) {
        visit(dependency);
      }

      temporary.delete(metricId);
      visited.add(metricId);
      order.push(metric);
    }

    for (const metric of metrics) {
      visit(metric.metricId);
    }

    return order;
  }

  global.INFINICUS.BI.metricDependencyOrder =
    Object.freeze({ resolve });
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/calculation/derived-metric-engine.js --- */
(function (global) {
  "use strict";

  function calculate(metric, resultsByMetricId, groupKey) {
    const values =
      (metric.dependencies || []).map(metricId =>
        resultsByMetricId
          .get(metricId)
          ?.get(groupKey)
          ?.value
      );

    const operator =
      metric.formula?.operator;

    if (metric.metricType === "ratio") {
      return values[1]
        ? values[0] / values[1]
        : null;
    }

    if (metric.metricType === "rate") {
      return values[1]
        ? values[0] / values[1] * 100
        : null;
    }

    if (metric.metricType === "target") {
      return metric.target;
    }

    switch (operator) {
      case "add":
        return values.reduce((a, b) => Number(a || 0) + Number(b || 0), 0);

      case "subtract":
        return values.slice(1).reduce(
          (a, b) => Number(a || 0) - Number(b || 0),
          Number(values[0] || 0)
        );

      case "multiply":
        return values.reduce(
          (a, b) => Number(a || 0) * Number(b || 0),
          1
        );

      case "divide":
        return values[1]
          ? Number(values[0] || 0) /
            Number(values[1])
          : null;

      default:
        throw new Error(
          `Unsupported derived metric operator: ${operator}`
        );
    }
  }

  global.INFINICUS.BI.derivedMetricEngine =
    Object.freeze({ calculate });
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/scoring/threshold-evaluator.js --- */
(function (global) {
  "use strict";

  function evaluate(value, metric) {
    const thresholds =
      metric.thresholds || {};

    if (value == null) {
      return {
        status: "no_data",
        targetMet: false
      };
    }

    let status = "normal";

    if (
      thresholds.criticalBelow != null &&
      value < thresholds.criticalBelow
    ) {
      status = "critical";
    } else if (
      thresholds.warningBelow != null &&
      value < thresholds.warningBelow
    ) {
      status = "warning";
    } else if (
      thresholds.criticalAbove != null &&
      value > thresholds.criticalAbove
    ) {
      status = "critical";
    } else if (
      thresholds.warningAbove != null &&
      value > thresholds.warningAbove
    ) {
      status = "warning";
    } else if (
      thresholds.goodAbove != null &&
      value >= thresholds.goodAbove
    ) {
      status = "good";
    }

    const targetMet =
      metric.target == null
        ? null
        : thresholds.targetDirection === "below"
          ? value <= metric.target
          : value >= metric.target;

    return {
      status,
      targetMet
    };
  }

  global.INFINICUS.BI.metricThresholdEvaluator =
    Object.freeze({ evaluate });
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/storage/calculation-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_METRIC_CALCULATIONS";
  let dbPromise;

  const request = req =>
    new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["calculation_runs", "calculationRunId"],
          ["metric_results", "metricResultId"],
          ["intelligence_handoffs", "intelligenceHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");

      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "CALCULATION_STORAGE_ERROR",
        error?.message || "Calculation storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "CALCULATION_RECORD_NOT_FOUND",
            "Calculation record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "CALCULATION_STORAGE_ERROR",
        error?.message || "Calculation retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "CALCULATION_STORAGE_ERROR",
        error?.message || "Calculation listing failed."
      );
    }
  }

  global.INFINICUS.BI.calculationStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-10-Metric-Calculation-Aggregation-Engine/src/engine/metric-calculation-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function execute({
    calculationHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricRegistryEngine
        .getCalculationHandoff({
          calculationHandoffId
        });

    if (!handoff.ok) return handoff;

    let ordered;

    try {
      ordered =
        global.INFINICUS.BI
          .metricDependencyOrder
          .resolve(handoff.data.metrics);
    } catch (error) {
      return runtime.failure(
        "METRIC_DEPENDENCY_ORDER_FAILED",
        error?.message || "Metric dependency ordering failed."
      );
    }

    const resultsByMetricId = new Map();
    const allResults = [];

    for (const metric of ordered) {
      const datasetRows =
        await global.INFINICUS.BI
          .dataWarehouseEngine
          .query({
            warehouseDatasetId:
              metric.warehouseDatasetId,
            filter: {},
            limit: 100000
          });

      if (!datasetRows.ok) return datasetRows;

      const records =
        datasetRows.data.map(row => row.record);

      const filtered =
        global.INFINICUS.BI
          .metricFilterEngine
          .apply(records, metric.filters);

      const groups =
        global.INFINICUS.BI
          .metricGroupingEngine
          .group(filtered, metric);

      const metricResults = new Map();

      if (
        metric.metricType === "base"
      ) {
        for (const [groupKey, groupRecords] of groups.entries()) {
          const value =
            global.INFINICUS.BI
              .metricAggregationEngine
              .aggregate(groupRecords, metric);

          const threshold =
            global.INFINICUS.BI
              .metricThresholdEvaluator
              .evaluate(value, metric);

          const result = {
            metricResultId:
              runtime.createId("bi_metric_result"),
            calculationHandoffId,
            metricId:
              metric.metricId,
            metricCode:
              metric.code,
            metricVersion:
              metric.version,
            groupKey,
            value,
            unit:
              metric.unit,
            currency:
              metric.currency,
            target:
              metric.target,
            threshold,
            sourceRowCount:
              groupRecords.length,
            calculatedAt:
              new Date().toISOString()
          };

          metricResults.set(groupKey, result);
          allResults.push(result);

          await global.INFINICUS.BI
            .calculationStore
            .put("metric_results", result);
        }
      } else {
        const dependencyGroupKeys =
          new Set(
            (metric.dependencies || [])
              .flatMap(metricId =>
                [...(resultsByMetricId.get(metricId)?.keys() || [])]
              )
          );

        if (!dependencyGroupKeys.size) {
          dependencyGroupKeys.add("__all__");
        }

        for (const groupKey of dependencyGroupKeys) {
          let value;

          try {
            value =
              global.INFINICUS.BI
                .derivedMetricEngine
                .calculate(
                  metric,
                  resultsByMetricId,
                  groupKey
                );
          } catch (error) {
            return runtime.failure(
              "DERIVED_METRIC_FAILED",
              error?.message || "Derived metric calculation failed.",
              {
                metricId:
                  metric.metricId,
                groupKey
              }
            );
          }

          const threshold =
            global.INFINICUS.BI
              .metricThresholdEvaluator
              .evaluate(value, metric);

          const result = {
            metricResultId:
              runtime.createId("bi_metric_result"),
            calculationHandoffId,
            metricId:
              metric.metricId,
            metricCode:
              metric.code,
            metricVersion:
              metric.version,
            groupKey,
            value,
            unit:
              metric.unit,
            currency:
              metric.currency,
            target:
              metric.target,
            threshold,
            sourceRowCount:
              null,
            calculatedAt:
              new Date().toISOString()
          };

          metricResults.set(groupKey, result);
          allResults.push(result);

          await global.INFINICUS.BI
            .calculationStore
            .put("metric_results", result);
        }
      }

      resultsByMetricId.set(
        metric.metricId,
        metricResults
      );
    }

    const calculationRun = {
      calculationRunId:
        runtime.createId("bi_calculation_run"),
      calculationHandoffId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      metricCount:
        ordered.length,
      resultCount:
        allResults.length,
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .calculationStore
      .put("calculation_runs", calculationRun);

    const intelligenceHandoff = {
      intelligenceHandoffId:
        runtime.createId("bi_intelligence_handoff"),
      targetBlocks: [
        "BI-11",
        "BI-12",
        "BI-13",
        "BI-14",
        "BI-15",
        "BI-16",
        "BI-17",
        "BI-18"
      ],
      calculationRunId:
        calculationRun.calculationRunId,
      warehouseSnapshotId:
        calculationRun.warehouseSnapshotId,
      correlationId:
        calculationRun.correlationId,
      metricResults:
        allResults.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .calculationStore
      .put(
        "intelligence_handoffs",
        intelligenceHandoff
      );

    await runtime.emit(
      "bi.metric_calculation.completed",
      {
        calculationRun,
        intelligenceHandoffId:
          intelligenceHandoff.intelligenceHandoffId
      }
    );

    return runtime.success({
      calculationRun,
      intelligenceHandoff,
      metricResults:
        allResults
    });
  }

  const api = Object.freeze({
    execute,
    getCalculationRun: ({ calculationRunId }) =>
      global.INFINICUS.BI
        .calculationStore
        .get("calculation_runs", calculationRunId),
    getIntelligenceHandoff: ({ intelligenceHandoffId }) =>
      global.INFINICUS.BI
        .calculationStore
        .get(
          "intelligence_handoffs",
          intelligenceHandoffId
        ),
    listMetricResults: () =>
      global.INFINICUS.BI
        .calculationStore
        .list("metric_results")
  });

  runtime.registerService(
    "bi.metric_calculation",
    api,
    { block: "BI-10" }
  );

  runtime.registerRoute(
    "bi.metric_calculation.execute",
    execute
  );

  global.INFINICUS.BI.metricCalculationEngine = api;
})(window);

/* ===== INFINICUS-BI-11-Financial-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-11-Financial-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";
  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-11.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-11.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-11-Financial-Intelligence-Engine/src/model/financial-profile.js --- */
(function (global) {
  "use strict";

  const CATEGORIES = Object.freeze({
    revenue: ["revenue", "sales", "income"],
    cost: ["cost", "expense", "cogs", "opex"],
    profit: ["profit", "ebit", "ebitda", "net_income"],
    margin: ["margin"],
    cash: ["cash", "cash_flow"],
    liquidity: ["liquidity", "current_ratio", "quick_ratio"],
    burn: ["burn"],
    runway: ["runway"],
    budget: ["budget", "variance"]
  });

  function classify(metricCode = "") {
    const code = String(metricCode).toLowerCase();

    for (const [category, tokens] of Object.entries(CATEGORIES)) {
      if (tokens.some(token => code.includes(token))) {
        return category;
      }
    }

    return "other";
  }

  global.INFINICUS.BI.financialMetricClassifier =
    Object.freeze({ CATEGORIES, classify });
})(window);

/* --- business-intelligence/INFINICUS-BI-11-Financial-Intelligence-Engine/src/analysis/financial-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(input = {}) {
    const profitability =
      input.netProfitMargin == null
        ? 50
        : clamp(50 + input.netProfitMargin * 2);

    const liquidity =
      input.currentRatio == null
        ? 50
        : clamp(input.currentRatio * 40);

    const runway =
      input.runwayMonths == null
        ? 50
        : clamp(input.runwayMonths / 12 * 100);

    const cashFlow =
      input.operatingCashFlow == null
        ? 50
        : input.operatingCashFlow >= 0 ? 80 : 20;

    const budgetControl =
      input.budgetVariancePercent == null
        ? 50
        : clamp(100 - Math.abs(input.budgetVariancePercent) * 2);

    const total =
      profitability * 0.3 +
      liquidity * 0.2 +
      runway * 0.2 +
      cashFlow * 0.2 +
      budgetControl * 0.1;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "stable" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        profitability,
        liquidity,
        runway,
        cashFlow,
        budgetControl
      }
    };
  }

  global.INFINICUS.BI.financialHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-11-Financial-Intelligence-Engine/src/analysis/financial-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (profile.netProfitMargin != null && profile.netProfitMargin < 0) {
      add("NEGATIVE_MARGIN", "critical", "Net profit margin is negative.", "netProfitMargin");
    }

    if (profile.grossMargin != null && profile.grossMargin < 20) {
      add("LOW_GROSS_MARGIN", "warning", "Gross margin is below 20%.", "grossMargin");
    }

    if (profile.currentRatio != null && profile.currentRatio < 1) {
      add("LIQUIDITY_PRESSURE", "critical", "Current liabilities exceed current assets.", "currentRatio");
    }

    if (profile.runwayMonths != null && profile.runwayMonths < 3) {
      add("SHORT_RUNWAY", "critical", "Cash runway is below three months.", "runwayMonths");
    }

    if (profile.operatingCashFlow != null && profile.operatingCashFlow < 0) {
      add("NEGATIVE_OPERATING_CASH_FLOW", "warning", "Operating cash flow is negative.", "operatingCashFlow");
    }

    if (
      profile.budgetVariancePercent != null &&
      Math.abs(profile.budgetVariancePercent) > 10
    ) {
      add("BUDGET_VARIANCE", "warning", "Budget variance exceeds 10%.", "budgetVariancePercent");
    }

    return signals;
  }

  global.INFINICUS.BI.financialSignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-11-Financial-Intelligence-Engine/src/storage/financial-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_FINANCIAL_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "financialAnalysisId"],
          ["signals", "financialSignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "FINANCIAL_STORAGE_ERROR",
        error?.message || "Financial intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "FINANCIAL_RECORD_NOT_FOUND",
            "Financial intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "FINANCIAL_STORAGE_ERROR",
        error?.message || "Financial intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "FINANCIAL_STORAGE_ERROR",
        error?.message || "Financial intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.financialStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-11-Financial-Intelligence-Engine/src/engine/financial-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({
    intelligenceHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const byCode =
      latestByCode(handoff.data.metricResults);

    const profile = {
      revenue:
        read(byCode, ["revenue", "total_revenue", "sales_revenue"]),
      grossProfit:
        read(byCode, ["gross_profit"]),
      netProfit:
        read(byCode, ["net_profit", "net_income"]),
      grossMargin:
        read(byCode, ["gross_margin"]),
      netProfitMargin:
        read(byCode, ["net_profit_margin", "net_margin"]),
      operatingCashFlow:
        read(byCode, ["operating_cash_flow"]),
      currentRatio:
        read(byCode, ["current_ratio"]),
      quickRatio:
        read(byCode, ["quick_ratio"]),
      burnRate:
        read(byCode, ["burn_rate", "monthly_burn"]),
      runwayMonths:
        read(byCode, ["runway_months", "cash_runway"]),
      budgetVariancePercent:
        read(byCode, ["budget_variance_percent"])
    };

    const health =
      global.INFINICUS.BI
        .financialHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .financialSignalEngine
        .generate(profile);

    const financialAnalysis = {
      financialAnalysisId:
        runtime.createId("bi_financial_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      summary: {
        revenue:
          profile.revenue,
        profitability:
          profile.netProfitMargin != null
            ? `${profile.netProfitMargin}% net margin`
            : "insufficient data",
        liquidity:
          profile.currentRatio != null
            ? `current ratio ${profile.currentRatio}`
            : "insufficient data",
        runway:
          profile.runwayMonths != null
            ? `${profile.runwayMonths} months`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...byCode.keys()],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .financialStore
      .put("analyses", financialAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        financialSignalId:
          runtime.createId("bi_financial_signal"),
        financialAnalysisId:
          financialAnalysis.financialAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .financialStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-11",
      financialAnalysisId:
        financialAnalysis.financialAnalysisId,
      calculationRunId:
        financialAnalysis.calculationRunId,
      correlationId:
        financialAnalysis.correlationId,
      financialHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .financialStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.financial_intelligence.completed",
      {
        financialAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      financialAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ financialAnalysisId }) =>
      global.INFINICUS.BI.financialStore.get(
        "analyses",
        financialAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.financialStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.financialStore.list("signals")
  });

  runtime.registerService(
    "bi.financial_intelligence",
    api,
    { block: "BI-11" }
  );

  runtime.registerRoute(
    "bi.financial_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.financialIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-12-Sales-Revenue-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-12-Sales-Revenue-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-12.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-12.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-12-Sales-Revenue-Intelligence-Engine/src/analysis/sales-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const growth =
      profile.revenueGrowthPercent == null
        ? 50
        : clamp(50 + profile.revenueGrowthPercent * 2);

    const conversion =
      profile.conversionRatePercent == null
        ? 50
        : clamp(profile.conversionRatePercent * 4);

    const winRate =
      profile.winRatePercent == null
        ? 50
        : clamp(profile.winRatePercent * 2);

    const pipeline =
      profile.pipelineCoverage == null
        ? 50
        : clamp(profile.pipelineCoverage / 3 * 100);

    const concentration =
      profile.topCustomerRevenueSharePercent == null
        ? 70
        : clamp(100 - profile.topCustomerRevenueSharePercent);

    const total =
      growth * 0.3 +
      conversion * 0.2 +
      winRate * 0.2 +
      pipeline * 0.2 +
      concentration * 0.1;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        growth,
        conversion,
        winRate,
        pipeline,
        concentration
      }
    };
  }

  global.INFINICUS.BI.salesHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-12-Sales-Revenue-Intelligence-Engine/src/analysis/sales-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.revenueGrowthPercent != null &&
      profile.revenueGrowthPercent < 0
    ) {
      add("REVENUE_DECLINE", "critical", "Revenue growth is negative.", "revenueGrowthPercent");
    }

    if (
      profile.conversionRatePercent != null &&
      profile.conversionRatePercent < 10
    ) {
      add("LOW_CONVERSION", "warning", "Sales conversion rate is below 10%.", "conversionRatePercent");
    }

    if (
      profile.pipelineCoverage != null &&
      profile.pipelineCoverage < 2
    ) {
      add("WEAK_PIPELINE", "warning", "Pipeline coverage is below 2× target.", "pipelineCoverage");
    }

    if (
      profile.topCustomerRevenueSharePercent != null &&
      profile.topCustomerRevenueSharePercent > 40
    ) {
      add("REVENUE_CONCENTRATION", "warning", "More than 40% of revenue depends on one customer.", "topCustomerRevenueSharePercent");
    }

    if (
      profile.winRatePercent != null &&
      profile.winRatePercent > 50
    ) {
      add("STRONG_WIN_RATE", "opportunity", "Win rate is above 50%.", "winRatePercent");
    }

    if (
      profile.averageOrderValueGrowthPercent != null &&
      profile.averageOrderValueGrowthPercent > 10
    ) {
      add("ORDER_VALUE_GROWTH", "opportunity", "Average order value is growing strongly.", "averageOrderValueGrowthPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.salesSignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-12-Sales-Revenue-Intelligence-Engine/src/analysis/segment-ranker.js --- */
(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = []) {
    return metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .map((result, index) => ({
        rank: index + 1,
        metricCode: result.metricCode,
        groupKey: result.groupKey,
        value: result.value,
        unit: result.unit
      }));
  }

  global.INFINICUS.BI.salesSegmentRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-12-Sales-Revenue-Intelligence-Engine/src/storage/sales-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_SALES_REVENUE_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "salesAnalysisId"],
          ["signals", "salesSignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "SALES_STORAGE_ERROR",
        error?.message || "Sales intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "SALES_RECORD_NOT_FOUND",
            "Sales intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "SALES_STORAGE_ERROR",
        error?.message || "Sales intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "SALES_STORAGE_ERROR",
        error?.message || "Sales intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.salesStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-12-Sales-Revenue-Intelligence-Engine/src/engine/sales-revenue-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({
    intelligenceHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const results =
      handoff.data.metricResults;

    const byCode =
      latestByCode(results);

    const profile = {
      revenue:
        read(byCode, ["revenue", "total_revenue", "sales_revenue"]),
      revenueGrowthPercent:
        read(byCode, ["revenue_growth_percent", "sales_growth_percent"]),
      conversionRatePercent:
        read(byCode, ["conversion_rate", "sales_conversion_rate"]),
      averageOrderValue:
        read(byCode, ["average_order_value", "aov"]),
      averageOrderValueGrowthPercent:
        read(byCode, ["average_order_value_growth_percent", "aov_growth_percent"]),
      winRatePercent:
        read(byCode, ["win_rate", "sales_win_rate"]),
      pipelineValue:
        read(byCode, ["pipeline_value"]),
      pipelineCoverage:
        read(byCode, ["pipeline_coverage"]),
      salesCycleDays:
        read(byCode, ["sales_cycle_days"]),
      topCustomerRevenueSharePercent:
        read(byCode, ["top_customer_revenue_share_percent"])
    };

    const health =
      global.INFINICUS.BI
        .salesHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .salesSignalEngine
        .generate(profile);

    const productRanking =
      global.INFINICUS.BI
        .salesSegmentRanker
        .rank(results, [
          "revenue_by_product",
          "sales_by_product"
        ]);

    const channelRanking =
      global.INFINICUS.BI
        .salesSegmentRanker
        .rank(results, [
          "revenue_by_channel",
          "sales_by_channel"
        ]);

    const salesAnalysis = {
      salesAnalysisId:
        runtime.createId("bi_sales_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      productRanking:
        productRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      summary: {
        revenue:
          profile.revenue,
        growth:
          profile.revenueGrowthPercent != null
            ? `${profile.revenueGrowthPercent}%`
            : "insufficient data",
        conversion:
          profile.conversionRatePercent != null
            ? `${profile.conversionRatePercent}%`
            : "insufficient data",
        pipelineCoverage:
          profile.pipelineCoverage != null
            ? `${profile.pipelineCoverage}x`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .salesStore
      .put("analyses", salesAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        salesSignalId:
          runtime.createId("bi_sales_signal"),
        salesAnalysisId:
          salesAnalysis.salesAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .salesStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-12",
      salesAnalysisId:
        salesAnalysis.salesAnalysisId,
      calculationRunId:
        salesAnalysis.calculationRunId,
      correlationId:
        salesAnalysis.correlationId,
      salesHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      productRanking:
        productRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .salesStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.sales_revenue_intelligence.completed",
      {
        salesAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      salesAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ salesAnalysisId }) =>
      global.INFINICUS.BI.salesStore.get(
        "analyses",
        salesAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.salesStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.salesStore.list("signals")
  });

  runtime.registerService(
    "bi.sales_revenue_intelligence",
    api,
    { block: "BI-12" }
  );

  runtime.registerRoute(
    "bi.sales_revenue_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.salesRevenueIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-13-Customer-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-13-Customer-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-13.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-13.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-13-Customer-Intelligence-Engine/src/analysis/customer-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const retention =
      profile.retentionRatePercent == null
        ? 50
        : clamp(profile.retentionRatePercent);

    const churn =
      profile.churnRatePercent == null
        ? 50
        : clamp(100 - profile.churnRatePercent * 2);

    const activation =
      profile.activationRatePercent == null
        ? 50
        : clamp(profile.activationRatePercent);

    const satisfaction =
      profile.customerSatisfactionScore == null
        ? 50
        : clamp(profile.customerSatisfactionScore * 20);

    const advocacy =
      profile.netPromoterScore == null
        ? 50
        : clamp((profile.netPromoterScore + 100) / 2);

    const total =
      retention * 0.3 +
      churn * 0.25 +
      activation * 0.15 +
      satisfaction * 0.15 +
      advocacy * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        retention,
        churn,
        activation,
        satisfaction,
        advocacy
      }
    };
  }

  global.INFINICUS.BI.customerHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-13-Customer-Intelligence-Engine/src/analysis/customer-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.churnRatePercent != null &&
      profile.churnRatePercent > 10
    ) {
      add("HIGH_CHURN", "critical", "Customer churn exceeds 10%.", "churnRatePercent");
    }

    if (
      profile.retentionRatePercent != null &&
      profile.retentionRatePercent < 70
    ) {
      add("LOW_RETENTION", "warning", "Customer retention is below 70%.", "retentionRatePercent");
    }

    if (
      profile.activationRatePercent != null &&
      profile.activationRatePercent < 50
    ) {
      add("LOW_ACTIVATION", "warning", "Less than half of acquired customers activate.", "activationRatePercent");
    }

    if (
      profile.netPromoterScore != null &&
      profile.netPromoterScore < 0
    ) {
      add("NEGATIVE_ADVOCACY", "warning", "Net Promoter Score is negative.", "netPromoterScore");
    }

    if (
      profile.customerLifetimeValueGrowthPercent != null &&
      profile.customerLifetimeValueGrowthPercent > 10
    ) {
      add("LTV_GROWTH", "opportunity", "Customer lifetime value is growing strongly.", "customerLifetimeValueGrowthPercent");
    }

    if (
      profile.repeatPurchaseRatePercent != null &&
      profile.repeatPurchaseRatePercent > 50
    ) {
      add("STRONG_REPEAT_PURCHASE", "opportunity", "Repeat purchase rate exceeds 50%.", "repeatPurchaseRatePercent");
    }

    return signals;
  }

  global.INFINICUS.BI.customerSignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-13-Customer-Intelligence-Engine/src/analysis/cohort-ranker.js --- */
(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = []) {
    return metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .map((result, index) => ({
        rank: index + 1,
        metricCode: result.metricCode,
        groupKey: result.groupKey,
        value: result.value,
        unit: result.unit
      }));
  }

  global.INFINICUS.BI.customerCohortRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-13-Customer-Intelligence-Engine/src/storage/customer-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_CUSTOMER_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "customerAnalysisId"],
          ["signals", "customerSignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "CUSTOMER_STORAGE_ERROR",
        error?.message || "Customer intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "CUSTOMER_RECORD_NOT_FOUND",
            "Customer intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "CUSTOMER_STORAGE_ERROR",
        error?.message || "Customer intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "CUSTOMER_STORAGE_ERROR",
        error?.message || "Customer intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.customerStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-13-Customer-Intelligence-Engine/src/engine/customer-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({
    intelligenceHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      acquiredCustomers:
        read(byCode, ["acquired_customers", "new_customers"]),
      activationRatePercent:
        read(byCode, ["activation_rate", "customer_activation_rate"]),
      retentionRatePercent:
        read(byCode, ["retention_rate", "customer_retention_rate"]),
      churnRatePercent:
        read(byCode, ["churn_rate", "customer_churn_rate"]),
      customerLifetimeValue:
        read(byCode, ["customer_lifetime_value", "clv", "ltv"]),
      customerLifetimeValueGrowthPercent:
        read(byCode, ["customer_lifetime_value_growth_percent", "ltv_growth_percent"]),
      repeatPurchaseRatePercent:
        read(byCode, ["repeat_purchase_rate"]),
      purchaseFrequency:
        read(byCode, ["purchase_frequency"]),
      customerSatisfactionScore:
        read(byCode, ["customer_satisfaction_score", "csat"]),
      netPromoterScore:
        read(byCode, ["net_promoter_score", "nps"]),
      topCustomerRevenueSharePercent:
        read(byCode, ["top_customer_revenue_share_percent"])
    };

    const health =
      global.INFINICUS.BI
        .customerHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .customerSignalEngine
        .generate(profile);

    const cohortRanking =
      global.INFINICUS.BI
        .customerCohortRanker
        .rank(results, [
          "retention_rate_by_cohort",
          "customer_lifetime_value_by_cohort",
          "revenue_by_customer_segment"
        ]);

    const customerAnalysis = {
      customerAnalysisId:
        runtime.createId("bi_customer_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      cohortRanking:
        cohortRanking.map(runtime.clone),
      summary: {
        acquisition:
          profile.acquiredCustomers,
        retention:
          profile.retentionRatePercent != null
            ? `${profile.retentionRatePercent}%`
            : "insufficient data",
        churn:
          profile.churnRatePercent != null
            ? `${profile.churnRatePercent}%`
            : "insufficient data",
        lifetimeValue:
          profile.customerLifetimeValue
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .customerStore
      .put("analyses", customerAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        customerSignalId:
          runtime.createId("bi_customer_signal"),
        customerAnalysisId:
          customerAnalysis.customerAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .customerStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-13",
      customerAnalysisId:
        customerAnalysis.customerAnalysisId,
      calculationRunId:
        customerAnalysis.calculationRunId,
      correlationId:
        customerAnalysis.correlationId,
      customerHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      cohortRanking:
        cohortRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .customerStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.customer_intelligence.completed",
      {
        customerAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      customerAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ customerAnalysisId }) =>
      global.INFINICUS.BI.customerStore.get(
        "analyses",
        customerAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.customerStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.customerStore.list("signals")
  });

  runtime.registerService(
    "bi.customer_intelligence",
    api,
    { block: "BI-13" }
  );

  runtime.registerRoute(
    "bi.customer_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.customerIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-14-Marketing-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-14-Marketing-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-14.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-14.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-14-Marketing-Intelligence-Engine/src/analysis/marketing-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const conversion =
      profile.marketingConversionRatePercent == null
        ? 50
        : clamp(profile.marketingConversionRatePercent * 4);

    const roas =
      profile.returnOnAdSpend == null
        ? 50
        : clamp(profile.returnOnAdSpend / 4 * 100);

    const roi =
      profile.marketingRoiPercent == null
        ? 50
        : clamp(50 + profile.marketingRoiPercent / 2);

    const acquisitionEfficiency =
      profile.customerAcquisitionCostTrendPercent == null
        ? 50
        : clamp(70 - profile.customerAcquisitionCostTrendPercent * 2);

    const engagement =
      profile.engagementRatePercent == null
        ? 50
        : clamp(profile.engagementRatePercent * 5);

    const total =
      conversion * 0.2 +
      roas * 0.25 +
      roi * 0.2 +
      acquisitionEfficiency * 0.2 +
      engagement * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        conversion,
        roas,
        roi,
        acquisitionEfficiency,
        engagement
      }
    };
  }

  global.INFINICUS.BI.marketingHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-14-Marketing-Intelligence-Engine/src/analysis/marketing-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.returnOnAdSpend != null &&
      profile.returnOnAdSpend < 1
    ) {
      add("NEGATIVE_ROAS", "critical", "Advertising revenue is below advertising spend.", "returnOnAdSpend");
    }

    if (
      profile.marketingConversionRatePercent != null &&
      profile.marketingConversionRatePercent < 2
    ) {
      add("LOW_MARKETING_CONVERSION", "warning", "Marketing conversion rate is below 2%.", "marketingConversionRatePercent");
    }

    if (
      profile.customerAcquisitionCostTrendPercent != null &&
      profile.customerAcquisitionCostTrendPercent > 10
    ) {
      add("CAC_INCREASING", "warning", "Customer acquisition cost is increasing by more than 10%.", "customerAcquisitionCostTrendPercent");
    }

    if (
      profile.engagementRatePercent != null &&
      profile.engagementRatePercent < 2
    ) {
      add("LOW_ENGAGEMENT", "warning", "Audience engagement is below 2%.", "engagementRatePercent");
    }

    if (
      profile.returnOnAdSpend != null &&
      profile.returnOnAdSpend >= 4
    ) {
      add("STRONG_ROAS", "opportunity", "Return on ad spend is at least 4×.", "returnOnAdSpend");
    }

    if (
      profile.organicTrafficGrowthPercent != null &&
      profile.organicTrafficGrowthPercent > 15
    ) {
      add("ORGANIC_GROWTH", "opportunity", "Organic traffic is growing strongly.", "organicTrafficGrowthPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.marketingSignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-14-Marketing-Intelligence-Engine/src/analysis/marketing-ranker.js --- */
(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = []) {
    return metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .map((result, index) => ({
        rank: index + 1,
        metricCode: result.metricCode,
        groupKey: result.groupKey,
        value: result.value,
        unit: result.unit
      }));
  }

  global.INFINICUS.BI.marketingRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-14-Marketing-Intelligence-Engine/src/storage/marketing-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_MARKETING_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "marketingAnalysisId"],
          ["signals", "marketingSignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "MARKETING_STORAGE_ERROR",
        error?.message || "Marketing intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "MARKETING_RECORD_NOT_FOUND",
            "Marketing intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "MARKETING_STORAGE_ERROR",
        error?.message || "Marketing intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "MARKETING_STORAGE_ERROR",
        error?.message || "Marketing intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.marketingStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-14-Marketing-Intelligence-Engine/src/engine/marketing-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({
    intelligenceHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      reach:
        read(byCode, ["reach", "marketing_reach"]),
      impressions:
        read(byCode, ["impressions", "marketing_impressions"]),
      engagementRatePercent:
        read(byCode, ["engagement_rate", "marketing_engagement_rate"]),
      leads:
        read(byCode, ["leads", "marketing_leads"]),
      marketingConversionRatePercent:
        read(byCode, ["marketing_conversion_rate", "lead_conversion_rate"]),
      customerAcquisitionCost:
        read(byCode, ["customer_acquisition_cost", "cac"]),
      customerAcquisitionCostTrendPercent:
        read(byCode, ["customer_acquisition_cost_trend_percent", "cac_trend_percent"]),
      returnOnAdSpend:
        read(byCode, ["return_on_ad_spend", "roas"]),
      marketingRoiPercent:
        read(byCode, ["marketing_roi_percent", "campaign_roi_percent"]),
      costPerLead:
        read(byCode, ["cost_per_lead", "cpl"]),
      organicTrafficGrowthPercent:
        read(byCode, ["organic_traffic_growth_percent"])
    };

    const health =
      global.INFINICUS.BI
        .marketingHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .marketingSignalEngine
        .generate(profile);

    const campaignRanking =
      global.INFINICUS.BI
        .marketingRanker
        .rank(results, [
          "return_on_ad_spend_by_campaign",
          "conversion_rate_by_campaign",
          "revenue_by_campaign"
        ]);

    const channelRanking =
      global.INFINICUS.BI
        .marketingRanker
        .rank(results, [
          "return_on_ad_spend_by_channel",
          "conversion_rate_by_channel",
          "revenue_by_marketing_channel"
        ]);

    const audienceRanking =
      global.INFINICUS.BI
        .marketingRanker
        .rank(results, [
          "conversion_rate_by_audience",
          "engagement_rate_by_audience"
        ]);

    const marketingAnalysis = {
      marketingAnalysisId:
        runtime.createId("bi_marketing_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      campaignRanking:
        campaignRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      audienceRanking:
        audienceRanking.map(runtime.clone),
      summary: {
        reach:
          profile.reach,
        conversion:
          profile.marketingConversionRatePercent != null
            ? `${profile.marketingConversionRatePercent}%`
            : "insufficient data",
        acquisitionCost:
          profile.customerAcquisitionCost,
        roas:
          profile.returnOnAdSpend != null
            ? `${profile.returnOnAdSpend}x`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketingStore
      .put("analyses", marketingAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        marketingSignalId:
          runtime.createId("bi_marketing_signal"),
        marketingAnalysisId:
          marketingAnalysis.marketingAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .marketingStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-14",
      marketingAnalysisId:
        marketingAnalysis.marketingAnalysisId,
      calculationRunId:
        marketingAnalysis.calculationRunId,
      correlationId:
        marketingAnalysis.correlationId,
      marketingHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      campaignRanking:
        campaignRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      audienceRanking:
        audienceRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketingStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.marketing_intelligence.completed",
      {
        marketingAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      marketingAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ marketingAnalysisId }) =>
      global.INFINICUS.BI.marketingStore.get(
        "analyses",
        marketingAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.marketingStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.marketingStore.list("signals")
  });

  runtime.registerService(
    "bi.marketing_intelligence",
    api,
    { block: "BI-14" }
  );

  runtime.registerRoute(
    "bi.marketing_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.marketingIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-15-Operations-Productivity-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-15-Operations-Productivity-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-15.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-15.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-15-Operations-Productivity-Intelligence-Engine/src/analysis/operations-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const utilization =
      profile.capacityUtilizationPercent == null
        ? 50
        : clamp(100 - Math.abs(profile.capacityUtilizationPercent - 80) * 2);

    const productivity =
      profile.productivityGrowthPercent == null
        ? 50
        : clamp(50 + profile.productivityGrowthPercent * 2);

    const cycleTime =
      profile.cycleTimeVariancePercent == null
        ? 50
        : clamp(100 - Math.abs(profile.cycleTimeVariancePercent) * 2);

    const service =
      profile.slaCompliancePercent == null
        ? 50
        : clamp(profile.slaCompliancePercent);

    const quality =
      profile.defectRatePercent == null
        ? 50
        : clamp(100 - profile.defectRatePercent * 5);

    const total =
      utilization * 0.2 +
      productivity * 0.25 +
      cycleTime * 0.2 +
      service * 0.2 +
      quality * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        utilization,
        productivity,
        cycleTime,
        service,
        quality
      }
    };
  }

  global.INFINICUS.BI.operationsHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-15-Operations-Productivity-Intelligence-Engine/src/analysis/operations-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.capacityUtilizationPercent != null &&
      profile.capacityUtilizationPercent > 95
    ) {
      add("OVER_CAPACITY", "critical", "Capacity utilization exceeds 95%.", "capacityUtilizationPercent");
    }

    if (
      profile.capacityUtilizationPercent != null &&
      profile.capacityUtilizationPercent < 50
    ) {
      add("UNDER_UTILIZATION", "warning", "Capacity utilization is below 50%.", "capacityUtilizationPercent");
    }

    if (
      profile.slaCompliancePercent != null &&
      profile.slaCompliancePercent < 90
    ) {
      add("SLA_BREACH_RISK", "warning", "SLA compliance is below 90%.", "slaCompliancePercent");
    }

    if (
      profile.defectRatePercent != null &&
      profile.defectRatePercent > 5
    ) {
      add("HIGH_DEFECT_RATE", "critical", "Defect rate exceeds 5%.", "defectRatePercent");
    }

    if (
      profile.productivityGrowthPercent != null &&
      profile.productivityGrowthPercent > 10
    ) {
      add("PRODUCTIVITY_GAIN", "opportunity", "Productivity has improved by more than 10%.", "productivityGrowthPercent");
    }

    if (
      profile.throughputGrowthPercent != null &&
      profile.throughputGrowthPercent > 10
    ) {
      add("THROUGHPUT_GROWTH", "opportunity", "Throughput is growing strongly.", "throughputGrowthPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.operationsSignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-15-Operations-Productivity-Intelligence-Engine/src/analysis/operations-ranker.js --- */
(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = []) {
    return metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .map((result, index) => ({
        rank: index + 1,
        metricCode: result.metricCode,
        groupKey: result.groupKey,
        value: result.value,
        unit: result.unit
      }));
  }

  global.INFINICUS.BI.operationsRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-15-Operations-Productivity-Intelligence-Engine/src/storage/operations-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_OPERATIONS_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "operationsAnalysisId"],
          ["signals", "operationsSignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "OPERATIONS_STORAGE_ERROR",
        error?.message || "Operations intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "OPERATIONS_RECORD_NOT_FOUND",
            "Operations intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "OPERATIONS_STORAGE_ERROR",
        error?.message || "Operations intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "OPERATIONS_STORAGE_ERROR",
        error?.message || "Operations intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.operationsStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-15-Operations-Productivity-Intelligence-Engine/src/engine/operations-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({ intelligenceHandoffId } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      throughput:
        read(byCode, ["throughput", "units_completed"]),
      throughputGrowthPercent:
        read(byCode, ["throughput_growth_percent"]),
      averageCycleTime:
        read(byCode, ["average_cycle_time", "cycle_time"]),
      cycleTimeVariancePercent:
        read(byCode, ["cycle_time_variance_percent"]),
      capacityUtilizationPercent:
        read(byCode, ["capacity_utilization", "capacity_utilization_percent"]),
      productivityPerResource:
        read(byCode, ["productivity_per_resource", "output_per_employee"]),
      productivityGrowthPercent:
        read(byCode, ["productivity_growth_percent"]),
      slaCompliancePercent:
        read(byCode, ["sla_compliance", "sla_compliance_percent"]),
      defectRatePercent:
        read(byCode, ["defect_rate", "defect_rate_percent"]),
      reworkRatePercent:
        read(byCode, ["rework_rate", "rework_rate_percent"]),
      downtimePercent:
        read(byCode, ["downtime_percent"])
    };

    const health =
      global.INFINICUS.BI
        .operationsHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .operationsSignalEngine
        .generate(profile);

    const processRanking =
      global.INFINICUS.BI
        .operationsRanker
        .rank(results, [
          "throughput_by_process",
          "productivity_by_process",
          "sla_compliance_by_process"
        ]);

    const locationRanking =
      global.INFINICUS.BI
        .operationsRanker
        .rank(results, [
          "throughput_by_location",
          "productivity_by_location",
          "sla_compliance_by_location"
        ]);

    const bottleneckRanking =
      global.INFINICUS.BI
        .operationsRanker
        .rank(results, [
          "cycle_time_by_process",
          "downtime_by_process",
          "queue_time_by_process"
        ])
        .reverse();

    const operationsAnalysis = {
      operationsAnalysisId:
        runtime.createId("bi_operations_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      processRanking:
        processRanking.map(runtime.clone),
      locationRanking:
        locationRanking.map(runtime.clone),
      bottleneckRanking:
        bottleneckRanking.map(runtime.clone),
      summary: {
        throughput:
          profile.throughput,
        cycleTime:
          profile.averageCycleTime,
        utilization:
          profile.capacityUtilizationPercent != null
            ? `${profile.capacityUtilizationPercent}%`
            : "insufficient data",
        slaCompliance:
          profile.slaCompliancePercent != null
            ? `${profile.slaCompliancePercent}%`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .operationsStore
      .put("analyses", operationsAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        operationsSignalId:
          runtime.createId("bi_operations_signal"),
        operationsAnalysisId:
          operationsAnalysis.operationsAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .operationsStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-15",
      operationsAnalysisId:
        operationsAnalysis.operationsAnalysisId,
      calculationRunId:
        operationsAnalysis.calculationRunId,
      correlationId:
        operationsAnalysis.correlationId,
      operationsHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      processRanking:
        processRanking.map(runtime.clone),
      locationRanking:
        locationRanking.map(runtime.clone),
      bottleneckRanking:
        bottleneckRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .operationsStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.operations_intelligence.completed",
      {
        operationsAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      operationsAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ operationsAnalysisId }) =>
      global.INFINICUS.BI.operationsStore.get(
        "analyses",
        operationsAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.operationsStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.operationsStore.list("signals")
  });

  runtime.registerService(
    "bi.operations_intelligence",
    api,
    { block: "BI-15" }
  );

  runtime.registerRoute(
    "bi.operations_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.operationsIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-16-Inventory-Supply-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-16-Inventory-Supply-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-16.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-16.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-16-Inventory-Supply-Intelligence-Engine/src/analysis/inventory-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const availability =
      profile.stockAvailabilityPercent == null
        ? 50
        : clamp(profile.stockAvailabilityPercent);

    const turnover =
      profile.inventoryTurnover == null
        ? 50
        : clamp(profile.inventoryTurnover / 12 * 100);

    const stockouts =
      profile.stockoutRatePercent == null
        ? 50
        : clamp(100 - profile.stockoutRatePercent * 5);

    const supplierReliability =
      profile.supplierOnTimeDeliveryPercent == null
        ? 50
        : clamp(profile.supplierOnTimeDeliveryPercent);

    const waste =
      profile.wasteRatePercent == null
        ? 50
        : clamp(100 - profile.wasteRatePercent * 5);

    const total =
      availability * 0.25 +
      turnover * 0.2 +
      stockouts * 0.2 +
      supplierReliability * 0.2 +
      waste * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        availability,
        turnover,
        stockouts,
        supplierReliability,
        waste
      }
    };
  }

  global.INFINICUS.BI.inventoryHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-16-Inventory-Supply-Intelligence-Engine/src/analysis/inventory-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.stockoutRatePercent != null &&
      profile.stockoutRatePercent > 5
    ) {
      add("HIGH_STOCKOUT_RATE", "critical", "Stockout rate exceeds 5%.", "stockoutRatePercent");
    }

    if (
      profile.inventoryDaysOnHand != null &&
      profile.inventoryDaysOnHand > 90
    ) {
      add("EXCESS_INVENTORY", "warning", "Inventory days on hand exceeds 90 days.", "inventoryDaysOnHand");
    }

    if (
      profile.wasteRatePercent != null &&
      profile.wasteRatePercent > 5
    ) {
      add("HIGH_WASTE", "warning", "Waste rate exceeds 5%.", "wasteRatePercent");
    }

    if (
      profile.supplierOnTimeDeliveryPercent != null &&
      profile.supplierOnTimeDeliveryPercent < 90
    ) {
      add("SUPPLIER_DELIVERY_RISK", "warning", "Supplier on-time delivery is below 90%.", "supplierOnTimeDeliveryPercent");
    }

    if (
      profile.inventoryTurnoverGrowthPercent != null &&
      profile.inventoryTurnoverGrowthPercent > 10
    ) {
      add("TURNOVER_IMPROVEMENT", "opportunity", "Inventory turnover is improving strongly.", "inventoryTurnoverGrowthPercent");
    }

    if (
      profile.stockAvailabilityPercent != null &&
      profile.stockAvailabilityPercent >= 98
    ) {
      add("HIGH_AVAILABILITY", "opportunity", "Stock availability is at least 98%.", "stockAvailabilityPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.inventorySignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-16-Inventory-Supply-Intelligence-Engine/src/analysis/inventory-ranker.js --- */
(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = [], ascending = false) {
    const sorted = metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) =>
        ascending
          ? Number(a.value || 0) - Number(b.value || 0)
          : Number(b.value || 0) - Number(a.value || 0)
      );

    return sorted.map((result, index) => ({
      rank: index + 1,
      metricCode: result.metricCode,
      groupKey: result.groupKey,
      value: result.value,
      unit: result.unit
    }));
  }

  global.INFINICUS.BI.inventoryRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-16-Inventory-Supply-Intelligence-Engine/src/storage/inventory-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_INVENTORY_SUPPLY_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "inventoryAnalysisId"],
          ["signals", "inventorySignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "INVENTORY_STORAGE_ERROR",
        error?.message || "Inventory intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "INVENTORY_RECORD_NOT_FOUND",
            "Inventory intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "INVENTORY_STORAGE_ERROR",
        error?.message || "Inventory intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "INVENTORY_STORAGE_ERROR",
        error?.message || "Inventory intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.inventoryStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-16-Inventory-Supply-Intelligence-Engine/src/engine/inventory-supply-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({ intelligenceHandoffId } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      stockAvailabilityPercent:
        read(byCode, ["stock_availability", "stock_availability_percent"]),
      stockoutRatePercent:
        read(byCode, ["stockout_rate", "stockout_rate_percent"]),
      inventoryTurnover:
        read(byCode, ["inventory_turnover"]),
      inventoryTurnoverGrowthPercent:
        read(byCode, ["inventory_turnover_growth_percent"]),
      inventoryDaysOnHand:
        read(byCode, ["inventory_days_on_hand", "days_on_hand"]),
      excessInventoryValue:
        read(byCode, ["excess_inventory_value"]),
      obsoleteInventoryValue:
        read(byCode, ["obsolete_inventory_value"]),
      wasteRatePercent:
        read(byCode, ["waste_rate", "waste_rate_percent"]),
      shrinkageRatePercent:
        read(byCode, ["shrinkage_rate", "shrinkage_rate_percent"]),
      supplierOnTimeDeliveryPercent:
        read(byCode, ["supplier_on_time_delivery", "supplier_on_time_delivery_percent"]),
      averageSupplierLeadTimeDays:
        read(byCode, ["average_supplier_lead_time_days"]),
      reorderCoverageDays:
        read(byCode, ["reorder_coverage_days"])
    };

    const health =
      global.INFINICUS.BI
        .inventoryHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .inventorySignalEngine
        .generate(profile);

    const productRiskRanking =
      global.INFINICUS.BI
        .inventoryRanker
        .rank(results, [
          "stockout_rate_by_product",
          "days_on_hand_by_product",
          "waste_rate_by_product"
        ]);

    const warehouseRanking =
      global.INFINICUS.BI
        .inventoryRanker
        .rank(results, [
          "stock_availability_by_warehouse",
          "inventory_turnover_by_warehouse"
        ]);

    const supplierRanking =
      global.INFINICUS.BI
        .inventoryRanker
        .rank(results, [
          "supplier_on_time_delivery_by_supplier",
          "supplier_quality_score_by_supplier"
        ]);

    const inventoryAnalysis = {
      inventoryAnalysisId:
        runtime.createId("bi_inventory_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      productRiskRanking:
        productRiskRanking.map(runtime.clone),
      warehouseRanking:
        warehouseRanking.map(runtime.clone),
      supplierRanking:
        supplierRanking.map(runtime.clone),
      summary: {
        availability:
          profile.stockAvailabilityPercent != null
            ? `${profile.stockAvailabilityPercent}%`
            : "insufficient data",
        stockoutRate:
          profile.stockoutRatePercent != null
            ? `${profile.stockoutRatePercent}%`
            : "insufficient data",
        turnover:
          profile.inventoryTurnover,
        daysOnHand:
          profile.inventoryDaysOnHand
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .inventoryStore
      .put("analyses", inventoryAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        inventorySignalId:
          runtime.createId("bi_inventory_signal"),
        inventoryAnalysisId:
          inventoryAnalysis.inventoryAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .inventoryStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-16",
      inventoryAnalysisId:
        inventoryAnalysis.inventoryAnalysisId,
      calculationRunId:
        inventoryAnalysis.calculationRunId,
      correlationId:
        inventoryAnalysis.correlationId,
      inventoryHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      productRiskRanking:
        productRiskRanking.map(runtime.clone),
      warehouseRanking:
        warehouseRanking.map(runtime.clone),
      supplierRanking:
        supplierRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .inventoryStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.inventory_supply_intelligence.completed",
      {
        inventoryAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      inventoryAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ inventoryAnalysisId }) =>
      global.INFINICUS.BI.inventoryStore.get(
        "analyses",
        inventoryAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.inventoryStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.inventoryStore.list("signals")
  });

  runtime.registerService(
    "bi.inventory_supply_intelligence",
    api,
    { block: "BI-16" }
  );

  runtime.registerRoute(
    "bi.inventory_supply_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.inventorySupplyIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-17-Workforce-Organizational-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-17-Workforce-Organizational-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-17.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-17.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-17-Workforce-Organizational-Intelligence-Engine/src/analysis/workforce-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const retention =
      profile.employeeRetentionRatePercent == null
        ? 50
        : clamp(profile.employeeRetentionRatePercent);

    const attendance =
      profile.attendanceRatePercent == null
        ? 50
        : clamp(profile.attendanceRatePercent);

    const engagement =
      profile.employeeEngagementScore == null
        ? 50
        : clamp(profile.employeeEngagementScore * 20);

    const productivity =
      profile.workforceProductivityGrowthPercent == null
        ? 50
        : clamp(50 + profile.workforceProductivityGrowthPercent * 2);

    const skills =
      profile.criticalSkillCoveragePercent == null
        ? 50
        : clamp(profile.criticalSkillCoveragePercent);

    const total =
      retention * 0.25 +
      attendance * 0.2 +
      engagement * 0.2 +
      productivity * 0.2 +
      skills * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        retention,
        attendance,
        engagement,
        productivity,
        skills
      }
    };
  }

  global.INFINICUS.BI.workforceHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-17-Workforce-Organizational-Intelligence-Engine/src/analysis/workforce-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.employeeTurnoverRatePercent != null &&
      profile.employeeTurnoverRatePercent > 15
    ) {
      add("HIGH_EMPLOYEE_TURNOVER", "critical", "Employee turnover exceeds 15%.", "employeeTurnoverRatePercent");
    }

    if (
      profile.absenceRatePercent != null &&
      profile.absenceRatePercent > 5
    ) {
      add("HIGH_ABSENCE_RATE", "warning", "Employee absence rate exceeds 5%.", "absenceRatePercent");
    }

    if (
      profile.employeeEngagementScore != null &&
      profile.employeeEngagementScore < 3
    ) {
      add("LOW_ENGAGEMENT", "warning", "Employee engagement score is below 3 out of 5.", "employeeEngagementScore");
    }

    if (
      profile.averageWorkloadUtilizationPercent != null &&
      profile.averageWorkloadUtilizationPercent > 95
    ) {
      add("WORKLOAD_OVERLOAD", "critical", "Average workload utilization exceeds 95%.", "averageWorkloadUtilizationPercent");
    }

    if (
      profile.workforceProductivityGrowthPercent != null &&
      profile.workforceProductivityGrowthPercent > 10
    ) {
      add("PRODUCTIVITY_IMPROVEMENT", "opportunity", "Workforce productivity improved by more than 10%.", "workforceProductivityGrowthPercent");
    }

    if (
      profile.criticalSkillCoveragePercent != null &&
      profile.criticalSkillCoveragePercent >= 90
    ) {
      add("STRONG_SKILL_COVERAGE", "opportunity", "Critical skill coverage is at least 90%.", "criticalSkillCoveragePercent");
    }

    return signals;
  }

  global.INFINICUS.BI.workforceSignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-17-Workforce-Organizational-Intelligence-Engine/src/analysis/workforce-ranker.js --- */
(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = [], ascending = false) {
    const rows = metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) =>
        ascending
          ? Number(a.value || 0) - Number(b.value || 0)
          : Number(b.value || 0) - Number(a.value || 0)
      );

    return rows.map((result, index) => ({
      rank: index + 1,
      metricCode: result.metricCode,
      groupKey: result.groupKey,
      value: result.value,
      unit: result.unit
    }));
  }

  global.INFINICUS.BI.workforceRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-17-Workforce-Organizational-Intelligence-Engine/src/storage/workforce-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_WORKFORCE_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "workforceAnalysisId"],
          ["signals", "workforceSignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "WORKFORCE_STORAGE_ERROR",
        error?.message || "Workforce intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "WORKFORCE_RECORD_NOT_FOUND",
            "Workforce intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "WORKFORCE_STORAGE_ERROR",
        error?.message || "Workforce intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "WORKFORCE_STORAGE_ERROR",
        error?.message || "Workforce intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.workforceStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-17-Workforce-Organizational-Intelligence-Engine/src/engine/workforce-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (!existing || new Date(result.calculatedAt) > new Date(existing.calculatedAt)) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({ intelligenceHandoffId } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({ intelligenceHandoffId });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      headcount:
        read(byCode, ["headcount", "employee_headcount"]),
      attendanceRatePercent:
        read(byCode, ["attendance_rate", "attendance_rate_percent"]),
      absenceRatePercent:
        read(byCode, ["absence_rate", "absence_rate_percent"]),
      employeeTurnoverRatePercent:
        read(byCode, ["employee_turnover_rate", "employee_turnover_rate_percent"]),
      employeeRetentionRatePercent:
        read(byCode, ["employee_retention_rate", "employee_retention_rate_percent"]),
      employeeEngagementScore:
        read(byCode, ["employee_engagement_score"]),
      workforceProductivity:
        read(byCode, ["workforce_productivity", "output_per_employee"]),
      workforceProductivityGrowthPercent:
        read(byCode, ["workforce_productivity_growth_percent"]),
      averageWorkloadUtilizationPercent:
        read(byCode, ["average_workload_utilization_percent"]),
      criticalSkillCoveragePercent:
        read(byCode, ["critical_skill_coverage_percent"]),
      trainingCompletionRatePercent:
        read(byCode, ["training_completion_rate_percent"]),
      vacancyRatePercent:
        read(byCode, ["vacancy_rate_percent"])
    };

    const health =
      global.INFINICUS.BI
        .workforceHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .workforceSignalEngine
        .generate(profile);

    const teamRanking =
      global.INFINICUS.BI
        .workforceRanker
        .rank(results, [
          "productivity_by_team",
          "engagement_by_team",
          "retention_by_team"
        ]);

    const roleRiskRanking =
      global.INFINICUS.BI
        .workforceRanker
        .rank(results, [
          "turnover_by_role",
          "vacancy_rate_by_role",
          "workload_by_role"
        ]);

    const locationRanking =
      global.INFINICUS.BI
        .workforceRanker
        .rank(results, [
          "productivity_by_location",
          "attendance_by_location",
          "engagement_by_location"
        ]);

    const workforceAnalysis = {
      workforceAnalysisId:
        runtime.createId("bi_workforce_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile: runtime.clone(profile),
      health: runtime.clone(health),
      teamRanking: teamRanking.map(runtime.clone),
      roleRiskRanking: roleRiskRanking.map(runtime.clone),
      locationRanking: locationRanking.map(runtime.clone),
      summary: {
        headcount: profile.headcount,
        retention:
          profile.employeeRetentionRatePercent != null
            ? `${profile.employeeRetentionRatePercent}%`
            : "insufficient data",
        engagement: profile.employeeEngagementScore,
        productivityGrowth:
          profile.workforceProductivityGrowthPercent != null
            ? `${profile.workforceProductivityGrowthPercent}%`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.BI
      .workforceStore
      .put("analyses", workforceAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        workforceSignalId:
          runtime.createId("bi_workforce_signal"),
        workforceAnalysisId:
          workforceAnalysis.workforceAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .workforceStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-17",
      workforceAnalysisId:
        workforceAnalysis.workforceAnalysisId,
      calculationRunId:
        workforceAnalysis.calculationRunId,
      correlationId:
        workforceAnalysis.correlationId,
      workforceHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      teamRanking:
        teamRanking.map(runtime.clone),
      roleRiskRanking:
        roleRiskRanking.map(runtime.clone),
      locationRanking:
        locationRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .workforceStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.workforce_intelligence.completed",
      {
        workforceAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      workforceAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ workforceAnalysisId }) =>
      global.INFINICUS.BI.workforceStore.get(
        "analyses",
        workforceAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.workforceStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.workforceStore.list("signals")
  });

  runtime.registerService(
    "bi.workforce_intelligence",
    api,
    { block: "BI-17" }
  );

  runtime.registerRoute(
    "bi.workforce_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.workforceIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-18-Market-Competitive-Intelligence-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-18-Market-Competitive-Intelligence-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-18.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-18.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-18-Market-Competitive-Intelligence-Engine/src/analysis/market-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const marketGrowth =
      profile.marketGrowthPercent == null
        ? 50
        : clamp(50 + profile.marketGrowthPercent * 2);

    const marketShare =
      profile.marketSharePercent == null
        ? 50
        : clamp(profile.marketSharePercent * 4);

    const demand =
      profile.demandGrowthPercent == null
        ? 50
        : clamp(50 + profile.demandGrowthPercent * 2);

    const pricing =
      profile.priceCompetitivenessScore == null
        ? 50
        : clamp(profile.priceCompetitivenessScore);

    const differentiation =
      profile.differentiationScore == null
        ? 50
        : clamp(profile.differentiationScore);

    const total =
      marketGrowth * 0.25 +
      marketShare * 0.2 +
      demand * 0.2 +
      pricing * 0.15 +
      differentiation * 0.2;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "favorable" :
        total >= 50 ? "competitive" :
        "adverse",
      components: {
        marketGrowth,
        marketShare,
        demand,
        pricing,
        differentiation
      }
    };
  }

  global.INFINICUS.BI.marketHealthScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-18-Market-Competitive-Intelligence-Engine/src/analysis/market-signal-engine.js --- */
(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.marketGrowthPercent != null &&
      profile.marketGrowthPercent < 0
    ) {
      add("MARKET_CONTRACTION", "critical", "The market is contracting.", "marketGrowthPercent");
    }

    if (
      profile.marketShareTrendPercent != null &&
      profile.marketShareTrendPercent < -5
    ) {
      add("MARKET_SHARE_LOSS", "critical", "Market share declined by more than 5%.", "marketShareTrendPercent");
    }

    if (
      profile.competitorPriceGapPercent != null &&
      profile.competitorPriceGapPercent > 15
    ) {
      add("PRICE_DISADVANTAGE", "warning", "Pricing is more than 15% above competitor benchmark.", "competitorPriceGapPercent");
    }

    if (
      profile.competitiveIntensityScore != null &&
      profile.competitiveIntensityScore > 80
    ) {
      add("HIGH_COMPETITIVE_PRESSURE", "warning", "Competitive intensity is very high.", "competitiveIntensityScore");
    }

    if (
      profile.demandGrowthPercent != null &&
      profile.demandGrowthPercent > 10
    ) {
      add("DEMAND_GROWTH", "opportunity", "Demand is growing by more than 10%.", "demandGrowthPercent");
    }

    if (
      profile.differentiationScore != null &&
      profile.differentiationScore >= 80
    ) {
      add("STRONG_DIFFERENTIATION", "opportunity", "Differentiation score is at least 80.", "differentiationScore");
    }

    return signals;
  }

  global.INFINICUS.BI.marketSignalEngine =
    Object.freeze({ generate });
})(window);

/* --- business-intelligence/INFINICUS-BI-18-Market-Competitive-Intelligence-Engine/src/analysis/market-ranker.js --- */
(function (global) {
  "use strict";

  function rank(metricResults = [], metricCodes = [], ascending = false) {
    const rows = metricResults
      .filter(result =>
        metricCodes.includes(result.metricCode) &&
        result.groupKey !== "__all__"
      )
      .sort((a, b) =>
        ascending
          ? Number(a.value || 0) - Number(b.value || 0)
          : Number(b.value || 0) - Number(a.value || 0)
      );

    return rows.map((result, index) => ({
      rank: index + 1,
      metricCode: result.metricCode,
      groupKey: result.groupKey,
      value: result.value,
      unit: result.unit
    }));
  }

  global.INFINICUS.BI.marketRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-18-Market-Competitive-Intelligence-Engine/src/storage/market-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_MARKET_COMPETITIVE_INTELLIGENCE";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analyses", "marketAnalysisId"],
          ["signals", "marketSignalId"],
          ["analysis_handoffs", "analysisHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "MARKET_STORAGE_ERROR",
        error?.message || "Market intelligence storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "MARKET_RECORD_NOT_FOUND",
            "Market intelligence record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "MARKET_STORAGE_ERROR",
        error?.message || "Market intelligence retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "MARKET_STORAGE_ERROR",
        error?.message || "Market intelligence listing failed."
      );
    }
  }

  global.INFINICUS.BI.marketStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-18-Market-Competitive-Intelligence-Engine/src/engine/market-competitive-intelligence-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (!existing || new Date(result.calculatedAt) > new Date(existing.calculatedAt)) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({ intelligenceHandoffId } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({ intelligenceHandoffId });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      totalAddressableMarket:
        read(byCode, ["total_addressable_market", "tam"]),
      serviceableAvailableMarket:
        read(byCode, ["serviceable_available_market", "sam"]),
      serviceableObtainableMarket:
        read(byCode, ["serviceable_obtainable_market", "som"]),
      marketGrowthPercent:
        read(byCode, ["market_growth_percent"]),
      demandGrowthPercent:
        read(byCode, ["demand_growth_percent"]),
      marketSharePercent:
        read(byCode, ["market_share_percent"]),
      marketShareTrendPercent:
        read(byCode, ["market_share_trend_percent"]),
      competitorPriceGapPercent:
        read(byCode, ["competitor_price_gap_percent"]),
      priceCompetitivenessScore:
        read(byCode, ["price_competitiveness_score"]),
      competitiveIntensityScore:
        read(byCode, ["competitive_intensity_score"]),
      differentiationScore:
        read(byCode, ["differentiation_score"]),
      categoryGrowthPercent:
        read(byCode, ["category_growth_percent"])
    };

    const health =
      global.INFINICUS.BI
        .marketHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .marketSignalEngine
        .generate(profile);

    const marketRanking =
      global.INFINICUS.BI
        .marketRanker
        .rank(results, [
          "market_growth_by_market",
          "demand_growth_by_market",
          "market_attractiveness_by_market"
        ]);

    const segmentRanking =
      global.INFINICUS.BI
        .marketRanker
        .rank(results, [
          "segment_growth_rate",
          "segment_profitability_score",
          "segment_demand_score"
        ]);

    const competitorRanking =
      global.INFINICUS.BI
        .marketRanker
        .rank(results, [
          "competitor_market_share",
          "competitor_growth_rate",
          "competitor_brand_strength"
        ]);

    const marketAnalysis = {
      marketAnalysisId:
        runtime.createId("bi_market_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      marketRanking:
        marketRanking.map(runtime.clone),
      segmentRanking:
        segmentRanking.map(runtime.clone),
      competitorRanking:
        competitorRanking.map(runtime.clone),
      summary: {
        marketGrowth:
          profile.marketGrowthPercent != null
            ? `${profile.marketGrowthPercent}%`
            : "insufficient data",
        demandGrowth:
          profile.demandGrowthPercent != null
            ? `${profile.demandGrowthPercent}%`
            : "insufficient data",
        marketShare:
          profile.marketSharePercent != null
            ? `${profile.marketSharePercent}%`
            : "insufficient data",
        differentiation:
          profile.differentiationScore
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketStore
      .put("analyses", marketAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        marketSignalId:
          runtime.createId("bi_market_signal"),
        marketAnalysisId:
          marketAnalysis.marketAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .marketStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-18",
      marketAnalysisId:
        marketAnalysis.marketAnalysisId,
      calculationRunId:
        marketAnalysis.calculationRunId,
      correlationId:
        marketAnalysis.correlationId,
      marketHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      marketRanking:
        marketRanking.map(runtime.clone),
      segmentRanking:
        segmentRanking.map(runtime.clone),
      competitorRanking:
        competitorRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.market_competitive_intelligence.completed",
      {
        marketAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      marketAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ marketAnalysisId }) =>
      global.INFINICUS.BI.marketStore.get(
        "analyses",
        marketAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.marketStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.marketStore.list("signals")
  });

  runtime.registerService(
    "bi.market_competitive_intelligence",
    api,
    { block: "BI-18" }
  );

  runtime.registerRoute(
    "bi.market_competitive_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.marketCompetitiveIntelligenceEngine = api;
})(window);

/* ===== INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-19.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine/src/analysis/trend-engine.js --- */
(function (global) {
  "use strict";

  function analyze(series = []) {
    const ordered = [...series]
      .filter(point => Number.isFinite(Number(point.value)))
      .sort((a, b) =>
        new Date(a.period).getTime() -
        new Date(b.period).getTime()
      );

    if (ordered.length < 2) {
      return {
        direction: "insufficient_data",
        change: null,
        changePercent: null,
        momentum: "unknown",
        points: ordered
      };
    }

    const first = Number(ordered[0].value);
    const last = Number(ordered.at(-1).value);
    const previous = Number(ordered.at(-2).value);
    const change = last - first;
    const changePercent = first === 0
      ? null
      : change / Math.abs(first) * 100;

    const recentChange = last - previous;

    return {
      direction:
        change > 0 ? "upward" :
        change < 0 ? "downward" :
        "flat",
      change:
        Number(change.toFixed(4)),
      changePercent:
        changePercent == null
          ? null
          : Number(changePercent.toFixed(4)),
      momentum:
        Math.abs(recentChange) > Math.abs(change) / Math.max(1, ordered.length - 1)
          ? "accelerating"
          : "stable",
      points: ordered
    };
  }

  global.INFINICUS.BI.trendEngine =
    Object.freeze({ analyze });
})(window);

/* --- business-intelligence/INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine/src/analysis/variance-engine.js --- */
(function (global) {
  "use strict";

  function calculate(actual, reference, direction = "higher_is_better") {
    const a = Number(actual);
    const r = Number(reference);

    if (!Number.isFinite(a) || !Number.isFinite(r)) {
      return {
        valid: false,
        absoluteVariance: null,
        variancePercent: null,
        favorable: null,
        severity: "unknown"
      };
    }

    const absoluteVariance = a - r;
    const variancePercent = r === 0
      ? null
      : absoluteVariance / Math.abs(r) * 100;

    const favorable =
      direction === "lower_is_better"
        ? absoluteVariance <= 0
        : absoluteVariance >= 0;

    const magnitude =
      variancePercent == null
        ? Math.abs(absoluteVariance)
        : Math.abs(variancePercent);

    return {
      valid: true,
      absoluteVariance:
        Number(absoluteVariance.toFixed(4)),
      variancePercent:
        variancePercent == null
          ? null
          : Number(variancePercent.toFixed(4)),
      favorable,
      severity:
        magnitude >= 25 ? "critical" :
        magnitude >= 10 ? "high" :
        magnitude >= 5 ? "moderate" :
        "low"
    };
  }

  global.INFINICUS.BI.varianceEngine =
    Object.freeze({ calculate });
})(window);

/* --- business-intelligence/INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine/src/analysis/benchmark-engine.js --- */
(function (global) {
  "use strict";

  function compare(actual, benchmark, direction = "higher_is_better") {
    const variance =
      global.INFINICUS.BI
        .varianceEngine
        .calculate(actual, benchmark, direction);

    return {
      ...variance,
      position:
        !variance.valid ? "unknown" :
        variance.absoluteVariance === 0 ? "at_benchmark" :
        variance.favorable ? "above_benchmark" :
        "below_benchmark"
    };
  }

  global.INFINICUS.BI.benchmarkEngine =
    Object.freeze({ compare });
})(window);

/* --- business-intelligence/INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine/src/analysis/domain-consolidator.js --- */
(function (global) {
  "use strict";

  function consolidate(handoffs = []) {
    return handoffs.map(handoff => ({
      sourceBlock:
        handoff.sourceBlock,
      analysisHandoffId:
        handoff.analysisHandoffId,
      correlationId:
        handoff.correlationId,
      health:
        handoff.financialHealth ||
        handoff.salesHealth ||
        handoff.customerHealth ||
        handoff.marketingHealth ||
        handoff.operationsHealth ||
        handoff.inventoryHealth ||
        handoff.workforceHealth ||
        handoff.marketHealth ||
        null,
      profile:
        structuredClone(handoff.profile || {}),
      signals:
        structuredClone(handoff.signals || [])
    }));
  }

  global.INFINICUS.BI.domainIntelligenceConsolidator =
    Object.freeze({ consolidate });
})(window);

/* --- business-intelligence/INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine/src/storage/analysis-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_TREND_VARIANCE_BENCHMARK";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["analysis_runs", "analysisRunId"],
          ["trend_results", "trendResultId"],
          ["variance_results", "varianceResultId"],
          ["benchmark_results", "benchmarkResultId"],
          ["anomaly_handoffs", "anomalyHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ANALYSIS_STORAGE_ERROR",
        error?.message || "Trend and variance storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ANALYSIS_RECORD_NOT_FOUND",
            "Analysis record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ANALYSIS_STORAGE_ERROR",
        error?.message || "Analysis retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "ANALYSIS_STORAGE_ERROR",
        error?.message || "Analysis listing failed."
      );
    }
  }

  global.INFINICUS.BI.trendAnalysisStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-19-Trend-Variance-Benchmark-Analysis-Engine/src/engine/trend-variance-benchmark-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function analyze({
    domainHandoffs = [],
    timeSeries = [],
    targets = [],
    benchmarks = []
  } = {}) {
    const domains =
      global.INFINICUS.BI
        .domainIntelligenceConsolidator
        .consolidate(domainHandoffs);

    const trendResults = [];

    for (const item of timeSeries) {
      const trend =
        global.INFINICUS.BI
          .trendEngine
          .analyze(item.series || []);

      const record = {
        trendResultId:
          runtime.createId("bi_trend_result"),
        metricCode:
          item.metricCode,
        unit:
          item.unit || null,
        sourceBlock:
          item.sourceBlock || null,
        ...trend,
        createdAt:
          new Date().toISOString()
      };

      trendResults.push(record);

      await global.INFINICUS.BI
        .trendAnalysisStore
        .put("trend_results", record);
    }

    const varianceResults = [];

    for (const item of targets) {
      const result =
        global.INFINICUS.BI
          .varianceEngine
          .calculate(
            item.actual,
            item.target,
            item.direction
          );

      const record = {
        varianceResultId:
          runtime.createId("bi_variance_result"),
        metricCode:
          item.metricCode,
        referenceType:
          item.referenceType || "target",
        actual:
          item.actual,
        reference:
          item.target,
        unit:
          item.unit || null,
        ...result,
        createdAt:
          new Date().toISOString()
      };

      varianceResults.push(record);

      await global.INFINICUS.BI
        .trendAnalysisStore
        .put("variance_results", record);
    }

    const benchmarkResults = [];

    for (const item of benchmarks) {
      const result =
        global.INFINICUS.BI
          .benchmarkEngine
          .compare(
            item.actual,
            item.benchmark,
            item.direction
          );

      const record = {
        benchmarkResultId:
          runtime.createId("bi_benchmark_result"),
        metricCode:
          item.metricCode,
        actual:
          item.actual,
        benchmark:
          item.benchmark,
        benchmarkSource:
          item.benchmarkSource || null,
        benchmarkPeriod:
          item.benchmarkPeriod || null,
        unit:
          item.unit || null,
        ...result,
        createdAt:
          new Date().toISOString()
      };

      benchmarkResults.push(record);

      await global.INFINICUS.BI
        .trendAnalysisStore
        .put("benchmark_results", record);
    }

    const domainRanking =
      domains
        .filter(domain => Number.isFinite(Number(domain.health?.score)))
        .sort((a, b) =>
          Number(b.health.score) -
          Number(a.health.score)
        )
        .map((domain, index) => ({
          rank: index + 1,
          sourceBlock:
            domain.sourceBlock,
          score:
            domain.health.score,
          level:
            domain.health.level
        }));

    const analysisRun = {
      analysisRunId:
        runtime.createId("bi_trend_analysis_run"),
      correlationId:
        domainHandoffs.find(item => item.correlationId)?.correlationId ||
        runtime.createId("correlation"),
      domainCount:
        domains.length,
      trendCount:
        trendResults.length,
      varianceCount:
        varianceResults.length,
      benchmarkCount:
        benchmarkResults.length,
      domainRanking,
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .trendAnalysisStore
      .put("analysis_runs", analysisRun);

    const anomalyHandoff = {
      anomalyHandoffId:
        runtime.createId("bi_anomaly_handoff"),
      targetBlock: "BI-20",
      analysisRunId:
        analysisRun.analysisRunId,
      correlationId:
        analysisRun.correlationId,
      domains:
        domains.map(runtime.clone),
      trends:
        trendResults.map(runtime.clone),
      variances:
        varianceResults.map(runtime.clone),
      benchmarks:
        benchmarkResults.map(runtime.clone),
      domainRanking:
        domainRanking.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .trendAnalysisStore
      .put("anomaly_handoffs", anomalyHandoff);

    await runtime.emit(
      "bi.trend_variance_benchmark.completed",
      {
        analysisRun,
        anomalyHandoffId:
          anomalyHandoff.anomalyHandoffId
      }
    );

    return runtime.success({
      analysisRun,
      trendResults,
      varianceResults,
      benchmarkResults,
      anomalyHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysisRun: ({ analysisRunId }) =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .get("analysis_runs", analysisRunId),
    getAnomalyHandoff: ({ anomalyHandoffId }) =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .get("anomaly_handoffs", anomalyHandoffId),
    listTrendResults: () =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .list("trend_results"),
    listVarianceResults: () =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .list("variance_results"),
    listBenchmarkResults: () =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .list("benchmark_results")
  });

  runtime.registerService(
    "bi.trend_variance_benchmark",
    api,
    { block: "BI-19" }
  );

  runtime.registerRoute(
    "bi.trend_variance_benchmark.analyze",
    analyze
  );

  global.INFINICUS.BI.trendVarianceBenchmarkEngine = api;
})(window);

/* ===== INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-20.");
  }

  if (!BI?.trendVarianceBenchmarkEngine) {
    throw new Error("INFINICUS BI-19 must be loaded before BI-20.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine/src/model/detection-rule.js --- */
(function (global) {
  "use strict";

  const METHODS = Object.freeze([
    "z_score",
    "sudden_change",
    "variance_severity",
    "benchmark_breach",
    "domain_contradiction"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const method = String(input.method || "");

    if (!input.name || !METHODS.includes(method)) {
      return runtime.failure(
        "DETECTION_RULE_INVALID",
        "name and a supported method are required."
      );
    }

    return runtime.success({
      detectionRuleId:
        input.detectionRuleId ||
        runtime.createId("bi_detection_rule"),
      name:
        String(input.name),
      method,
      metricCode:
        input.metricCode || null,
      sourceBlock:
        input.sourceBlock || null,
      severity:
        String(input.severity || "warning"),
      configuration:
        runtime.clone(input.configuration || {}),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.detectionRuleModel =
    Object.freeze({
      METHODS,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine/src/detection/statistical-detector.js --- */
(function (global) {
  "use strict";

  function mean(values) {
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  function standardDeviation(values) {
    if (values.length < 2) return 0;

    const avg = mean(values);
    const variance =
      values.reduce(
        (sum, value) =>
          sum + Math.pow(value - avg, 2),
        0
      ) / values.length;

    return Math.sqrt(variance);
  }

  function zScore(value, baseline = []) {
    const values =
      baseline.map(Number).filter(Number.isFinite);

    if (!values.length) {
      return {
        valid: false,
        score: null,
        mean: null,
        standardDeviation: null
      };
    }

    const avg = mean(values);
    const deviation = standardDeviation(values);

    return {
      valid: deviation > 0,
      score:
        deviation > 0
          ? Number(((Number(value) - avg) / deviation).toFixed(4))
          : 0,
      mean:
        Number(avg.toFixed(4)),
      standardDeviation:
        Number(deviation.toFixed(4))
    };
  }

  global.INFINICUS.BI.statisticalAnomalyDetector =
    Object.freeze({
      mean,
      standardDeviation,
      zScore
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine/src/detection/rule-evaluator.js --- */
(function (global) {
  "use strict";

  function evaluate(rule, context) {
    const config = rule.configuration || {};

    if (rule.method === "z_score") {
      const result =
        global.INFINICUS.BI
          .statisticalAnomalyDetector
          .zScore(context.value, context.baseline || []);

      const threshold =
        Number(config.threshold || 3);

      return {
        detected:
          result.valid &&
          Math.abs(result.score) >= threshold,
        confidence:
          result.valid
            ? Math.min(1, Math.abs(result.score) / Math.max(threshold, 1))
            : 0,
        evidence:
          result
      };
    }

    if (rule.method === "sudden_change") {
      const change =
        Number(context.changePercent);

      const threshold =
        Number(config.changePercent || 20);

      return {
        detected:
          Number.isFinite(change) &&
          Math.abs(change) >= threshold,
        confidence:
          Number.isFinite(change)
            ? Math.min(1, Math.abs(change) / Math.max(threshold, 1))
            : 0,
        evidence: {
          changePercent:
            change,
          threshold
        }
      };
    }

    if (rule.method === "variance_severity") {
      const severities = ["low", "moderate", "high", "critical"];
      const minimum =
        severities.indexOf(config.minimumSeverity || "high");

      const current =
        severities.indexOf(context.severity);

      return {
        detected:
          current >= minimum &&
          current >= 0,
        confidence:
          current >= 0
            ? (current + 1) / severities.length
            : 0,
        evidence: {
          severity:
            context.severity,
          minimumSeverity:
            config.minimumSeverity || "high"
        }
      };
    }

    if (rule.method === "benchmark_breach") {
      return {
        detected:
          context.position === "below_benchmark",
        confidence:
          Math.min(
            1,
            Math.abs(Number(context.variancePercent || 0)) /
            Number(config.fullConfidenceAtPercent || 25)
          ),
        evidence: {
          position:
            context.position,
          variancePercent:
            context.variancePercent
        }
      };
    }

    if (rule.method === "domain_contradiction") {
      const left =
        Number(context.leftValue);
      const right =
        Number(context.rightValue);

      const detected =
        Number.isFinite(left) &&
        Number.isFinite(right) &&
        (
          config.relationship === "same_direction"
            ? Math.sign(left) !== Math.sign(right)
            : Math.sign(left) === Math.sign(right)
        );

      return {
        detected,
        confidence:
          detected ? 0.8 : 0,
        evidence: {
          leftValue: left,
          rightValue: right,
          relationship:
            config.relationship
        }
      };
    }

    return {
      detected: false,
      confidence: 0,
      evidence: {}
    };
  }

  global.INFINICUS.BI.detectionRuleEvaluator =
    Object.freeze({ evaluate });
})(window);

/* --- business-intelligence/INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine/src/detection/signal-prioritizer.js --- */
(function (global) {
  "use strict";

  const SEVERITY_WEIGHT = Object.freeze({
    info: 1,
    opportunity: 2,
    warning: 3,
    critical: 4
  });

  function prioritize(signals = []) {
    const unique = new Map();

    for (const signal of signals) {
      const key = [
        signal.code,
        signal.metricCode,
        signal.sourceBlock
      ].join("|");

      const existing = unique.get(key);

      if (
        !existing ||
        Number(signal.priorityScore) >
        Number(existing.priorityScore)
      ) {
        unique.set(key, signal);
      }
    }

    return [...unique.values()]
      .sort((a, b) =>
        Number(b.priorityScore) -
        Number(a.priorityScore)
      );
  }

  function score(severity, confidence) {
    return Number((
      (SEVERITY_WEIGHT[severity] || 1) *
      Math.max(0, Math.min(1, Number(confidence || 0))) *
      25
    ).toFixed(2));
  }

  global.INFINICUS.BI.signalPrioritizer =
    Object.freeze({
      SEVERITY_WEIGHT,
      prioritize,
      score
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine/src/storage/anomaly-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_ANOMALY_SIGNALS";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["rules", "detectionRuleId"],
          ["detection_runs", "detectionRunId"],
          ["signals", "businessSignalId"],
          ["investigation_queue", "investigationItemId"],
          ["root_cause_handoffs", "rootCauseHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ANOMALY_STORAGE_ERROR",
        error?.message || "Anomaly storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ANOMALY_RECORD_NOT_FOUND",
            "Anomaly record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ANOMALY_STORAGE_ERROR",
        error?.message || "Anomaly retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "ANOMALY_STORAGE_ERROR",
        error?.message || "Anomaly listing failed."
      );
    }
  }

  global.INFINICUS.BI.anomalyStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-20-Anomaly-Business-Signal-Detection-Engine/src/engine/anomaly-signal-detection-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerRule(input = {}) {
    const built =
      global.INFINICUS.BI
        .detectionRuleModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .anomalyStore
        .put("rules", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.detection_rule.registered",
        stored.data
      );
    }

    return stored;
  }

  async function detect({
    anomalyHandoffId,
    statisticalInputs = [],
    contradictionInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .trendVarianceBenchmarkEngine
        .getAnomalyHandoff({
          anomalyHandoffId
        });

    if (!handoff.ok) return handoff;

    const allRules =
      await global.INFINICUS.BI
        .anomalyStore
        .list("rules");

    if (!allRules.ok) return allRules;

    const rules =
      allRules.data.filter(rule =>
        rule.status === "active"
      );

    const candidateSignals = [];

    for (const rule of rules) {
      const contexts = [];

      if (rule.method === "z_score") {
        contexts.push(
          ...statisticalInputs
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "sudden_change") {
        contexts.push(
          ...handoff.data.trends
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "variance_severity") {
        contexts.push(
          ...handoff.data.variances
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "benchmark_breach") {
        contexts.push(
          ...handoff.data.benchmarks
            .filter(item =>
              !rule.metricCode ||
              item.metricCode === rule.metricCode
            )
        );
      }

      if (rule.method === "domain_contradiction") {
        contexts.push(...contradictionInputs);
      }

      for (const context of contexts) {
        const outcome =
          global.INFINICUS.BI
            .detectionRuleEvaluator
            .evaluate(rule, context);

        if (!outcome.detected) continue;

        const code =
          `${rule.method.toUpperCase()}_${String(
            context.metricCode ||
            rule.metricCode ||
            "BUSINESS_SIGNAL"
          ).toUpperCase()}`;

        const priorityScore =
          global.INFINICUS.BI
            .signalPrioritizer
            .score(
              rule.severity,
              outcome.confidence
            );

        candidateSignals.push({
          businessSignalId:
            runtime.createId("bi_business_signal"),
          detectionRuleId:
            rule.detectionRuleId,
          anomalyHandoffId,
          sourceBlock:
            rule.sourceBlock ||
            context.sourceBlock ||
            "BI-19",
          metricCode:
            context.metricCode ||
            rule.metricCode ||
            null,
          code,
          severity:
            rule.severity,
          confidence:
            Number(outcome.confidence.toFixed(4)),
          priorityScore,
          evidence:
            runtime.clone(outcome.evidence),
          status: "open",
          detectedAt:
            new Date().toISOString()
        });
      }
    }

    const prioritized =
      global.INFINICUS.BI
        .signalPrioritizer
        .prioritize(candidateSignals);

    for (const signal of prioritized) {
      await global.INFINICUS.BI
        .anomalyStore
        .put("signals", signal);
    }

    const investigationQueue =
      prioritized.map((signal, index) => ({
        investigationItemId:
          runtime.createId("bi_investigation"),
        businessSignalId:
          signal.businessSignalId,
        priority:
          index + 1,
        severity:
          signal.severity,
        confidence:
          signal.confidence,
        priorityScore:
          signal.priorityScore,
        status:
          "pending_investigation",
        createdAt:
          new Date().toISOString()
      }));

    for (const item of investigationQueue) {
      await global.INFINICUS.BI
        .anomalyStore
        .put("investigation_queue", item);
    }

    const detectionRun = {
      detectionRunId:
        runtime.createId("bi_detection_run"),
      anomalyHandoffId,
      analysisRunId:
        handoff.data.analysisRunId,
      correlationId:
        handoff.data.correlationId,
      ruleCount:
        rules.length,
      candidateSignalCount:
        candidateSignals.length,
      prioritizedSignalCount:
        prioritized.length,
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .anomalyStore
      .put("detection_runs", detectionRun);

    const rootCauseHandoff = {
      rootCauseHandoffId:
        runtime.createId("bi_root_cause_handoff"),
      targetBlock: "BI-21",
      detectionRunId:
        detectionRun.detectionRunId,
      analysisRunId:
        detectionRun.analysisRunId,
      correlationId:
        detectionRun.correlationId,
      signals:
        prioritized.map(runtime.clone),
      investigationQueue:
        investigationQueue.map(runtime.clone),
      domains:
        handoff.data.domains.map(runtime.clone),
      trends:
        handoff.data.trends.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      benchmarks:
        handoff.data.benchmarks.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .anomalyStore
      .put("root_cause_handoffs", rootCauseHandoff);

    await runtime.emit(
      "bi.anomaly_signal_detection.completed",
      {
        detectionRun,
        rootCauseHandoffId:
          rootCauseHandoff.rootCauseHandoffId
      }
    );

    return runtime.success({
      detectionRun,
      signals:
        prioritized,
      investigationQueue,
      rootCauseHandoff
    });
  }

  const api = Object.freeze({
    registerRule,
    detect,
    getDetectionRun: ({ detectionRunId }) =>
      global.INFINICUS.BI
        .anomalyStore
        .get("detection_runs", detectionRunId),
    getRootCauseHandoff: ({ rootCauseHandoffId }) =>
      global.INFINICUS.BI
        .anomalyStore
        .get("root_cause_handoffs", rootCauseHandoffId),
    listSignals: () =>
      global.INFINICUS.BI
        .anomalyStore
        .list("signals"),
    listInvestigationQueue: () =>
      global.INFINICUS.BI
        .anomalyStore
        .list("investigation_queue")
  });

  runtime.registerService(
    "bi.anomaly_signal_detection",
    api,
    { block: "BI-20" }
  );

  runtime.registerRoute(
    "bi.detection_rule.register",
    registerRule
  );

  runtime.registerRoute(
    "bi.anomaly_signal_detection.detect",
    detect
  );

  global.INFINICUS.BI.anomalySignalDetectionEngine = api;
})(window);

/* ===== INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-21.");
  }

  if (!BI?.anomalySignalDetectionEngine) {
    throw new Error("INFINICUS BI-20 must be loaded before BI-21.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/model/investigation-case.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.businessSignalId || !input.problemStatement) {
      return runtime.failure(
        "INVESTIGATION_CASE_INVALID",
        "businessSignalId and problemStatement are required."
      );
    }

    return runtime.success({
      investigationCaseId:
        input.investigationCaseId ||
        runtime.createId("bi_investigation_case"),
      businessSignalId:
        String(input.businessSignalId),
      problemStatement:
        String(input.problemStatement),
      scope:
        runtime.clone(input.scope || {}),
      assumptions:
        runtime.clone(input.assumptions || []),
      confounders:
        runtime.clone(input.confounders || []),
      status:
        String(input.status || "open"),
      owner:
        String(input.owner || ""),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.investigationCaseModel =
    Object.freeze({ create });
})(window);

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/model/driver-candidate.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.investigationCaseId || !input.name) {
      return runtime.failure(
        "DRIVER_CANDIDATE_INVALID",
        "investigationCaseId and name are required."
      );
    }

    return runtime.success({
      driverCandidateId:
        input.driverCandidateId ||
        runtime.createId("bi_driver_candidate"),
      investigationCaseId:
        String(input.investigationCaseId),
      name:
        String(input.name),
      category:
        String(input.category || "unknown"),
      direction:
        String(input.direction || "unknown"),
      evidence:
        runtime.clone(input.evidence || []),
      counterEvidence:
        runtime.clone(input.counterEvidence || []),
      fiveWhys:
        runtime.clone(input.fiveWhys || []),
      status:
        String(input.status || "hypothesis"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.driverCandidateModel =
    Object.freeze({ create });
})(window);

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/analysis/evidence-scorer.js --- */
(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(1, Number(value || 0)));
  }

  function score(evidence = [], counterEvidence = []) {
    const positive =
      evidence.reduce(
        (sum, item) =>
          sum +
          clamp(item.reliability ?? 0.5) *
          clamp(item.relevance ?? 0.5),
        0
      );

    const negative =
      counterEvidence.reduce(
        (sum, item) =>
          sum +
          clamp(item.reliability ?? 0.5) *
          clamp(item.relevance ?? 0.5),
        0
      );

    const totalWeight =
      positive + negative;

    const confidence =
      totalWeight === 0
        ? 0
        : positive / totalWeight;

    return {
      positiveWeight:
        Number(positive.toFixed(4)),
      counterWeight:
        Number(negative.toFixed(4)),
      confidence:
        Number(confidence.toFixed(4)),
      evidenceCount:
        evidence.length,
      counterEvidenceCount:
        counterEvidence.length
    };
  }

  global.INFINICUS.BI.rootCauseEvidenceScorer =
    Object.freeze({ score });
})(window);

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/analysis/driver-ranker.js --- */
(function (global) {
  "use strict";

  function rank(candidates = []) {
    return candidates
      .map(candidate => {
        const evidenceScore =
          global.INFINICUS.BI
            .rootCauseEvidenceScorer
            .score(
              candidate.evidence,
              candidate.counterEvidence
            );

        const contribution =
          Number(candidate.contributionScore || 0);

        const confidence =
          evidenceScore.confidence * 0.7 +
          Math.max(0, Math.min(1, contribution)) * 0.3;

        return {
          ...structuredClone(candidate),
          evidenceScore,
          confidence:
            Number(confidence.toFixed(4))
        };
      })
      .sort((a, b) =>
        b.confidence - a.confidence
      )
      .map((candidate, index) => ({
        rank: index + 1,
        ...candidate
      }));
  }

  global.INFINICUS.BI.rootCauseDriverRanker =
    Object.freeze({ rank });
})(window);

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/analysis/cause-graph.js --- */
(function (global) {
  "use strict";

  function build(signal, rankedDrivers = []) {
    const nodes = [
      {
        id: signal.businessSignalId,
        type: "signal",
        label: signal.code
      }
    ];

    const edges = [];

    for (const driver of rankedDrivers) {
      nodes.push({
        id: driver.driverCandidateId,
        type: "driver",
        label: driver.name,
        confidence: driver.confidence
      });

      edges.push({
        from: driver.driverCandidateId,
        to: signal.businessSignalId,
        relationship: "contributes_to",
        confidence: driver.confidence
      });
    }

    return { nodes, edges };
  }

  global.INFINICUS.BI.rootCauseGraphBuilder =
    Object.freeze({ build });
})(window);

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/storage/root-cause-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_ROOT_CAUSE_ANALYSIS";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["cases", "investigationCaseId"],
          ["drivers", "driverCandidateId"],
          ["analysis_runs", "rootCauseAnalysisId"],
          ["unresolved", "unresolvedHypothesisId"],
          ["reporting_handoffs", "reportingHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(
        tx.objectStore(storeName).put(structuredClone(record))
      );
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ROOT_CAUSE_STORAGE_ERROR",
        error?.message || "Root-cause storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ROOT_CAUSE_RECORD_NOT_FOUND",
            "Root-cause record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ROOT_CAUSE_STORAGE_ERROR",
        error?.message || "Root-cause retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(
        tx.objectStore(storeName).getAll()
      );
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "ROOT_CAUSE_STORAGE_ERROR",
        error?.message || "Root-cause listing failed."
      );
    }
  }

  global.INFINICUS.BI.rootCauseStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-21-Root-Cause-Driver-Analysis-Engine/src/engine/root-cause-driver-analysis-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function createCase(input = {}) {
    const built =
      global.INFINICUS.BI
        .investigationCaseModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .rootCauseStore
        .put("cases", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.investigation_case.created",
        stored.data
      );
    }

    return stored;
  }

  async function registerDriver(input = {}) {
    const investigation =
      await global.INFINICUS.BI
        .rootCauseStore
        .get(
          "cases",
          input.investigationCaseId
        );

    if (!investigation.ok) {
      return investigation;
    }

    const built =
      global.INFINICUS.BI
        .driverCandidateModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .rootCauseStore
        .put("drivers", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.driver_candidate.registered",
        stored.data
      );
    }

    return stored;
  }

  async function analyze({
    rootCauseHandoffId,
    investigationCaseId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .anomalySignalDetectionEngine
        .getRootCauseHandoff({
          rootCauseHandoffId
        });

    if (!handoff.ok) return handoff;

    const investigation =
      await global.INFINICUS.BI
        .rootCauseStore
        .get(
          "cases",
          investigationCaseId
        );

    if (!investigation.ok) {
      return investigation;
    }

    const allDrivers =
      await global.INFINICUS.BI
        .rootCauseStore
        .list("drivers");

    if (!allDrivers.ok) return allDrivers;

    const drivers =
      allDrivers.data.filter(driver =>
        driver.investigationCaseId ===
        investigationCaseId
      );

    const signal =
      handoff.data.signals.find(item =>
        item.businessSignalId ===
        investigation.data.businessSignalId
      );

    if (!signal) {
      return runtime.failure(
        "INVESTIGATION_SIGNAL_NOT_FOUND",
        "The investigation signal was not found in the BI-20 handoff."
      );
    }

    const ranked =
      global.INFINICUS.BI
        .rootCauseDriverRanker
        .rank(drivers);

    const causeGraph =
      global.INFINICUS.BI
        .rootCauseGraphBuilder
        .build(signal, ranked);

    const confirmed =
      ranked.filter(driver =>
        driver.confidence >= 0.75
      );

    const probable =
      ranked.filter(driver =>
        driver.confidence >= 0.5 &&
        driver.confidence < 0.75
      );

    const unresolved =
      ranked.filter(driver =>
        driver.confidence < 0.5
      );

    const unresolvedRecords = [];

    for (const driver of unresolved) {
      const item = {
        unresolvedHypothesisId:
          runtime.createId("bi_unresolved_hypothesis"),
        investigationCaseId,
        driverCandidateId:
          driver.driverCandidateId,
        name:
          driver.name,
        confidence:
          driver.confidence,
        status:
          "additional_evidence_required",
        createdAt:
          new Date().toISOString()
      };

      unresolvedRecords.push(item);

      await global.INFINICUS.BI
        .rootCauseStore
        .put("unresolved", item);
    }

    const rootCauseAnalysis = {
      rootCauseAnalysisId:
        runtime.createId("bi_root_cause_analysis"),
      rootCauseHandoffId,
      investigationCaseId,
      businessSignalId:
        signal.businessSignalId,
      correlationId:
        handoff.data.correlationId,
      signal:
        runtime.clone(signal),
      confirmedDrivers:
        confirmed.map(runtime.clone),
      probableDrivers:
        probable.map(runtime.clone),
      unresolvedDrivers:
        unresolved.map(runtime.clone),
      causeGraph:
        runtime.clone(causeGraph),
      confounders:
        runtime.clone(
          investigation.data.confounders
        ),
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .rootCauseStore
      .put(
        "analysis_runs",
        rootCauseAnalysis
      );

    const reportingHandoff = {
      reportingHandoffId:
        runtime.createId("bi_reporting_handoff"),
      targetBlock: "BI-22",
      sourceBlock: "BI-21",
      rootCauseAnalysisId:
        rootCauseAnalysis.rootCauseAnalysisId,
      investigationCaseId,
      businessSignalId:
        signal.businessSignalId,
      correlationId:
        rootCauseAnalysis.correlationId,
      signal:
        runtime.clone(signal),
      rankedDrivers:
        ranked.map(runtime.clone),
      causeGraph:
        runtime.clone(causeGraph),
      unresolvedHypotheses:
        unresolvedRecords.map(runtime.clone),
      supportingContext: {
        domains:
          handoff.data.domains.map(runtime.clone),
        trends:
          handoff.data.trends.map(runtime.clone),
        variances:
          handoff.data.variances.map(runtime.clone),
        benchmarks:
          handoff.data.benchmarks.map(runtime.clone)
      },
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .rootCauseStore
      .put(
        "reporting_handoffs",
        reportingHandoff
      );

    await runtime.emit(
      "bi.root_cause_analysis.completed",
      {
        rootCauseAnalysis,
        reportingHandoffId:
          reportingHandoff.reportingHandoffId
      }
    );

    return runtime.success({
      rootCauseAnalysis,
      reportingHandoff
    });
  }

  const api = Object.freeze({
    createCase,
    registerDriver,
    analyze,
    getAnalysis: ({ rootCauseAnalysisId }) =>
      global.INFINICUS.BI
        .rootCauseStore
        .get(
          "analysis_runs",
          rootCauseAnalysisId
        ),
    getReportingHandoff: ({ reportingHandoffId }) =>
      global.INFINICUS.BI
        .rootCauseStore
        .get(
          "reporting_handoffs",
          reportingHandoffId
        ),
    listUnresolvedHypotheses: () =>
      global.INFINICUS.BI
        .rootCauseStore
        .list("unresolved")
  });

  runtime.registerService(
    "bi.root_cause_driver_analysis",
    api,
    { block: "BI-21" }
  );

  runtime.registerRoute(
    "bi.investigation_case.create",
    createCase
  );

  runtime.registerRoute(
    "bi.driver_candidate.register",
    registerDriver
  );

  runtime.registerRoute(
    "bi.root_cause_driver_analysis.analyze",
    analyze
  );

  global.INFINICUS.BI.rootCauseDriverAnalysisEngine = api;
})(window);

/* ===== INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-22.");
  }

  if (!BI?.rootCauseDriverAnalysisEngine) {
    throw new Error("INFINICUS BI-21 must be loaded before BI-22.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/model/dashboard-definition.js --- */
(function (global) {
  "use strict";

  const WIDGET_TYPES = Object.freeze([
    "metric_card",
    "line_chart",
    "bar_chart",
    "area_chart",
    "table",
    "ranking",
    "signal_list",
    "root_cause_graph",
    "text_summary"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.name || !Array.isArray(input.widgets)) {
      return runtime.failure(
        "DASHBOARD_DEFINITION_INVALID",
        "name and widgets are required."
      );
    }

    const widgets = input.widgets.map(widget => ({
      widgetId:
        widget.widgetId ||
        runtime.createId("bi_widget"),
      title:
        String(widget.title || ""),
      type:
        WIDGET_TYPES.includes(widget.type)
          ? widget.type
          : "table",
      dataSource:
        runtime.clone(widget.dataSource || {}),
      configuration:
        runtime.clone(widget.configuration || {}),
      position:
        runtime.clone(widget.position || {})
    }));

    return runtime.success({
      dashboardId:
        input.dashboardId ||
        runtime.createId("bi_dashboard"),
      name:
        String(input.name),
      description:
        String(input.description || ""),
      audience:
        String(input.audience || "general"),
      filters:
        runtime.clone(input.filters || []),
      drillPaths:
        runtime.clone(input.drillPaths || []),
      widgets,
      refreshPolicy:
        runtime.clone(input.refreshPolicy || {}),
      status:
        String(input.status || "draft"),
      version:
        Math.max(1, Number(input.version || 1)),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.dashboardDefinitionModel =
    Object.freeze({
      WIDGET_TYPES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/model/report-definition.js --- */
(function (global) {
  "use strict";

  const REPORT_TYPES = Object.freeze([
    "executive",
    "operational",
    "financial",
    "sales",
    "customer",
    "marketing",
    "inventory",
    "workforce",
    "market",
    "investigation"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const reportType =
      String(input.reportType || "executive");

    if (
      !input.name ||
      !REPORT_TYPES.includes(reportType)
    ) {
      return runtime.failure(
        "REPORT_DEFINITION_INVALID",
        "name and a supported reportType are required."
      );
    }

    return runtime.success({
      reportId:
        input.reportId ||
        runtime.createId("bi_report"),
      name:
        String(input.name),
      reportType,
      description:
        String(input.description || ""),
      sections:
        runtime.clone(input.sections || []),
      filters:
        runtime.clone(input.filters || []),
      audience:
        String(input.audience || "management"),
      exportFormats:
        Array.isArray(input.exportFormats)
          ? input.exportFormats.map(String)
          : ["json"],
      status:
        String(input.status || "draft"),
      version:
        Math.max(1, Number(input.version || 1)),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.reportDefinitionModel =
    Object.freeze({
      REPORT_TYPES,
      create
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/reporting/executive-summary.js --- */
(function (global) {
  "use strict";

  function build(context = {}) {
    const signals =
      context.signal
        ? [context.signal]
        : context.signals || [];

    const topDrivers =
      (context.rankedDrivers || [])
        .slice(0, 3)
        .map(driver => ({
          name: driver.name,
          confidence: driver.confidence
        }));

    return {
      headline:
        context.headline ||
        signals[0]?.code ||
        "Business intelligence summary",
      status:
        signals[0]?.severity || "information",
      keyFindings: [
        ...signals.slice(0, 3).map(signal => ({
          type: "signal",
          text:
            `${signal.code}: ${signal.severity}`
        })),
        ...topDrivers.map(driver => ({
          type: "driver",
          text:
            `${driver.name} (${Math.round(driver.confidence * 100)}% confidence)`
        }))
      ],
      unresolvedCount:
        context.unresolvedHypotheses?.length || 0,
      generatedAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.executiveSummaryBuilder =
    Object.freeze({ build });
})(window);

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/reporting/widget-renderer.js --- */
(function (global) {
  "use strict";

  function resolve(widget, context = {}) {
    const source =
      widget.dataSource || {};

    if (source.path) {
      return String(source.path)
        .split(".")
        .reduce(
          (value, key) => value?.[key],
          context
        );
    }

    if (source.value !== undefined) {
      return source.value;
    }

    return null;
  }

  function render(widget, context = {}) {
    return {
      widgetId:
        widget.widgetId,
      title:
        widget.title,
      type:
        widget.type,
      data:
        structuredClone(resolve(widget, context)),
      configuration:
        structuredClone(widget.configuration),
      renderedAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.reportingWidgetRenderer =
    Object.freeze({
      resolve,
      render
    });
})(window);

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/reporting/exploration-publisher.js --- */
(function (global) {
  "use strict";

  function publish(context = {}, fields = []) {
    const rows =
      Array.isArray(context.rows)
        ? context.rows
        : [];

    const projected =
      fields.length
        ? rows.map(row =>
            Object.fromEntries(
              fields.map(field => [
                field,
                row[field]
              ])
            )
          )
        : rows.map(structuredClone);

    return {
      explorationDatasetId:
        global.INFINICUS.BI.runtime
          .createId("bi_exploration_dataset"),
      fields:
        fields.length
          ? [...fields]
          : [...new Set(
              projected.flatMap(row =>
                Object.keys(row)
              )
            )],
      rows:
        projected,
      rowCount:
        projected.length,
      createdAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.explorationDatasetPublisher =
    Object.freeze({ publish });
})(window);

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/storage/reporting-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;
  const DB_NAME = "INFINICUS_BI_REPORTING";
  let dbPromise;

  const request = req => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        const db = req.result;

        for (const [name, keyPath] of [
          ["dashboards", "dashboardId"],
          ["reports", "reportId"],
          ["snapshots", "reportSnapshotId"],
          ["exploration_datasets", "explorationDatasetId"],
          ["distribution_handoffs", "distributionHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath });
          }
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName, record) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readwrite");
      await request(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "REPORTING_STORAGE_ERROR",
        error?.message || "Reporting storage failed."
      );
    }
  }

  async function get(storeName, id) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const value = await request(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "REPORTING_RECORD_NOT_FOUND",
            "Reporting record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "REPORTING_STORAGE_ERROR",
        error?.message || "Reporting retrieval failed."
      );
    }
  }

  async function list(storeName) {
    try {
      const db = await open();
      const tx = db.transaction(storeName, "readonly");
      const values = await request(
        tx.objectStore(storeName).getAll()
      );
      return runtime.success(values.map(structuredClone));
    } catch (error) {
      return runtime.failure(
        "REPORTING_STORAGE_ERROR",
        error?.message || "Reporting listing failed."
      );
    }
  }

  global.INFINICUS.BI.reportingStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- business-intelligence/INFINICUS-BI-22-Dashboard-Reporting-Data-Exploration-Engine/src/engine/reporting-exploration-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerDashboard(input = {}) {
    const built =
      global.INFINICUS.BI
        .dashboardDefinitionModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .reportingStore
        .put("dashboards", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.dashboard.registered",
        stored.data
      );
    }

    return stored;
  }

  async function registerReport(input = {}) {
    const built =
      global.INFINICUS.BI
        .reportDefinitionModel
        .create(input);

    if (!built.ok) return built;

    const stored =
      await global.INFINICUS.BI
        .reportingStore
        .put("reports", built.data);

    if (stored.ok) {
      await runtime.emit(
        "bi.report.registered",
        stored.data
      );
    }

    return stored;
  }

  async function renderDashboard({
    dashboardId,
    context = {}
  } = {}) {
    const dashboard =
      await global.INFINICUS.BI
        .reportingStore
        .get("dashboards", dashboardId);

    if (!dashboard.ok) return dashboard;

    const renderedWidgets =
      dashboard.data.widgets.map(widget =>
        global.INFINICUS.BI
          .reportingWidgetRenderer
          .render(widget, context)
      );

    return runtime.success({
      dashboardId,
      name:
        dashboard.data.name,
      filters:
        runtime.clone(dashboard.data.filters),
      drillPaths:
        runtime.clone(dashboard.data.drillPaths),
      widgets:
        renderedWidgets,
      renderedAt:
        new Date().toISOString()
    });
  }

  async function generateReport({
    reportId,
    reportingHandoffId,
    explorationRows = []
  } = {}) {
    const report =
      await global.INFINICUS.BI
        .reportingStore
        .get("reports", reportId);

    if (!report.ok) return report;

    const handoff =
      await global.INFINICUS.BI
        .rootCauseDriverAnalysisEngine
        .getReportingHandoff({
          reportingHandoffId
        });

    if (!handoff.ok) return handoff;

    const summary =
      global.INFINICUS.BI
        .executiveSummaryBuilder
        .build(handoff.data);

    const explorationDataset =
      global.INFINICUS.BI
        .explorationDatasetPublisher
        .publish(
          { rows: explorationRows },
          []
        );

    await global.INFINICUS.BI
      .reportingStore
      .put(
        "exploration_datasets",
        explorationDataset
      );

    const reportSnapshot = {
      reportSnapshotId:
        runtime.createId("bi_report_snapshot"),
      reportId,
      reportingHandoffId,
      rootCauseAnalysisId:
        handoff.data.rootCauseAnalysisId,
      correlationId:
        handoff.data.correlationId,
      reportType:
        report.data.reportType,
      title:
        report.data.name,
      summary,
      sections:
        runtime.clone(report.data.sections),
      signal:
        runtime.clone(handoff.data.signal),
      rankedDrivers:
        handoff.data.rankedDrivers.map(runtime.clone),
      causeGraph:
        runtime.clone(handoff.data.causeGraph),
      unresolvedHypotheses:
        handoff.data.unresolvedHypotheses.map(runtime.clone),
      explorationDatasetId:
        explorationDataset.explorationDatasetId,
      status: "generated",
      generatedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .reportingStore
      .put("snapshots", reportSnapshot);

    const distributionHandoff = {
      distributionHandoffId:
        runtime.createId("bi_distribution_handoff"),
      targetBlock: "BI-23",
      reportSnapshotId:
        reportSnapshot.reportSnapshotId,
      reportId,
      correlationId:
        reportSnapshot.correlationId,
      title:
        reportSnapshot.title,
      summary:
        runtime.clone(reportSnapshot.summary),
      severity:
        reportSnapshot.signal?.severity || "information",
      audience:
        report.data.audience,
      exportFormats:
        [...report.data.exportFormats],
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .reportingStore
      .put(
        "distribution_handoffs",
        distributionHandoff
      );

    await runtime.emit(
      "bi.report.generated",
      {
        reportSnapshot,
        distributionHandoffId:
          distributionHandoff.distributionHandoffId
      }
    );

    return runtime.success({
      reportSnapshot,
      explorationDataset,
      distributionHandoff
    });
  }

  const api = Object.freeze({
    registerDashboard,
    registerReport,
    renderDashboard,
    generateReport,
    getReportSnapshot: ({ reportSnapshotId }) =>
      global.INFINICUS.BI
        .reportingStore
        .get("snapshots", reportSnapshotId),
    getDistributionHandoff: ({ distributionHandoffId }) =>
      global.INFINICUS.BI
        .reportingStore
        .get(
          "distribution_handoffs",
          distributionHandoffId
        ),
    getExplorationDataset: ({ explorationDatasetId }) =>
      global.INFINICUS.BI
        .reportingStore
        .get(
          "exploration_datasets",
          explorationDatasetId
        )
  });

  runtime.registerService(
    "bi.reporting_exploration",
    api,
    { block: "BI-22" }
  );

  runtime.registerRoute(
    "bi.dashboard.register",
    registerDashboard
  );

  runtime.registerRoute(
    "bi.report.register",
    registerReport
  );

  runtime.registerRoute(
    "bi.dashboard.render",
    renderDashboard
  );

  runtime.registerRoute(
    "bi.report.generate",
    generateReport
  );

  global.INFINICUS.BI.reportingExplorationEngine = api;
})(window);

/* ===== INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const BI=global.INFINICUS?.BI;
  if(!BI?.runtime) throw new Error("BI-01 must be loaded before BI-23.");
  if(!BI?.reportingExplorationEngine){
    throw new Error("BI-22 must be loaded before BI-23.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine/src/model/distribution-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "BI_DISTRIBUTION_POLICY_INVALID",
        "Policy name and code are required."
      );
    }

    return runtime.success({
      distributionPolicyId:
        input.distributionPolicyId ||
        runtime.createId("bi_distribution_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumSeverity:String(input.minimumSeverity || "information"),
      allowedChannelCodes:runtime.clone(input.allowedChannelCodes || []),
      acknowledgementRequired:Boolean(input.acknowledgementRequired),
      acknowledgementDeadlineMinutes:
        Math.max(1,Number(input.acknowledgementDeadlineMinutes || 120)),
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      retryBackoffSeconds:
        Math.max(1,Number(input.retryBackoffSeconds || 60)),
      escalationAudienceIds:
        runtime.clone(input.escalationAudienceIds || []),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.distributionPolicyModel=Object.freeze({create});
})(window);

/* --- business-intelligence/INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine/src/model/distribution-channel.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.code || !input.channelType){
      return runtime.failure(
        "BI_DISTRIBUTION_CHANNEL_INVALID",
        "Channel name, code, and type are required."
      );
    }

    return runtime.success({
      distributionChannelId:
        input.distributionChannelId ||
        runtime.createId("bi_distribution_channel"),
      name:String(input.name),
      code:String(input.code),
      channelType:String(input.channelType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      supportedFormats:runtime.clone(input.supportedFormats || ["json"]),
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.distributionChannelModel=Object.freeze({create});
})(window);

/* --- business-intelligence/INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine/src/model/audience.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name){
      return runtime.failure(
        "BI_AUDIENCE_INVALID",
        "Audience name is required."
      );
    }

    return runtime.success({
      audienceId:
        input.audienceId ||
        runtime.createId("bi_audience"),
      name:String(input.name),
      recipientReferences:runtime.clone(input.recipientReferences || []),
      roleCodes:runtime.clone(input.roleCodes || []),
      classificationMaximum:
        String(input.classificationMaximum || "internal"),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.audienceModel=Object.freeze({create});
})(window);

/* --- business-intelligence/INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine/src/validation/distribution-validator.js --- */
(function(global){
  "use strict";

  const severityRank={
    information:1,
    low:2,
    medium:3,
    high:4,
    critical:5
  };

  function validate({handoff,policy,channel,audience}){
    const issues=[];

    if(policy.status!=="active") issues.push("Distribution policy is inactive.");
    if(channel.status!=="active") issues.push("Distribution channel is inactive.");
    if(!["healthy","degraded"].includes(channel.healthStatus)){
      issues.push("Distribution channel is not healthy.");
    }
    if(audience.status!=="active") issues.push("Audience is inactive.");

    if(
      severityRank[handoff.severity || "information"] <
      severityRank[policy.minimumSeverity || "information"]
    ){
      issues.push("Report severity is below policy threshold.");
    }

    if(
      policy.allowedChannelCodes.length &&
      !policy.allowedChannelCodes.includes(channel.code)
    ){
      issues.push("Distribution channel is not allowed by policy.");
    }

    const supported=
      (handoff.exportFormats || []).some(format =>
        channel.supportedFormats.includes(format)
      );

    if((handoff.exportFormats || []).length && !supported){
      issues.push("Channel does not support a requested export format.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.distributionValidator=
    Object.freeze({severityRank,validate});
})(window);

/* --- business-intelligence/INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine/src/storage/distribution-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const DB_NAME="INFINICUS_BI_REPORT_DISTRIBUTION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;
        for(const [name,keyPath] of [
          ["policies","distributionPolicyId"],
          ["channels","distributionChannelId"],
          ["audiences","audienceId"],
          ["templates","notificationTemplateId"],
          ["deliveries","reportDeliveryId"],
          ["acknowledgements","deliveryAcknowledgementId"],
          ["dead_letters","distributionDeadLetterId"],
          ["publication_handoffs","intelligencePublicationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "BI_DISTRIBUTION_STORAGE_ERROR",
        error?.message || "Distribution storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "BI_DISTRIBUTION_RECORD_NOT_FOUND",
            "Distribution record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "BI_DISTRIBUTION_STORAGE_ERROR",
        error?.message || "Distribution retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "BI_DISTRIBUTION_STORAGE_ERROR",
        error?.message || "Distribution listing failed."
      );
    }
  }

  global.INFINICUS.BI.distributionStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- business-intelligence/INFINICUS-BI-23-Alert-Notification-Report-Distribution-Engine/src/engine/alert-notification-distribution-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const senders=new Map();

  async function registerPolicy(input={}){
    const built=global.INFINICUS.BI.distributionPolicyModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.distributionStore.put("policies",built.data);
  }

  async function registerChannel(input={}){
    const built=global.INFINICUS.BI.distributionChannelModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.distributionStore.put("channels",built.data);
  }

  async function registerAudience(input={}){
    const built=global.INFINICUS.BI.audienceModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.distributionStore.put("audiences",built.data);
  }

  function registerSender(channelType,sender){
    if(!channelType || typeof sender!=="function"){
      return runtime.failure(
        "BI_DISTRIBUTION_SENDER_INVALID",
        "Channel type and sender function are required."
      );
    }

    senders.set(channelType,sender);
    return runtime.success({channelType});
  }

  async function distribute({
    distributionHandoffId,
    distributionPolicyId,
    distributionChannelId,
    audienceId
  }={}){
    const handoff=
      await global.INFINICUS.BI.reportingExplorationEngine
        .getDistributionHandoff({distributionHandoffId});

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.BI.distributionStore.get(
        "policies",
        distributionPolicyId
      );
    if(!policy.ok) return policy;

    const channel=
      await global.INFINICUS.BI.distributionStore.get(
        "channels",
        distributionChannelId
      );
    if(!channel.ok) return channel;

    const audience=
      await global.INFINICUS.BI.distributionStore.get(
        "audiences",
        audienceId
      );
    if(!audience.ok) return audience;

    const validation=
      global.INFINICUS.BI.distributionValidator.validate({
        handoff:handoff.data,
        policy:policy.data,
        channel:channel.data,
        audience:audience.data
      });

    if(!validation.valid){
      return runtime.failure(
        "BI_REPORT_DISTRIBUTION_INVALID",
        "Report distribution failed validation.",
        validation
      );
    }

    const sender=senders.get(channel.data.channelType);

    if(!sender){
      return runtime.failure(
        "BI_DISTRIBUTION_SENDER_NOT_FOUND",
        `No sender registered for channel type: ${channel.data.channelType}`
      );
    }

    const envelope={
      reportSnapshotId:handoff.data.reportSnapshotId,
      title:handoff.data.title,
      summary:runtime.clone(handoff.data.summary),
      severity:handoff.data.severity,
      audience:runtime.clone(audience.data),
      exportFormats:runtime.clone(handoff.data.exportFormats),
      correlationId:handoff.data.correlationId,
      sentAt:new Date().toISOString()
    };

    let response;

    try{
      response=await sender(runtime.clone(envelope),{
        channel:runtime.clone(channel.data)
      });
    }catch(error){
      const deadLetter={
        distributionDeadLetterId:
          runtime.createId("bi_distribution_dead_letter"),
        distributionHandoffId,
        reportSnapshotId:handoff.data.reportSnapshotId,
        audienceId,
        distributionChannelId,
        envelope:runtime.clone(envelope),
        errorMessage:error?.message || "Report delivery failed.",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.BI.distributionStore.put(
        "dead_letters",
        deadLetter
      );

      return runtime.failure(
        "BI_REPORT_DELIVERY_FAILED",
        "Report delivery failed.",
        deadLetter
      );
    }

    const delivery={
      reportDeliveryId:runtime.createId("bi_report_delivery"),
      distributionHandoffId,
      reportSnapshotId:handoff.data.reportSnapshotId,
      distributionPolicyId,
      distributionChannelId,
      audienceId,
      response:runtime.clone(response),
      acknowledgementRequired:policy.data.acknowledgementRequired,
      acknowledgementDeadline:
        policy.data.acknowledgementRequired
          ? new Date(
              Date.now()+
              policy.data.acknowledgementDeadlineMinutes*60000
            ).toISOString()
          : null,
      status:"delivered",
      correlationId:handoff.data.correlationId,
      deliveredAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.distributionStore.put(
      "deliveries",
      delivery
    );

    const publicationHandoff={
      intelligencePublicationHandoffId:
        runtime.createId("bi_intelligence_publication_handoff"),
      targetBlock:"BI-24",
      reportSnapshotId:handoff.data.reportSnapshotId,
      reportDeliveryId:delivery.reportDeliveryId,
      title:handoff.data.title,
      summary:runtime.clone(handoff.data.summary),
      severity:handoff.data.severity,
      audience:runtime.clone(handoff.data.audience),
      exportFormats:runtime.clone(handoff.data.exportFormats),
      deliveryEvidence:runtime.clone(delivery),
      correlationId:handoff.data.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.distributionStore.put(
      "publication_handoffs",
      publicationHandoff
    );

    await runtime.emit("bi.report.distributed",{
      delivery,
      intelligencePublicationHandoffId:
        publicationHandoff.intelligencePublicationHandoffId
    });

    return runtime.success({
      delivery,
      intelligencePublicationHandoff:publicationHandoff
    });
  }

  async function acknowledge({
    reportDeliveryId,
    acknowledgedBy,
    note=null
  }={}){
    const delivery=
      await global.INFINICUS.BI.distributionStore.get(
        "deliveries",
        reportDeliveryId
      );
    if(!delivery.ok) return delivery;

    const acknowledgement={
      deliveryAcknowledgementId:
        runtime.createId("bi_delivery_acknowledgement"),
      reportDeliveryId,
      acknowledgedBy:String(acknowledgedBy || "unknown"),
      note,
      correlationId:delivery.data.correlationId,
      acknowledgedAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.distributionStore.put(
      "acknowledgements",
      acknowledgement
    );

    return runtime.success({acknowledgement});
  }

  const api=Object.freeze({
    registerPolicy,
    registerChannel,
    registerAudience,
    registerSender,
    distribute,
    acknowledge,
    getDelivery:({reportDeliveryId}) =>
      global.INFINICUS.BI.distributionStore.get(
        "deliveries",
        reportDeliveryId
      ),
    getIntelligencePublicationHandoff:({
      intelligencePublicationHandoffId
    }) =>
      global.INFINICUS.BI.distributionStore.get(
        "publication_handoffs",
        intelligencePublicationHandoffId
      ),
    listDeadLetters:() =>
      global.INFINICUS.BI.distributionStore.list("dead_letters")
  });

  runtime.registerService(
    "bi.alert_notification_distribution",
    api,
    {block:"BI-23"}
  );

  runtime.registerRoute("bi.distribution_policy.register",registerPolicy);
  runtime.registerRoute("bi.distribution_channel.register",registerChannel);
  runtime.registerRoute("bi.audience.register",registerAudience);
  runtime.registerRoute("bi.report.distribute",distribute);
  runtime.registerRoute("bi.report_delivery.acknowledge",acknowledge);

  global.INFINICUS.BI.alertNotificationDistributionEngine=api;
})(window);

/* ===== INFINICUS-BI-24-Business-Digital-Twin-Publication-Handoff-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-24-Business-Digital-Twin-Publication-Handoff-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const BI=global.INFINICUS?.BI;
  if(!BI?.runtime) throw new Error("BI-01 must be loaded before BI-24.");
  if(!BI?.alertNotificationDistributionEngine){
    throw new Error("BI-23 must be loaded before BI-24.");
  }
})(window);

/* --- business-intelligence/INFINICUS-BI-24-Business-Digital-Twin-Publication-Handoff-Engine/src/model/publication-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_POLICY_INVALID",
        "Policy name and code are required."
      );
    }

    return runtime.success({
      twinPublicationPolicyId:
        input.twinPublicationPolicyId ||
        runtime.createId("bi_twin_publication_policy"),
      name:String(input.name),
      code:String(input.code),
      requireDataQualityMinimum:
        Math.max(0,Math.min(1,Number(input.requireDataQualityMinimum ?? 0.7))),
      requireConfidenceMinimum:
        Math.max(0,Math.min(1,Number(input.requireConfidenceMinimum ?? 0.6))),
      requireLineage:input.requireLineage !== false,
      maximumAttempts:Math.max(1,Number(input.maximumAttempts || 3)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.twinPublicationPolicyModel=
    Object.freeze({create});
})(window);

/* --- business-intelligence/INFINICUS-BI-24-Business-Digital-Twin-Publication-Handoff-Engine/src/model/twin-destination.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.destinationType){
      return runtime.failure(
        "BI_TWIN_DESTINATION_INVALID",
        "Destination name and destination type are required."
      );
    }

    return runtime.success({
      twinDestinationId:
        input.twinDestinationId ||
        runtime.createId("bi_twin_destination"),
      name:String(input.name),
      destinationType:String(input.destinationType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      environment:String(input.environment || "production"),
      region:input.region || null,
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.twinDestinationModel=Object.freeze({create});
})(window);

/* --- business-intelligence/INFINICUS-BI-24-Business-Digital-Twin-Publication-Handoff-Engine/src/validation/twin-publication-validator.js --- */
(function(global){
  "use strict";

  function validate({statePackage,policy,destination}){
    const issues=[];

    if(policy.status!=="active") issues.push("Publication policy is inactive.");
    if(destination.status!=="active") issues.push("Destination is inactive.");
    if(!["healthy","degraded"].includes(destination.healthStatus)){
      issues.push("Business Digital Twin destination is not healthy.");
    }

    if(!statePackage.businessId){
      issues.push("Business ID is required.");
    }

    if(
      Number(statePackage.dataQualityScore ?? 0) <
      policy.requireDataQualityMinimum
    ){
      issues.push("Data-quality score is below publication minimum.");
    }

    if(
      Number(statePackage.confidence ?? 0) <
      policy.requireConfidenceMinimum
    ){
      issues.push("Confidence is below publication minimum.");
    }

    if(
      policy.requireLineage &&
      (!Array.isArray(statePackage.lineage) || !statePackage.lineage.length)
    ){
      issues.push("Intelligence lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.twinPublicationValidator=
    Object.freeze({validate});
})(window);

/* --- business-intelligence/INFINICUS-BI-24-Business-Digital-Twin-Publication-Handoff-Engine/src/storage/twin-publication-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const DB_NAME="INFINICUS_BI_TWIN_PUBLICATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["policies","twinPublicationPolicyId"],
          ["destinations","twinDestinationId"],
          ["state_packages","businessStatePackageId"],
          ["publications","twinPublicationId"],
          ["receipts","twinPublicationReceiptId"],
          ["dead_letters","twinPublicationDeadLetterId"],
          ["integration_handoffs","biIntegrationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="publications"){
              store.createIndex(
                "idempotencyKey",
                "idempotencyKey",
                {unique:true}
              );
            }
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "BI_TWIN_PUBLICATION_RECORD_NOT_FOUND",
            "Twin-publication record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(idempotencyKey){
    try{
      const db=await open();
      const tx=db.transaction("publications","readonly");
      const value=await reqp(
        tx.objectStore("publications")
          .index("idempotencyKey")
          .get(idempotencyKey)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "BI_TWIN_PUBLICATION_NOT_FOUND",
            "Twin publication was not found.",
            {idempotencyKey}
          );
    }catch(error){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "BI_TWIN_PUBLICATION_STORAGE_ERROR",
        error?.message || "Twin-publication listing failed."
      );
    }
  }

  global.INFINICUS.BI.twinPublicationStore=
    Object.freeze({open,put,get,getByIdempotencyKey,list});
})(window);

/* --- business-intelligence/INFINICUS-BI-24-Business-Digital-Twin-Publication-Handoff-Engine/src/engine/digital-twin-publication-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const publishers=new Map();

  async function registerPolicy(input={}){
    const built=global.INFINICUS.BI.twinPublicationPolicyModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.twinPublicationStore.put("policies",built.data);
  }

  async function registerDestination(input={}){
    const built=global.INFINICUS.BI.twinDestinationModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.twinPublicationStore.put("destinations",built.data);
  }

  function registerPublisher(destinationType,publisher){
    if(!destinationType || typeof publisher!=="function"){
      return runtime.failure(
        "BI_TWIN_PUBLISHER_INVALID",
        "Destination type and publisher function are required."
      );
    }

    publishers.set(destinationType,publisher);
    return runtime.success({destinationType});
  }

  async function publish({
    intelligencePublicationHandoffId,
    twinPublicationPolicyId,
    twinDestinationId,
    businessState={}
  }={}){
    const handoff=
      await global.INFINICUS.BI.alertNotificationDistributionEngine
        .getIntelligencePublicationHandoff({
          intelligencePublicationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.BI.twinPublicationStore.get(
        "policies",
        twinPublicationPolicyId
      );
    if(!policy.ok) return policy;

    const destination=
      await global.INFINICUS.BI.twinPublicationStore.get(
        "destinations",
        twinDestinationId
      );
    if(!destination.ok) return destination;

    const statePackage={
      businessStatePackageId:
        runtime.createId("bi_business_state_package"),
      businessId:businessState.businessId || null,
      legalEntityId:businessState.legalEntityId || null,
      reportingPeriod:runtime.clone(businessState.reportingPeriod || {}),
      entityState:runtime.clone(businessState.entityState || {}),
      financialState:runtime.clone(businessState.financialState || {}),
      revenueState:runtime.clone(businessState.revenueState || {}),
      costState:runtime.clone(businessState.costState || {}),
      customerState:runtime.clone(businessState.customerState || {}),
      productState:runtime.clone(businessState.productState || {}),
      operationsState:runtime.clone(businessState.operationsState || {}),
      workforceState:runtime.clone(businessState.workforceState || {}),
      inventoryState:runtime.clone(businessState.inventoryState || {}),
      liquidityState:runtime.clone(businessState.liquidityState || {}),
      trends:runtime.clone(businessState.trends || []),
      anomalies:runtime.clone(businessState.anomalies || []),
      risks:runtime.clone(businessState.risks || []),
      benchmarks:runtime.clone(businessState.benchmarks || []),
      forecastInputs:runtime.clone(businessState.forecastInputs || {}),
      healthScores:runtime.clone(businessState.healthScores || {}),
      reportEvidence:runtime.clone(handoff.data),
      dataQualityScore:Number(businessState.dataQualityScore ?? 0),
      confidence:Number(businessState.confidence ?? 0),
      lineage:runtime.clone(businessState.lineage || []),
      correlationId:handoff.data.correlationId,
      generatedAt:new Date().toISOString()
    };

    const validation=
      global.INFINICUS.BI.twinPublicationValidator.validate({
        statePackage,
        policy:policy.data,
        destination:destination.data
      });

    if(!validation.valid){
      return runtime.failure(
        "BI_TWIN_STATE_PUBLICATION_INVALID",
        "Business state package failed publication validation.",
        validation
      );
    }

    await global.INFINICUS.BI.twinPublicationStore.put(
      "state_packages",
      statePackage
    );

    const idempotencyKey=
      `bi_twin_${statePackage.businessId}_${statePackage.reportingPeriod?.end || statePackage.generatedAt}_${twinDestinationId}`;

    const existing=
      await global.INFINICUS.BI.twinPublicationStore
        .getByIdempotencyKey(idempotencyKey);

    if(existing.ok){
      return runtime.success({
        twinPublication:existing.data,
        idempotentReplay:true
      });
    }

    const publisher=publishers.get(destination.data.destinationType);

    if(!publisher){
      return runtime.failure(
        "BI_TWIN_PUBLISHER_NOT_FOUND",
        `No publisher registered for destination type: ${destination.data.destinationType}`
      );
    }

    let response;

    try{
      response=await publisher(runtime.clone(statePackage),{
        destination:runtime.clone(destination.data),
        idempotencyKey
      });
    }catch(error){
      const deadLetter={
        twinPublicationDeadLetterId:
          runtime.createId("bi_twin_publication_dead_letter"),
        businessStatePackageId:statePackage.businessStatePackageId,
        twinDestinationId,
        idempotencyKey,
        errorMessage:error?.message || "Business Digital Twin publication failed.",
        correlationId:statePackage.correlationId,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.BI.twinPublicationStore.put(
        "dead_letters",
        deadLetter
      );

      return runtime.failure(
        "BI_TWIN_PUBLICATION_FAILED",
        "Business Digital Twin publication failed.",
        deadLetter
      );
    }

    const publication={
      twinPublicationId:runtime.createId("bi_twin_publication"),
      businessStatePackageId:statePackage.businessStatePackageId,
      twinDestinationId,
      idempotencyKey,
      response:runtime.clone(response),
      status:"published",
      correlationId:statePackage.correlationId,
      publishedAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.twinPublicationStore.put(
      "publications",
      publication
    );

    const receipt={
      twinPublicationReceiptId:
        runtime.createId("bi_twin_publication_receipt"),
      twinPublicationId:publication.twinPublicationId,
      acknowledged:response?.acknowledged !== false,
      acknowledgementReference:
        response?.acknowledgementReference || null,
      receivedAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.twinPublicationStore.put(
      "receipts",
      receipt
    );

    const integrationHandoff={
      biIntegrationHandoffId:
        runtime.createId("bi_integration_handoff"),
      targetBlock:"BI-25",
      businessStatePackageId:statePackage.businessStatePackageId,
      twinPublicationId:publication.twinPublicationId,
      twinPublicationReceiptId:receipt.twinPublicationReceiptId,
      businessId:statePackage.businessId,
      reportingPeriod:runtime.clone(statePackage.reportingPeriod),
      dataQualityScore:statePackage.dataQualityScore,
      confidence:statePackage.confidence,
      lineage:statePackage.lineage.map(runtime.clone),
      correlationId:statePackage.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.twinPublicationStore.put(
      "integration_handoffs",
      integrationHandoff
    );

    await runtime.emit("bi.digital_twin_state.published",{
      publication,
      receipt,
      biIntegrationHandoffId:
        integrationHandoff.biIntegrationHandoffId
    });

    return runtime.success({
      businessStatePackage:statePackage,
      twinPublication:publication,
      twinPublicationReceipt:receipt,
      biIntegrationHandoff:integrationHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerDestination,
    registerPublisher,
    publish,
    getBusinessStatePackage:({businessStatePackageId}) =>
      global.INFINICUS.BI.twinPublicationStore.get(
        "state_packages",
        businessStatePackageId
      ),
    getBIIntegrationHandoff:({biIntegrationHandoffId}) =>
      global.INFINICUS.BI.twinPublicationStore.get(
        "integration_handoffs",
        biIntegrationHandoffId
      ),
    listDeadLetters:() =>
      global.INFINICUS.BI.twinPublicationStore.list("dead_letters")
  });

  runtime.registerService(
    "bi.digital_twin_publication",
    api,
    {block:"BI-24"}
  );

  runtime.registerRoute("bi.twin_publication_policy.register",registerPolicy);
  runtime.registerRoute("bi.twin_destination.register",registerDestination);
  runtime.registerRoute("bi.digital_twin_state.publish",publish);

  global.INFINICUS.BI.digitalTwinPublicationEngine=api;
})(window);

/* ===== INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine ===== */

/* --- business-intelligence/INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine/src/manifest/block-manifest.js --- */
(function(global){
  "use strict";

  const blocks=[
    ["BI-01","Business Intelligence Core Runtime and Registry","runtime"],
    ["BI-02","Business Data Intake and Validation Engine","dataIntakeEngine"],
    ["BI-03","Business Entity and Master Data Registry","masterDataRegistry"],
    ["BI-04","Data Source, Connector and Integration Registry","connectorRegistry"],
    ["BI-05","Data Mapping and Schema Harmonization Engine","schemaHarmonizationEngine"],
    ["BI-06","Data Quality, Completeness and Reliability Engine","dataQualityEngine"],
    ["BI-07","Business Metric and KPI Definition Engine","metricKPIEngine"],
    ["BI-08","Financial Intelligence Engine","financialIntelligenceEngine"],
    ["BI-09","Revenue, Sales and Growth Intelligence Engine","revenueGrowthIntelligenceEngine"],
    ["BI-10","Cost, Expense and Profitability Intelligence Engine","profitabilityIntelligenceEngine"],
    ["BI-11","Customer and Market Intelligence Engine","customerMarketIntelligenceEngine"],
    ["BI-12","Product and Service Performance Intelligence Engine","productServiceIntelligenceEngine"],
    ["BI-13","Operations and Process Performance Intelligence Engine","operationsIntelligenceEngine"],
    ["BI-14","Workforce and Productivity Intelligence Engine","workforceIntelligenceEngine"],
    ["BI-15","Inventory, Supply and Capacity Intelligence Engine","inventoryCapacityIntelligenceEngine"],
    ["BI-16","Cash Flow, Liquidity and Financial Health Engine","liquidityIntelligenceEngine"],
    ["BI-17","Trend, Pattern and Anomaly Detection Engine","trendAnomalyEngine"],
    ["BI-18","Benchmarking and Comparative Performance Engine","benchmarkingEngine"],
    ["BI-19","Risk, Exposure and Early Warning Intelligence Engine","riskEarlyWarningEngine"],
    ["BI-20","Forecast Input and Assumption Preparation Engine","forecastInputEngine"],
    ["BI-21","Root Cause and Driver Analysis Engine","rootCauseDriverAnalysisEngine"],
    ["BI-22","Dashboard, Reporting and Data Exploration Engine","reportingExplorationEngine"],
    ["BI-23","Alert, Notification and Report Distribution Engine","alertNotificationDistributionEngine"],
    ["BI-24","Business Digital Twin Publication and Handoff Engine","digitalTwinPublicationEngine"]
  ].map(([blockId,name,namespaceKey],index)=>Object.freeze({
    blockId,
    name,
    namespaceKey,
    sequence:index+1,
    required:true
  }));

  global.INFINICUS=global.INFINICUS || {};
  global.INFINICUS.BI=global.INFINICUS.BI || {};
  global.INFINICUS.BI.masterBlockManifest=Object.freeze(blocks);
})(window);

/* --- business-intelligence/INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine/src/validation/config-validator.js --- */
(function(global){
  "use strict";

  function validate(config={}){
    const issues=[];

    if(!["development","staging","production"].includes(config.environment)){
      issues.push("Environment is invalid.");
    }

    if(config.security?.allowBrowserSecrets===true){
      issues.push("Browser-visible secrets are prohibited.");
    }

    if(
      config.environment==="production" &&
      !config.security?.secretManagerReference
    ){
      issues.push("Production requires a secret-manager reference.");
    }

    if(
      Number(config.dataGovernance?.minimumDataQuality ?? 0) < 0.5
    ){
      issues.push("Minimum data quality is too low.");
    }

    if(
      Number(config.dataGovernance?.minimumConfidence ?? 0) < 0.5
    ){
      issues.push("Minimum confidence is too low.");
    }

    if(config.dataGovernance?.requireLineage!==true){
      issues.push("Intelligence lineage must be required.");
    }

    if(config.dataGovernance?.observedStateSeparation!==true){
      issues.push("Observed-state separation must be enabled.");
    }

    if(config.handoffs?.businessDigitalTwinEnabled!==true){
      issues.push("Business Digital Twin handoff must be enabled.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.masterConfigValidator=Object.freeze({validate});
})(window);

/* --- business-intelligence/INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine/src/validation/dependency-validator.js --- */
(function(global){
  "use strict";

  function validate(manifest,namespace){
    const checks=manifest.map(block=>({
      ...block,
      available:Boolean(namespace?.[block.namespaceKey])
    }));

    const missing=checks.filter(item=>item.required && !item.available);
    const ordered=checks.every((item,index)=>item.sequence===index+1);

    return {
      ready:missing.length===0 && ordered,
      ordered,
      checks,
      missing
    };
  }

  global.INFINICUS.BI.masterDependencyValidator=Object.freeze({validate});
})(window);

/* --- business-intelligence/INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine/src/validation/twin-handoff-validator.js --- */
(function(global){
  "use strict";

  function validate(result={}){
    const issues=[];

    if(!result.businessStatePackage){
      issues.push("Business state package is missing.");
    }

    if(!result.twinPublication){
      issues.push("Business Digital Twin publication is missing.");
    }

    if(!result.twinPublicationReceipt){
      issues.push("Business Digital Twin publication receipt is missing.");
    }

    if(!result.biIntegrationHandoff){
      issues.push("BI integration handoff is missing.");
    }

    if(
      result.businessStatePackage &&
      !result.businessStatePackage.businessId
    ){
      issues.push("Published business state lacks business identity.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.twinHandoffValidator=Object.freeze({validate});
})(window);

/* --- business-intelligence/INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine/src/storage/master-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const DB_NAME="INFINICUS_BI_MASTER_INTEGRATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["diagnostics","diagnosticId"],
          ["readiness","readinessReportId"],
          ["pipeline_runs","pipelineRunId"],
          ["deployments","deploymentManifestId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    }catch(error){
      return runtime.failure(
        "BI_MASTER_STORAGE_ERROR",
        error?.message || "Master integration storage failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "BI_MASTER_STORAGE_ERROR",
        error?.message || "Master integration listing failed."
      );
    }
  }

  global.INFINICUS.BI.masterIntegrationStore=
    Object.freeze({open,put,list});
})(window);

/* --- business-intelligence/INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine/src/orchestration/pipeline-orchestrator.js --- */
(function(global){
  "use strict";

  const phases=[
    "intake",
    "master_data",
    "connectors",
    "harmonization",
    "quality",
    "metrics",
    "financial",
    "revenue",
    "profitability",
    "customer",
    "product",
    "operations",
    "workforce",
    "inventory",
    "liquidity",
    "trends",
    "benchmarking",
    "risk",
    "forecast_inputs",
    "root_cause",
    "reporting",
    "distribution",
    "twin_publication"
  ];

  async function run({context={},handlers={},correlationId=null}={}){
    const runtime=global.INFINICUS.BI.runtime;
    const pipelineRunId=runtime.createId("bi_pipeline_run");
    const completed=[];
    let current=runtime.clone(context);

    for(const phase of phases){
      const handler=handlers[phase];

      if(typeof handler!=="function"){
        return runtime.failure(
          "BI_PIPELINE_HANDLER_MISSING",
          `Missing pipeline handler: ${phase}`,
          {pipelineRunId,completed}
        );
      }

      const result=await handler(runtime.clone(current));

      if(!result?.ok){
        return runtime.failure(
          "BI_PIPELINE_PHASE_FAILED",
          `Business Intelligence pipeline failed at: ${phase}`,
          {pipelineRunId,phase,result,completed}
        );
      }

      current={...current,[phase]:runtime.clone(result.data)};
      completed.push({
        phase,
        status:"completed",
        completedAt:new Date().toISOString()
      });

      await runtime.emit("bi.master.phase_completed",{
        pipelineRunId,
        phase,
        correlationId
      });
    }

    return runtime.success({
      pipelineRunId,
      correlationId,
      completed,
      context:current,
      status:"completed",
      completedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.masterPipelineOrchestrator=
    Object.freeze({phases,run});
})(window);

/* --- business-intelligence/INFINICUS-BI-25-Master-Integration-Production-Assembly-Deployment-Engine/src/engine/master-integration-engine.js --- */
(function(global){
  "use strict";

  const BI=global.INFINICUS.BI;
  const runtime=BI.runtime;

  async function diagnose({config={}}={}){
    const dependencyResult=
      BI.masterDependencyValidator.validate(
        BI.masterBlockManifest,
        BI
      );

    const configResult=
      BI.masterConfigValidator.validate(config);

    const issues=[
      ...dependencyResult.missing.map(item=>
        `Missing block: ${item.blockId} ${item.name}`
      ),
      ...configResult.issues
    ];

    const diagnostic={
      diagnosticId:runtime.createId("bi_master_diagnostic"),
      blockCount:BI.masterBlockManifest.length,
      dependencyResult,
      configResult,
      productionReady:issues.length===0,
      issues,
      generatedAt:new Date().toISOString()
    };

    await BI.masterIntegrationStore.put("diagnostics",diagnostic);

    return runtime.success(diagnostic);
  }

  async function assessDeploymentReadiness({config={}}={}){
    const diagnostic=await diagnose({config});
    if(!diagnostic.ok) return diagnostic;

    const report={
      readinessReportId:runtime.createId("bi_readiness_report"),
      productionReady:diagnostic.data.productionReady,
      issues:runtime.clone(diagnostic.data.issues),
      blockChecks:diagnostic.data.dependencyResult.checks.map(runtime.clone),
      generatedAt:new Date().toISOString()
    };

    await BI.masterIntegrationStore.put("readiness",report);
    return runtime.success(report);
  }

  async function runPipeline(input={}){
    const result=await BI.masterPipelineOrchestrator.run(input);

    if(result.ok){
      await BI.masterIntegrationStore.put("pipeline_runs",result.data);
    }

    return result;
  }

  async function validateTwinHandoff({publicationResult={}}={}){
    const validation=BI.twinHandoffValidator.validate(publicationResult);

    return validation.valid
      ? runtime.success(validation)
      : runtime.failure(
          "BI_TWIN_HANDOFF_INVALID",
          "Business Digital Twin handoff is incomplete.",
          validation
        );
  }

  async function createDeploymentManifest({
    config={},
    artifactVersion="1.0.0",
    commitReference=null
  }={}){
    const readiness=await assessDeploymentReadiness({config});
    if(!readiness.ok) return readiness;

    if(!readiness.data.productionReady){
      return runtime.failure(
        "BI_DEPLOYMENT_NOT_READY",
        "Business Intelligence subsystem is not production-ready.",
        readiness.data
      );
    }

    const manifest={
      deploymentManifestId:runtime.createId("bi_deployment_manifest"),
      subsystem:"BUSINESS_INTELLIGENCE",
      blockRange:"BI-01..BI-25",
      integratedBlockCount:25,
      artifactVersion,
      commitReference,
      environment:config.environment,
      readinessReportId:readiness.data.readinessReportId,
      targetLayer:"BUSINESS_DIGITAL_TWIN",
      status:"ready_for_deployment",
      createdAt:new Date().toISOString()
    };

    await BI.masterIntegrationStore.put("deployments",manifest);

    return runtime.success(manifest);
  }

  const api=Object.freeze({
    diagnose,
    assessDeploymentReadiness,
    runPipeline,
    validateTwinHandoff,
    createDeploymentManifest,
    getBlockManifest:() =>
      runtime.success(BI.masterBlockManifest.map(runtime.clone)),
    listDiagnostics:() =>
      BI.masterIntegrationStore.list("diagnostics"),
    listPipelineRuns:() =>
      BI.masterIntegrationStore.list("pipeline_runs")
  });

  runtime.registerService(
    "bi.master_integration",
    api,
    {block:"BI-25"}
  );

  runtime.registerRoute("bi.master.diagnose",diagnose);
  runtime.registerRoute("bi.master.readiness",assessDeploymentReadiness);
  runtime.registerRoute("bi.master.pipeline.run",runPipeline);
  runtime.registerRoute("bi.master.twin_handoff.validate",validateTwinHandoff);
  runtime.registerRoute(
    "bi.master.deployment_manifest.create",
    createDeploymentManifest
  );

  global.INFINICUS.BI.masterIntegrationEngine=api;
})(window);
