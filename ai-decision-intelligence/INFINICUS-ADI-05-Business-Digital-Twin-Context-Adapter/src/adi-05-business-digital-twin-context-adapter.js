/* --- ai-decision-intelligence/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/adi-05-business-digital-twin-context-adapter.js --- */
(function(global){
"use strict";
var __adiBlockExports = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    createDigitalTwinContextAdapter: () => createDigitalTwinContextAdapter,
    mapSnapshotToFragments: () => mapSnapshotToFragments,
    validateTwinSnapshot: () => validateTwinSnapshot
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/snapshot-validator.js
  var id = (value) => typeof value === "string" ? value.trim() : "";
  function validateTwinSnapshot(snapshot, boundary) {
    const errors = [], warnings = [];
    if (!snapshot || typeof snapshot !== "object") return Object.freeze({ valid: false, errors: Object.freeze(["snapshot_required"]), warnings: Object.freeze([]) });
    if (!id(snapshot.snapshotId)) errors.push("snapshot_id_required");
    if (!id(snapshot.twinId)) errors.push("twin_id_required");
    if (!id(snapshot.version)) errors.push("version_required");
    if (snapshot.tenantId !== boundary.tenantId) errors.push("tenant_boundary_mismatch");
    if (snapshot.businessId !== boundary.businessId) errors.push("business_boundary_mismatch");
    if (snapshot.publicationStatus !== "published") errors.push("snapshot_not_published");
    if (Number.isNaN(Date.parse(snapshot.publishedAt))) errors.push("published_at_invalid");
    if (!id(snapshot.schemaVersion)) errors.push("schema_version_required");
    if (!snapshot.state || typeof snapshot.state !== "object" || Array.isArray(snapshot.state)) errors.push("state_object_required");
    if (!Array.isArray(snapshot.entities)) warnings.push("entities_missing");
    if (!Array.isArray(snapshot.relationships)) warnings.push("relationships_missing");
    if (!Array.isArray(snapshot.assumptions)) warnings.push("assumptions_missing");
    if (!snapshot.quality) warnings.push("quality_unreported");
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/fragment-mapper.js
  var clone = (value) => value === void 0 ? void 0 : structuredClone(value);
  function mapSnapshotToFragments(snapshot, validation) {
    const common = {
      tenantId: snapshot.tenantId,
      businessId: snapshot.businessId,
      sourceType: "business_digital_twin",
      quality: snapshot.quality ?? "unknown",
      observedAt: snapshot.publishedAt,
      schemaVersion: snapshot.schemaVersion,
      sourceSystem: snapshot.sourceSystem ?? "infinicus_business_digital_twin"
    };
    const fragments = [{
      ...common,
      fragmentId: `twin:${snapshot.snapshotId}:state`,
      recordId: snapshot.snapshotId,
      scope: "general",
      data: { twinId: snapshot.twinId, twinVersion: snapshot.version, publicationStatus: snapshot.publicationStatus, state: clone(snapshot.state) },
      units: clone(snapshot.units ?? {})
    }];
    if (Array.isArray(snapshot.entities) && snapshot.entities.length) fragments.push({ ...common, fragmentId: `twin:${snapshot.snapshotId}:entities`, recordId: `${snapshot.snapshotId}:entities`, scope: "operations", data: { entities: clone(snapshot.entities) }, units: {} });
    if (Array.isArray(snapshot.relationships) && snapshot.relationships.length) fragments.push({ ...common, fragmentId: `twin:${snapshot.snapshotId}:relationships`, recordId: `${snapshot.snapshotId}:relationships`, scope: "operations", data: { relationships: clone(snapshot.relationships) }, units: {} });
    if (Array.isArray(snapshot.assumptions) && snapshot.assumptions.length) fragments.push({ ...common, fragmentId: `twin:${snapshot.snapshotId}:assumptions`, recordId: `${snapshot.snapshotId}:assumptions`, scope: "general", data: { assumptions: clone(snapshot.assumptions), validationWarnings: [...validation.warnings] }, units: {} });
    return Object.freeze(fragments.map(Object.freeze));
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/twin-adapter.js
  function createDigitalTwinContextAdapter(options = {}) {
    const readSnapshot = options.readSnapshot;
    const emit = options.emit ?? (async () => success());
    async function acquire({ decisionCase, boundary, requestedScopes = [] } = {}, context = {}) {
      if (typeof readSnapshot !== "function") return failure("ADI_TWIN_READER_REQUIRED", "A read-only Digital Twin snapshot reader is required.");
      if (!decisionCase?.decisionId || !boundary?.tenantId || !boundary?.businessId) return failure("ADI_TWIN_QUERY_INVALID", "Decision and business boundaries are required.");
      let snapshot;
      try {
        snapshot = await readSnapshot(Object.freeze({ tenantId: boundary.tenantId, businessId: boundary.businessId, decisionId: decisionCase.decisionId, requestedScopes: Object.freeze([...requestedScopes]) }), context);
      } catch (error) {
        return failure("ADI_TWIN_READ_FAILED", "Digital Twin snapshot retrieval failed.", { message: error.message });
      }
      const validation = validateTwinSnapshot(snapshot, boundary);
      if (!validation.valid) {
        await emit("adi.digital_twin_context.rejected", { decisionId: decisionCase.decisionId, errors: validation.errors }, { ...boundary, traceId: decisionCase.traceId });
        return failure("ADI_TWIN_SNAPSHOT_INVALID", "Digital Twin snapshot failed validation.", { errors: validation.errors, warnings: validation.warnings });
      }
      const fragments = mapSnapshotToFragments(snapshot, validation);
      await emit("adi.digital_twin_context.acquired", { decisionId: decisionCase.decisionId, snapshotId: snapshot.snapshotId, twinVersion: snapshot.version, fragmentCount: fragments.length }, { ...boundary, traceId: decisionCase.traceId });
      return success(Object.freeze({ fragments, snapshot: Object.freeze({ snapshotId: snapshot.snapshotId, twinId: snapshot.twinId, version: snapshot.version, publishedAt: snapshot.publishedAt }), warnings: validation.warnings }));
    }
    return Object.freeze({ blockId: "ADI-05", version: "1.0.0", mode: "read_only", acquire });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "getService", "emit", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const contextService = options.contextEngine ? { ok: true, data: options.contextEngine } : runtime.getService("adi.decision_context");
    if (!contextService.ok) return failure("ADI_CONTEXT_ENGINE_REQUIRED", "ADI-04 must be attached before ADI-05.");
    const adapter = createDigitalTwinContextAdapter({ ...options, emit: runtime.emit });
    const service = runtime.registerService("adi.digital_twin_context_adapter", adapter, { blockId: "ADI-05", version: "1.0.0", mode: "read_only" });
    if (!service.ok) return service;
    const route = runtime.registerRoute("adi.digital_twin_context.acquire", (request, context) => adapter.acquire(request, context), { blockId: "ADI-05" });
    if (!route.ok) return route;
    const provider = contextService.data.providers.register({ providerId: "adi05.business_digital_twin", sourceType: "business_digital_twin", blockId: "ADI-05" }, { acquire: async (query, context) => {
      const result = await adapter.acquire(query, context);
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      return result.data.fragments;
    } });
    if (!provider.ok) return provider;
    void runtime.emit("adi.block.ready", { blockId: "ADI-05", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-05", service: "adi.digital_twin_context_adapter", route: "adi.digital_twin_context.acquire", providerId: "adi05.business_digital_twin" });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-05"] = __adiBlockExports;
})(window);
