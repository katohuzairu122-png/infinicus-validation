/* PLATFORM BOOTSTRAP */
/* BUILD-10 — docs/implementation-queue/BUILD-10-PLATFORM-SPECIFICATION.md */
/* Additive orchestration only: reads window.INFINICUS.{DA,DT,BI,ABA,OM,CL,ADI,SIMULATION},
   never mutates them. Establishes window.INFINICUS.PLATFORM. No new storage,
   no new network endpoint, no eval, no innerHTML. */
(function (global) {
  "use strict";

  const PLATFORM_VERSION = "1.0.0";
  const REQUIRED_LAYER_VERSION = "1.0.0";
  const DIAGNOSTICS_MAX_EVENTS = 50;

  function createId(prefix) {
    const random =
      (global.crypto && typeof global.crypto.randomUUID === "function" && global.crypto.randomUUID()) ||
      (Date.now() + "_" + Math.random().toString(16).slice(2));
    return String(prefix || "platform") + "_" + random;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isPlainResult(value) {
    return typeof value === "object" && value !== null;
  }

  /* ── Frozen layer descriptors (spec §2 / §21 PlatformLayerDescriptor) ── */
  const LAYER_DESCRIPTORS = Object.freeze([
    Object.freeze({
      layerId: "DA", name: "Data Acquisition",
      namespace: "window.INFINICUS.DA", bundleFile: "data-acquisition/da-bundle.js",
      blockCount: 25, masterIntegrationRoute: "da.master.diagnose",
      runtimeDiagnosticsMethod: "diagnose", required: true
    }),
    Object.freeze({
      layerId: "BO", name: "Business Operations",
      namespace: null, bundleFile: null,
      blockCount: null, masterIntegrationRoute: null,
      runtimeDiagnosticsMethod: null, required: false
    }),
    Object.freeze({
      layerId: "BI", name: "Business Intelligence",
      namespace: "window.INFINICUS.BI", bundleFile: "business-intelligence/bi-bundle.js",
      blockCount: 25, masterIntegrationRoute: "bi.master.diagnose",
      runtimeDiagnosticsMethod: "diagnostics", required: true
    }),
    Object.freeze({
      layerId: "DT", name: "Business Digital Twin",
      namespace: "window.INFINICUS.DT", bundleFile: "digital-twin/dt-bundle.js",
      blockCount: 24, masterIntegrationRoute: null,
      runtimeDiagnosticsMethod: "diagnostics", required: true
    }),
    Object.freeze({
      layerId: "SIM", name: "Simulation",
      namespace: "window.INFINICUS.SIMULATION", bundleFile: null,
      blockCount: null, masterIntegrationRoute: null,
      runtimeDiagnosticsMethod: null, required: true
    }),
    Object.freeze({
      layerId: "ADI", name: "AI Decision Intelligence",
      namespace: "window.INFINICUS.ADI", bundleFile: "ai-decision-intelligence/adi-bundle.js",
      blockCount: 25, masterIntegrationRoute: "adi.master.diagnose",
      runtimeDiagnosticsMethod: null, required: true
    }),
    Object.freeze({
      layerId: "ABA", name: "Approved Business Action",
      namespace: "window.INFINICUS.ABA", bundleFile: "approved-business-action/aba-bundle.js",
      blockCount: 25, masterIntegrationRoute: "aba.master.diagnose",
      runtimeDiagnosticsMethod: null, required: true
    }),
    Object.freeze({
      layerId: "OM", name: "Outcome Monitoring",
      namespace: "window.INFINICUS.OM", bundleFile: "outcome-monitoring/om-bundle.js",
      blockCount: 25, masterIntegrationRoute: "om.master.diagnose",
      runtimeDiagnosticsMethod: null, required: true
    }),
    Object.freeze({
      layerId: "CL", name: "Continuous Learning",
      namespace: "window.INFINICUS.CL", bundleFile: "continuous-learning/cl-bundle.js",
      blockCount: 25, masterIntegrationRoute: "cl.master.diagnose",
      runtimeDiagnosticsMethod: null, required: true
    })
  ]);

  /* Layers actually checked at bootstrap time — BO excluded, has no browser namespace (spec §2/§14). */
  const CHECKED_LAYER_IDS = Object.freeze(["DA", "DT", "BI", "ABA", "OM", "CL", "ADI", "SIM"]);

  /* Capability name per layer (spec §14) — fixed order, 9 entries, BO included for completeness. */
  const CAPABILITY_NAMES = Object.freeze({
    DA: "data_acquisition",
    BO: "business_operations",
    BI: "business_intelligence",
    DT: "business_digital_twin",
    SIM: "simulation",
    ADI: "ai_decision_intelligence",
    ABA: "approved_business_action",
    OM: "outcome_monitoring",
    CL: "continuous_learning"
  });

  /* ── Frozen static handoff map (spec §8.3) — describes the repository's actual
     wiring state; never live-introspected, never upgraded by bootstrap logic. */
  const HANDOFF_MAP = Object.freeze([
    Object.freeze({
      handoffId: "DA_TO_BO", producerLayer: "DA", consumerLayer: "BO",
      mechanism: "persistence", contractBacked: true,
      contractFile: "dal-to-bo.ts", status: "active"
    }),
    Object.freeze({
      handoffId: "BO_TO_BI", producerLayer: "BO", consumerLayer: "BI",
      mechanism: "persistence", contractBacked: true,
      contractFile: "bo-to-bi.ts", status: "active"
    }),
    Object.freeze({
      handoffId: "BI_TO_DT", producerLayer: "BI", consumerLayer: "DT",
      mechanism: "not_wired", contractBacked: false,
      contractFile: "bi-to-dt.ts", status: "not_wired"
    }),
    Object.freeze({
      handoffId: "DT_TO_SIM", producerLayer: "DT", consumerLayer: "SIM",
      mechanism: "not_wired", contractBacked: false,
      contractFile: "dt-to-sim.ts", status: "not_wired"
    }),
    Object.freeze({
      handoffId: "SIM_TO_ADI", producerLayer: "SIM", consumerLayer: "ADI",
      mechanism: "direct-port", contractBacked: true,
      contractFile: "sim-to-adi.ts", status: "active"
    }),
    Object.freeze({
      handoffId: "ADI_TO_ABA", producerLayer: "ADI", consumerLayer: "ABA",
      mechanism: "not_wired", contractBacked: false,
      contractFile: "adi-to-aba.ts", status: "not_wired"
    }),
    Object.freeze({
      handoffId: "ABA_TO_OM", producerLayer: "ABA", consumerLayer: "OM",
      mechanism: "registerPublisher", contractBacked: false,
      contractFile: "aba-to-om.ts", status: "active"
    }),
    Object.freeze({
      handoffId: "OM_TO_CL", producerLayer: "OM", consumerLayer: "CL",
      mechanism: "registerPublisher", contractBacked: false,
      contractFile: "om-to-cl.ts", status: "active"
    }),
    Object.freeze({
      handoffId: "CL_FEEDBACK", producerLayer: "CL", consumerLayer: "PLATFORM",
      mechanism: "event-bus", contractBacked: false,
      contractFile: "cl-feedback.ts", status: "active"
    })
  ]);

  /* ── Mutable module state (fresh per page load; never persisted) ── */
  let state = "not_started";
  let readyLayers = [];
  let degradedLayers = [];
  let missingLayers = [];
  let errors = [];
  let initializedAt = null;
  let capabilities = [];
  let lastResult = null;
  const diagnosticsBuffer = [];
  let currentCorrelationId = null;

  function recordEvent(eventName, severity, layerId, message, payloadSummary) {
    const entry = {
      event: eventName,
      severity: severity,
      layerId: layerId || null,
      correlationId: currentCorrelationId,
      occurredAt: nowIso(),
      message: String(message || ""),
      payloadSummary: payloadSummary || null
    };
    diagnosticsBuffer.push(entry);
    while (diagnosticsBuffer.length > DIAGNOSTICS_MAX_EVENTS) {
      diagnosticsBuffer.shift();
    }
    if (severity === "warn" && global.console && typeof global.console.warn === "function") {
      global.console.warn("[INFINICUS.PLATFORM] " + eventName + (layerId ? " (" + layerId + ")" : "") + ": " + entry.message);
    }
    if (severity === "error" && global.console && typeof global.console.error === "function") {
      global.console.error("[INFINICUS.PLATFORM] " + eventName + (layerId ? " (" + layerId + ")" : "") + ": " + entry.message);
    }
    return entry;
  }

  function makeError(code, message, layerId, fatal) {
    return {
      code: code,
      message: String(message || ""),
      layerId: layerId || null,
      fatal: !!fatal,
      occurredAt: nowIso()
    };
  }

  /* Redacted summary only — never the full layer response payload (spec §13/§17). */
  function redactedSummary(response) {
    if (!isPlainResult(response)) return { ok: false, hasData: false };
    const summary = { ok: response.ok === true, hasData: response.data !== undefined && response.data !== null };
    if (isPlainResult(response.data)) {
      if (typeof response.data.status === "string") summary.status = response.data.status;
      if (typeof response.data.productionReady === "boolean") summary.productionReady = response.data.productionReady;
    }
    return summary;
  }

  /* ── Per-layer readiness — exact dispatch method per layer, never normalized (spec §2/§6). ── */

  function readNamespace(layerId) {
    const INF = global.INFINICUS;
    if (!isPlainResult(INF)) return undefined;
    switch (layerId) {
      case "DA": return INF.DA;
      case "DT": return INF.DT;
      case "BI": return INF.BI;
      case "ABA": return INF.ABA;
      case "OM": return INF.OM;
      case "CL": return INF.CL;
      case "ADI": return INF.ADI;
      case "SIM": return INF.SIMULATION;
      default: return undefined;
    }
  }

  function checkLayer(layerId) {
    const reportedId = layerId === "SIM" ? "SIMULATION" : layerId;
    const check = {
      layerId: reportedId,
      namespacePresent: false,
      runtimePresent: false,
      diagnosticsOk: false,
      missingServices: [],
      status: "missing"
    };
    let ns;
    try {
      ns = readNamespace(layerId);
    } catch (error) {
      errors.push(makeError("PLATFORM_LAYER_NAMESPACE_MISSING", "Reading namespace threw: " + String(error && error.message), reportedId, false));
      recordEvent("platform_layer_failed", "error", reportedId, "namespace read threw", null);
      return check;
    }
    if (!isPlainResult(ns)) {
      errors.push(makeError("PLATFORM_LAYER_NAMESPACE_MISSING", "window.INFINICUS." + reportedId + " is not present.", reportedId, false));
      recordEvent("platform_layer_failed", "error", reportedId, "namespace missing", null);
      return check;
    }
    check.namespacePresent = true;

    try {
      if (layerId === "SIM") {
        const hasExecute = typeof ns.executeScenario === "function";
        const hasRead = typeof ns.getCompletedRun === "function";
        const caps = ns.capabilities;
        const capsOk = isPlainResult(caps) && caps.runs === 500 && caps.horizonDays === 90;
        check.runtimePresent = hasExecute && hasRead;
        if (!check.runtimePresent) {
          errors.push(makeError("PLATFORM_LAYER_API_INVALID", "SIMULATION.executeScenario/getCompletedRun missing.", reportedId, false));
          recordEvent("platform_layer_failed", "error", reportedId, "SIM API invalid", null);
          return check;
        }
        check.diagnosticsOk = capsOk;
        if (!capsOk) {
          errors.push(makeError("PLATFORM_LAYER_VERSION_INCOMPATIBLE", "SIMULATION.capabilities does not match runs:500/horizonDays:90.", reportedId, false));
          recordEvent("platform_layer_failed", "warn", reportedId, "SIM capabilities mismatch", redactedSummary({ ok: capsOk, data: caps }));
        } else {
          recordEvent("platform_layer_ready", "info", reportedId, "SIM ready", redactedSummary({ ok: true, data: caps }));
        }
        check.status = capsOk ? "ready" : "degraded";
        return check;
      }

      const runtime = ns.runtime;
      if (!isPlainResult(runtime)) {
        errors.push(makeError("PLATFORM_LAYER_RUNTIME_MISSING", "window.INFINICUS." + reportedId + ".runtime is not present.", reportedId, false));
        recordEvent("platform_layer_failed", "error", reportedId, "runtime missing", null);
        return check;
      }
      check.runtimePresent = true;

      let response;
      if (layerId === "DA") {
        response = typeof runtime.invoke === "function" ? runtime.invoke("da.master.diagnose", {}) : undefined;
      } else if (layerId === "DT") {
        response = typeof runtime.diagnostics === "function" ? runtime.diagnostics() : undefined;
      } else if (layerId === "BI") {
        response = typeof runtime.call === "function" ? runtime.call("bi.master.diagnose", {}) : undefined;
      } else if (layerId === "ABA") {
        response = typeof runtime.dispatch === "function" ? runtime.dispatch("aba.master.diagnose", {}) : undefined;
      } else if (layerId === "OM") {
        response = typeof runtime.dispatch === "function" ? runtime.dispatch("om.master.diagnose", {}) : undefined;
      } else if (layerId === "CL") {
        response = typeof runtime.invoke === "function" ? runtime.invoke("cl.master.diagnose", {}) : undefined;
      } else if (layerId === "ADI") {
        response = typeof runtime.dispatch === "function" ? runtime.dispatch("adi.master.diagnose", {}) : undefined;
      }

      if (response && typeof response.then === "function") {
        /* Every existing layer route in this codebase is synchronous; a Promise here
           would indicate an API this specification did not observe. Treated as invalid
           per spec §12 rather than awaited, since initialize() is synchronous (spec §3.5). */
        errors.push(makeError("PLATFORM_LAYER_API_INVALID", "Layer route returned a Promise; synchronous response required.", reportedId, false));
        recordEvent("platform_layer_failed", "error", reportedId, "async response rejected", null);
        return check;
      }

      if (!isPlainResult(response)) {
        errors.push(makeError("PLATFORM_LAYER_RESPONSE_MALFORMED", "Master diagnostic route returned a non-object response.", reportedId, false));
        recordEvent("platform_layer_failed", "error", reportedId, "malformed response", null);
        return check;
      }

      check.diagnosticsOk = response.ok === true;
      check.status = check.diagnosticsOk ? "ready" : "degraded";
      if (!check.diagnosticsOk) {
        errors.push(makeError("PLATFORM_LAYER_DIAGNOSTIC_FAILED", "Layer diagnostic reported ok:false.", reportedId, false));
        recordEvent("platform_layer_failed", "warn", reportedId, "diagnostic ok:false", redactedSummary(response));
      } else {
        recordEvent("platform_layer_ready", "info", reportedId, "layer ready", redactedSummary(response));
      }
      return check;
    } catch (error) {
      errors.push(makeError("PLATFORM_LAYER_DIAGNOSTIC_FAILED", "Layer diagnostic threw: " + String(error && error.message), reportedId, false));
      recordEvent("platform_layer_failed", "error", reportedId, "diagnostic threw", null);
      return check;
    }
  }

  function buildCapabilities(checksByLayer) {
    const result = [];
    for (let i = 0; i < LAYER_DESCRIPTORS.length; i++) {
      const descriptor = LAYER_DESCRIPTORS[i];
      const name = CAPABILITY_NAMES[descriptor.layerId];
      if (descriptor.layerId === "BO") {
        result.push({
          name: name,
          layerId: "BO",
          version: REQUIRED_LAYER_VERSION,
          ready: false,
          degraded: false,
          browserApplicable: false,
          dependencies: [],
          publicInterface: null,
          diagnostics: { note: "Business Operations has no browser layer; persistence-only (Stage 2C, frozen). Not a load failure." }
        });
        continue;
      }
      const checkKey = descriptor.layerId === "SIM" ? "SIM" : descriptor.layerId;
      const check = checksByLayer[checkKey];
      const dependencies = [];
      for (let h = 0; h < HANDOFF_MAP.length; h++) {
        if (HANDOFF_MAP[h].consumerLayer === descriptor.layerId) dependencies.push(HANDOFF_MAP[h].producerLayer);
      }
      result.push({
        name: name,
        layerId: descriptor.layerId,
        version: REQUIRED_LAYER_VERSION,
        ready: !!(check && check.status === "ready"),
        degraded: !!(check && check.status === "degraded"),
        browserApplicable: true,
        dependencies: dependencies,
        publicInterface: descriptor.namespace ? descriptor.namespace + ".runtime" : (descriptor.layerId === "SIM" ? "window.INFINICUS.SIMULATION" : null),
        diagnostics: check ? { namespacePresent: check.namespacePresent, runtimePresent: check.runtimePresent, diagnosticsOk: check.diagnosticsOk } : null
      });
    }
    return result;
  }

  function computeState(checksByLayer) {
    const ready = [];
    const degraded = [];
    const missing = [];
    for (let i = 0; i < CHECKED_LAYER_IDS.length; i++) {
      const layerId = CHECKED_LAYER_IDS[i];
      const check = checksByLayer[layerId];
      const reportedId = layerId === "SIM" ? "SIMULATION" : layerId;
      if (check.status === "ready") ready.push(reportedId);
      else if (check.status === "degraded") degraded.push(reportedId);
      else missing.push(reportedId);
    }
    let finalState;
    if (ready.length === CHECKED_LAYER_IDS.length) finalState = "ready";
    else if (ready.length === 0) finalState = "failed";
    else finalState = "degraded";
    return { finalState: finalState, ready: ready, degraded: degraded, missing: missing };
  }

  function runInitialization() {
    currentCorrelationId = createId("platform_init");
    errors = [];
    recordEvent("platform_bootstrap_started", "info", null, "initialize() called", null);

    state = "validating";
    const checksByLayer = {};
    let fatalError = null;

    try {
      for (let i = 0; i < CHECKED_LAYER_IDS.length; i++) {
        const layerId = CHECKED_LAYER_IDS[i];
        recordEvent("platform_dependency_validated", "info", layerId === "SIM" ? "SIMULATION" : layerId, "validating namespace", null);
      }

      state = "initializing";
      for (let i = 0; i < CHECKED_LAYER_IDS.length; i++) {
        const layerId = CHECKED_LAYER_IDS[i];
        const reportedId = layerId === "SIM" ? "SIMULATION" : layerId;
        recordEvent("platform_layer_initializing", "info", reportedId, "invoking layer diagnostic", null);
        checksByLayer[layerId] = checkLayer(layerId);
      }
    } catch (error) {
      fatalError = makeError("PLATFORM_BOOTSTRAP_THREW", "initialize() threw outside a per-layer check: " + String(error && error.message), null, true);
    }

    if (fatalError) {
      errors.push(fatalError);
      state = "failed";
      readyLayers = [];
      degradedLayers = [];
      missingLayers = CHECKED_LAYER_IDS.slice();
      capabilities = buildCapabilities({});
      recordEvent("platform_failed", "error", null, "bootstrap threw", null);
    } else {
      const computed = computeState(checksByLayer);
      state = computed.finalState;
      readyLayers = computed.ready;
      degradedLayers = computed.degraded;
      missingLayers = computed.missing;
      capabilities = buildCapabilities(checksByLayer);
      if (state === "ready") recordEvent("platform_ready", "info", null, "all required layers ready", null);
      else if (state === "degraded") recordEvent("platform_degraded", "warn", null, readyLayers.length + "/" + CHECKED_LAYER_IDS.length + " layers ready", null);
      else recordEvent("platform_failed", "error", null, "no required layers ready", null);
    }

    for (let h = 0; h < HANDOFF_MAP.length; h++) {
      const entry = HANDOFF_MAP[h];
      if (entry.status === "active") {
        recordEvent("handoff_accepted", "info", entry.producerLayer, entry.handoffId + " recorded active", null);
      } else {
        recordEvent("handoff_rejected", "warn", entry.producerLayer, entry.handoffId + " recorded not_wired", null);
      }
    }

    initializedAt = nowIso();

    const status = {
      state: state,
      readyLayers: readyLayers.slice(),
      degradedLayers: degradedLayers.slice(),
      missingLayers: missingLayers.slice(),
      errors: errors.slice(),
      initializedAt: initializedAt,
      version: PLATFORM_VERSION
    };

    lastResult = {
      ok: state === "ready",
      status: status,
      errors: status.errors
    };

    return lastResult;
  }

  function initialize(options) {
    const opts = isPlainResult(options) ? options : {};
    if (state !== "not_started" && opts.force !== true) {
      recordEvent("platform_bootstrap_started", "info", null, "duplicate call ignored", null);
      return lastResult;
    }
    return runInitialization();
  }

  function getStatus() {
    return {
      state: state,
      readyLayers: readyLayers.slice(),
      degradedLayers: degradedLayers.slice(),
      missingLayers: missingLayers.slice(),
      errors: errors.slice(),
      initializedAt: initializedAt,
      version: PLATFORM_VERSION
    };
  }

  function isReady() {
    return state === "ready";
  }

  function getCapabilities() {
    return capabilities.slice();
  }

  function getDiagnostics() {
    return {
      events: diagnosticsBuffer.slice(),
      generatedAt: nowIso(),
      schemaVersion: "1.0.0"
    };
  }

  function getHandoffs() {
    return HANDOFF_MAP.map(function (entry) {
      return {
        handoffId: entry.handoffId,
        producerLayer: entry.producerLayer,
        consumerLayer: entry.consumerLayer,
        mechanism: entry.mechanism,
        contractBacked: entry.contractBacked,
        contractFile: entry.contractFile,
        status: entry.status
      };
    });
  }

  function getVersionManifest() {
    return {
      platformVersion: PLATFORM_VERSION,
      layers: {
        DA: "1.0.0",
        BI: "1.0.0",
        DT: "1.0.0",
        ABA: "1.0.0",
        OM: "1.0.0",
        CL: "1.0.0",
        ADI: "1.0.0",
        SIMULATION: "infinicus-engine-v3"
      }
    };
  }

  const bootstrap = Object.freeze({
    initialize: initialize,
    getStatus: getStatus,
    isReady: isReady,
    getCapabilities: getCapabilities,
    getDiagnostics: getDiagnostics,
    getHandoffs: getHandoffs,
    getVersionManifest: getVersionManifest
  });

  global.INFINICUS = global.INFINICUS || {};
  if (!global.INFINICUS.PLATFORM) {
    Object.defineProperty(global.INFINICUS, "PLATFORM", {
      configurable: false,
      enumerable: true,
      get: function () {
        return {
          version: PLATFORM_VERSION,
          bootstrap: bootstrap,
          status: getStatus(),
          capabilities: getCapabilities(),
          diagnostics: getDiagnostics(),
          handoffs: getHandoffs()
        };
      }
    });
  }

  /* Auto-run once at load time, matching the existing ADI BOOTSTRAP convention
     (ai-decision-intelligence/adi-bundle.js) of self-initializing when the
     script executes, rather than requiring an external caller. This is the
     only automatic call this file makes; nothing else self-invokes. */
  initialize();
})(window);
