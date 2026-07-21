/* --- ai-decision-intelligence/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/adi-07-decision-evidence-provenance-registry.js --- */
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

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/index.js
  var src_exports = {};
  __export(src_exports, {
    attachToADIRuntime: () => attachToADIRuntime,
    canonicalize: () => canonicalize,
    createEvidenceRegistry: () => createEvidenceRegistry,
    createEvidenceRepository: () => createEvidenceRepository,
    sha256: () => sha256
  });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/canonical-hash.js
  function canonical(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  function canonicalize(value) {
    return canonical(value);
  }
  async function sha256(value) {
    if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable.");
    const bytes = new TextEncoder().encode(canonical(value));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/repository.js
  function createEvidenceRepository() {
    const records = /* @__PURE__ */ new Map(), byDecision = /* @__PURE__ */ new Map(), lifecycle = [];
    return Object.freeze({
      append(record) {
        if (records.has(record.evidenceId)) return false;
        records.set(record.evidenceId, record);
        const key = `${record.tenantId}::${record.businessId}::${record.decisionId}`;
        const ids = byDecision.get(key) ?? [];
        ids.push(record.evidenceId);
        byDecision.set(key, ids);
        return true;
      },
      get(evidenceId) {
        return records.get(evidenceId) ?? null;
      },
      list({ tenantId, businessId, decisionId }) {
        const ids = byDecision.get(`${tenantId}::${businessId}::${decisionId}`) ?? [];
        return ids.map((id) => records.get(id));
      },
      appendLifecycle(entry) {
        lifecycle.push(entry);
      },
      lifecycleFor(evidenceId) {
        return lifecycle.filter((item) => item.evidenceId === evidenceId);
      },
      findByHash({ tenantId, businessId, decisionId, contentHash }) {
        return this.list({ tenantId, businessId, decisionId }).find((item) => item.contentHash === contentHash) ?? null;
      }
    });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/result-envelope.js
  var success = (data = null, meta = {}) => Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
  var failure = (code, message, details = null, meta = {}) => Object.freeze({ ok: false, data: null, error: Object.freeze({ code, message, details }), meta: Object.freeze({ ...meta }) });

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/evidence-registry.js
  var localId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
  var freeze = (value) => Object.freeze(structuredClone(value));
  function createEvidenceRegistry(options = {}) {
    const repository = options.repository ?? createEvidenceRepository();
    const createId = options.createId ?? localId;
    const emit = options.emit ?? (async () => success());
    const now = options.now ?? (() => /* @__PURE__ */ new Date());
    async function register(input = {}) {
      const required = ["tenantId", "businessId", "decisionId", "accessDecisionId", "sourceType", "sourceRecordId", "schemaVersion"];
      const missing = required.filter((field) => typeof input[field] !== "string" || !input[field].trim());
      if (missing.length || input.content === void 0) return failure("ADI_EVIDENCE_INVALID", "Evidence identity, source, schema and content are required.", { missing: [...missing, ...input.content === void 0 ? ["content"] : []] });
      let contentHash;
      try {
        contentHash = await sha256(input.content);
      } catch (error) {
        return failure("ADI_EVIDENCE_HASH_FAILED", "Evidence content could not be hashed.", { message: error.message });
      }
      const duplicate = repository.findByHash({ ...input, contentHash });
      if (duplicate) return success(duplicate, { duplicate: true });
      const evidence = Object.freeze({
        evidenceId: input.evidenceId || createId("evidence"),
        tenantId: input.tenantId,
        businessId: input.businessId,
        decisionId: input.decisionId,
        accessDecisionId: input.accessDecisionId,
        contextId: input.contextId ?? null,
        fragmentId: input.fragmentId ?? null,
        sourceType: input.sourceType,
        providerId: input.providerId ?? null,
        sourceSystem: input.sourceSystem ?? null,
        sourceRecordId: input.sourceRecordId,
        schemaVersion: input.schemaVersion,
        content: freeze(input.content),
        contentHash,
        hashAlgorithm: "SHA-256",
        quality: input.quality ?? "unknown",
        freshness: input.freshness ?? "undated",
        observedAt: input.observedAt ?? null,
        retrievedAt: input.retrievedAt ?? now().toISOString(),
        registeredAt: now().toISOString(),
        parentEvidenceIds: Object.freeze([...input.parentEvidenceIds ?? []]),
        status: "active",
        provenanceVersion: "1.0.0"
      });
      if (!repository.append(evidence)) return failure("ADI_EVIDENCE_DUPLICATE_ID", "Evidence ID already exists.");
      await emit("adi.evidence.registered", { evidenceId: evidence.evidenceId, decisionId: evidence.decisionId, contentHash }, { tenantId: evidence.tenantId, businessId: evidence.businessId, decisionId: evidence.decisionId });
      return success(evidence);
    }
    async function ingestContext(contextEnvelope) {
      if (!contextEnvelope?.contextId || !contextEnvelope?.accessDecisionId || !Array.isArray(contextEnvelope.fragments)) return failure("ADI_CONTEXT_ENVELOPE_INVALID", "A canonical authorized ADI-04 DecisionContextEnvelope is required.");
      const registered = [], failed = [];
      for (const fragment of contextEnvelope.fragments) {
        const result = await register({ tenantId: contextEnvelope.tenantId, businessId: contextEnvelope.businessId, decisionId: contextEnvelope.decisionId, accessDecisionId: contextEnvelope.accessDecisionId, contextId: contextEnvelope.contextId, fragmentId: fragment.fragmentId, sourceType: fragment.sourceType, providerId: fragment.providerId, sourceSystem: fragment.provenance?.sourceSystem, sourceRecordId: fragment.recordId, schemaVersion: fragment.schemaVersion, content: { data: fragment.data, units: fragment.units, currency: fragment.currency }, quality: fragment.quality, freshness: fragment.freshness, observedAt: fragment.observedAt, retrievedAt: fragment.provenance?.retrievedAt });
        if (result.ok) registered.push(result.data);
        else failed.push({ fragmentId: fragment.fragmentId, error: result.error });
      }
      return success(Object.freeze({ contextId: contextEnvelope.contextId, registered: Object.freeze(registered), failed: Object.freeze(failed) }), { partial: failed.length > 0 });
    }
    function get({ evidenceId, tenantId, businessId, decisionId }) {
      const record = repository.get(evidenceId);
      if (!record) return failure("ADI_EVIDENCE_NOT_FOUND", "Evidence record was not found.");
      if (record.tenantId !== tenantId || record.businessId !== businessId || record.decisionId !== decisionId) return failure("ADI_EVIDENCE_BOUNDARY_MISMATCH", "Evidence boundary does not match.");
      return success(record);
    }
    function list(boundary) {
      return success(repository.list(boundary));
    }
    async function lifecycle(action, { evidenceId, tenantId, businessId, decisionId, replacementEvidenceId = null, reason }) {
      const found = get({ evidenceId, tenantId, businessId, decisionId });
      if (!found.ok) return found;
      if (!["superseded", "revoked"].includes(action) || !reason) return failure("ADI_EVIDENCE_LIFECYCLE_INVALID", "Supported action and reason are required.");
      if (action === "superseded" && !replacementEvidenceId) return failure("ADI_EVIDENCE_REPLACEMENT_REQUIRED", "Replacement evidence ID is required.");
      const entry = Object.freeze({ lifecycleId: createId("evidence_event"), evidenceId, action, replacementEvidenceId, reason, recordedAt: now().toISOString() });
      repository.appendLifecycle(entry);
      await emit(`adi.evidence.${action}`, entry, { tenantId, businessId, decisionId });
      return success(entry);
    }
    async function verify({ evidenceId, tenantId, businessId, decisionId }) {
      const found = get({ evidenceId, tenantId, businessId, decisionId });
      if (!found.ok) return found;
      const actual = await sha256(found.data.content);
      return success(Object.freeze({ evidenceId, valid: actual === found.data.contentHash, expectedHash: found.data.contentHash, actualHash: actual, verifiedAt: now().toISOString() }));
    }
    return Object.freeze({ blockId: "ADI-07", version: "1.0.0", register, ingestContext, get, list, verify, supersede: (input) => lifecycle("superseded", input), revoke: (input) => lifecycle("revoked", input), lifecycleFor: (evidenceId) => success(repository.lifecycleFor(evidenceId)) });
  }

  // ../../../tmp/claude-0/-home-user-infinicus-validation/9b943d77-334b-5b5b-8921-6b706af37ec8/scratchpad/adi-src-patched/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/src/integration.js
  function attachToADIRuntime(runtime, options = {}) {
    const required = ["registerService", "registerRoute", "emit", "createId", "success"];
    if (!runtime || required.some((name) => typeof runtime[name] !== "function")) return failure("ADI_RUNTIME_INCOMPATIBLE", "A compatible ADI-01 runtime is required.");
    const registry = createEvidenceRegistry({ ...options, emit: runtime.emit, createId: runtime.createId });
    const service = runtime.registerService("adi.evidence_registry", registry, { blockId: "ADI-07", version: "1.0.0" });
    if (!service.ok) return service;
    const routes = [["adi.evidence.register", (request) => registry.register(request)], ["adi.evidence.context.ingest", (request) => registry.ingestContext(request.contextEnvelope ?? request)], ["adi.evidence.get", (request) => registry.get(request)], ["adi.evidence.list", (request) => registry.list(request)], ["adi.evidence.verify", (request) => registry.verify(request)], ["adi.evidence.supersede", (request) => registry.supersede(request)], ["adi.evidence.revoke", (request) => registry.revoke(request)]];
    for (const [name, handler] of routes) {
      const result = runtime.registerRoute(name, handler, { blockId: "ADI-07" });
      if (!result.ok) return result;
    }
    void runtime.emit("adi.block.ready", { blockId: "ADI-07", version: "1.0.0" });
    return runtime.success({ blockId: "ADI-07", service: "adi.evidence_registry", routes: routes.map(([name]) => name) });
  }
  return __toCommonJS(src_exports);
})();
global.INFINICUS = global.INFINICUS || {};
global.INFINICUS.ADI = global.INFINICUS.ADI || {};
global.INFINICUS.ADI.blocks = global.INFINICUS.ADI.blocks || {};
global.INFINICUS.ADI.blocks["ADI-07"] = __adiBlockExports;
})(window);
