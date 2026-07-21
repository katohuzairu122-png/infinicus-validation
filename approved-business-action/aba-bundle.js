/* ABA LAYER BUNDLE */
/* Auto-generated — do not edit directly */
/* Contains: INFINICUS-ABA-01 through INFINICUS-ABA-25 */


/* ===== INFINICUS-ABA-01-Approved-Business-Action-Core-Runtime-Registry ===== */

/* --- approved-business-action/INFINICUS-ABA-01-Approved-Business-Action-Core-Runtime-Registry/src/runtime.js --- */
(function (global) {
  "use strict";

  global.INFINICUS = global.INFINICUS || {};
  global.INFINICUS.ABA = global.INFINICUS.ABA || {};

  const services = new Map();
  const routes = new Map();
  const listeners = new Map();
  const lifecycles = new Map();
  const manifest = new Map();

  function clone(value) {
    if (value === undefined) return undefined;
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function createId(prefix = "aba") {
    const id = global.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${id}`;
  }

  function success(data, meta = {}) {
    return {
      ok: true,
      data: clone(data),
      error: null,
      meta: { timestamp: new Date().toISOString(), ...clone(meta) }
    };
  }

  function failure(code, message, details = {}, meta = {}) {
    return {
      ok: false,
      data: null,
      error: {
        code: String(code || "ABA_ERROR"),
        message: String(message || "Approved Business Action error."),
        details: clone(details)
      },
      meta: { timestamp: new Date().toISOString(), ...clone(meta) }
    };
  }

  function registerService(name, api, metadata = {}) {
    if (!name || typeof api !== "object") {
      return failure("ABA_SERVICE_INVALID", "Service name and API object are required.");
    }
    if (services.has(name)) {
      return failure("ABA_SERVICE_DUPLICATE", `Service already registered: ${name}`);
    }
    services.set(name, { api, metadata: clone(metadata) });
    return success({ name });
  }

  function getService(name) {
    const item = services.get(name);
    return item
      ? success(item.api, { serviceMetadata: item.metadata })
      : failure("ABA_SERVICE_NOT_FOUND", `Service not found: ${name}`);
  }

  function registerRoute(name, handler, metadata = {}) {
    if (!name || typeof handler !== "function") {
      return failure("ABA_ROUTE_INVALID", "Route name and handler are required.");
    }
    if (routes.has(name)) {
      return failure("ABA_ROUTE_DUPLICATE", `Route already registered: ${name}`);
    }
    routes.set(name, { handler, metadata: clone(metadata) });
    return success({ name });
  }

  async function dispatch(name, payload = {}, context = {}) {
    const route = routes.get(name);
    if (!route) return failure("ABA_ROUTE_NOT_FOUND", `Route not found: ${name}`);
    try {
      const result = await route.handler(clone(payload), clone(context));
      return result?.ok === true || result?.ok === false ? result : success(result);
    } catch (error) {
      return failure(
        "ABA_ROUTE_EXECUTION_FAILED",
        error?.message || "Route execution failed.",
        { route: name }
      );
    }
  }

  function on(eventName, listener) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(listener);
    return () => listeners.get(eventName)?.delete(listener);
  }

  async function emit(eventName, payload = {}) {
    const event = {
      eventId: createId("aba_event"),
      eventName,
      payload: clone(payload),
      occurredAt: new Date().toISOString()
    };
    const group = listeners.get(eventName) || new Set();
    const outcomes = await Promise.allSettled(
      [...group].map(listener => listener(clone(event)))
    );
    return success({
      event,
      listenerCount: group.size,
      rejectedCount: outcomes.filter(item => item.status === "rejected").length
    });
  }

  function registerLifecycle(name, definition) {
    if (!name || !definition?.initialState || !Array.isArray(definition.states)) {
      return failure("ABA_LIFECYCLE_INVALID", "Lifecycle name, initialState, and states are required.");
    }
    if (!definition.states.includes(definition.initialState)) {
      return failure("ABA_LIFECYCLE_INITIAL_STATE_INVALID", "initialState must exist in states.");
    }
    lifecycles.set(name, clone(definition));
    return success({ name });
  }

  function validateTransition(name, fromState, toState) {
    const lifecycle = lifecycles.get(name);
    if (!lifecycle) {
      return failure("ABA_LIFECYCLE_NOT_FOUND", `Lifecycle not found: ${name}`);
    }
    const allowed = lifecycle.transitions?.[fromState] || [];
    return allowed.includes(toState)
      ? success({ valid: true, fromState, toState })
      : failure(
          "ABA_TRANSITION_NOT_ALLOWED",
          `Transition not allowed: ${fromState} → ${toState}`,
          { allowed }
        );
  }

  function registerBlock(blockId, metadata = {}) {
    manifest.set(blockId, { blockId, ...clone(metadata) });
    return success(manifest.get(blockId));
  }

  function diagnostics() {
    return success({
      namespace: "window.INFINICUS.ABA",
      serviceCount: services.size,
      routeCount: routes.size,
      lifecycleCount: lifecycles.size,
      blockCount: manifest.size,
      services: [...services.keys()],
      routes: [...routes.keys()],
      lifecycles: [...lifecycles.keys()],
      blocks: [...manifest.values()].map(clone)
    });
  }

  const ACTION_LIFECYCLE = Object.freeze({
    initialState: "draft",
    states: Object.freeze([
      "draft", "pending_validation", "pending_approval", "approved",
      "scheduled", "executing", "completed", "verified", "rejected",
      "revoked", "expired", "blocked", "failed", "partially_completed",
      "rolled_back", "cancelled"
    ]),
    transitions: Object.freeze({
      draft: ["pending_validation", "cancelled"],
      pending_validation: ["pending_approval", "blocked", "cancelled"],
      pending_approval: ["approved", "rejected", "expired", "cancelled"],
      approved: ["scheduled", "revoked", "expired", "blocked"],
      scheduled: ["executing", "revoked", "expired", "blocked", "cancelled"],
      executing: ["completed", "failed", "partially_completed", "rolled_back"],
      completed: ["verified", "rolled_back"],
      partially_completed: ["completed", "failed", "rolled_back"],
      failed: ["rolled_back"],
      blocked: ["pending_validation", "cancelled"],
      verified: [], rejected: [], revoked: [], expired: [], rolled_back: [], cancelled: []
    })
  });

  registerLifecycle("approved_business_action", ACTION_LIFECYCLE);
  registerBlock("ABA-01", {
    name: "Approved Business Action Core Runtime and Registry",
    version: "1.0.0",
    status: "active"
  });

  global.INFINICUS.ABA.runtime = Object.freeze({
    clone, createId, success, failure, registerService, getService,
    registerRoute, dispatch, on, emit, registerLifecycle,
    validateTransition, registerBlock, diagnostics, ACTION_LIFECYCLE
  });
})(window);

/* --- approved-business-action/INFINICUS-ABA-01-Approved-Business-Action-Core-Runtime-Registry/src/manifest.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS?.ABA?.runtime;
  if (!runtime) throw new Error("ABA-01 runtime must load before manifest.");

  const names = [
    "Decision Package Intake and Validation Engine",
    "Action Definition and Business Action Ontology Engine",
    "Action Instance and Lifecycle Registry",
    "Authority, Role and Decision-Rights Engine",
    "Approval Policy and Threshold Engine",
    "Multi-Stage Approval Workflow Engine",
    "Approval Evidence, Signature and Audit Engine",
    "Approved Action Contract Generation Engine",
    "Action Scope, Parameter and Boundary Engine",
    "Constraint and Dependency Revalidation Engine",
    "Conflict, Duplication and Action Collision Engine",
    "Action Decomposition and Execution Plan Engine",
    "Responsible Actor and Task Assignment Engine",
    "Resource Reservation and Availability Engine",
    "Execution Scheduling and Action Queue Engine",
    "Execution Adapter and Connector Registry",
    "Pre-Execution Simulation and Dry-Run Engine",
    "Controlled Action Execution Engine",
    "Execution Failure, Compensation and Rollback Engine",
    "Execution Evidence and Audit Trail Engine",
    "Action Completion and Verification Engine",
    "Expected Outcome and Monitoring Contract Engine",
    "Outcome Monitoring Publication and Handoff Engine"
  ];

  names.forEach((name, index) => {
    runtime.registerBlock(`ABA-${String(index + 2).padStart(2, "0")}`, {
      name,
      version: null,
      status: "planned"
    });
  });
})(window);

/* ===== INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";
  if (!global.INFINICUS?.ABA?.runtime) {
    throw new Error("INFINICUS ABA-01 must be loaded before ABA-02.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine/src/model/decision-package.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.decisionId || !input.recommendationId || !input.businessId) {
      return runtime.failure(
        "ABA_DECISION_PACKAGE_INVALID",
        "decisionId, recommendationId, and businessId are required."
      );
    }

    return runtime.success({
      decisionPackageId:
        input.decisionPackageId || runtime.createId("aba_decision_package"),
      packageVersion: String(input.packageVersion || "1.0.0"),
      sourceLayer: String(input.sourceLayer || "AI_DECISION_INTELLIGENCE"),
      sourceBlock: String(input.sourceBlock || "ADI"),
      decisionId: String(input.decisionId),
      recommendationId: String(input.recommendationId),
      businessId: String(input.businessId),
      twinId: input.twinId ? String(input.twinId) : null,
      simulationRunId: input.simulationRunId ? String(input.simulationRunId) : null,
      scenarioId: input.scenarioId ? String(input.scenarioId) : null,
      recommendation: runtime.clone(input.recommendation || {}),
      decision: runtime.clone(input.decision || {}),
      approvals: runtime.clone(input.approvals || []),
      simulationEvidence: runtime.clone(input.simulationEvidence || {}),
      riskEvidence: runtime.clone(input.riskEvidence || []),
      constraints: runtime.clone(input.constraints || []),
      dependencies: runtime.clone(input.dependencies || []),
      expectedOutcomes: runtime.clone(input.expectedOutcomes || []),
      confidence: Number(input.confidence ?? 0),
      lineage: runtime.clone(input.lineage || []),
      correlationId: input.correlationId || runtime.createId("aba_correlation"),
      causationId: input.causationId || null,
      issuedAt: input.issuedAt || new Date().toISOString(),
      expiresAt: input.expiresAt || null,
      revokedAt: input.revokedAt || null,
      status: String(input.status || "pending_validation")
    });
  }

  global.INFINICUS.ABA.decisionPackageModel = Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine/src/model/intake-policy.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      intakePolicyId:
        input.intakePolicyId || runtime.createId("aba_intake_policy"),
      name: String(input.name || "Default decision intake policy"),
      acceptedPackageVersions:
        runtime.clone(input.acceptedPackageVersions || ["1.0.0"]),
      acceptedSourceLayers:
        runtime.clone(input.acceptedSourceLayers || ["AI_DECISION_INTELLIGENCE"]),
      minimumConfidence:
        Math.max(0, Math.min(1, Number(input.minimumConfidence ?? 0.6))),
      requireSimulationEvidence: input.requireSimulationEvidence !== false,
      requireRiskEvidence: input.requireRiskEvidence !== false,
      requireConstraints: input.requireConstraints !== false,
      requireExpectedOutcomes: input.requireExpectedOutcomes !== false,
      requireApprovalRecord: input.requireApprovalRecord === true,
      allowedDecisionStates:
        runtime.clone(
          input.allowedDecisionStates || ["accepted", "accepted_with_conditions"]
        ),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.intakePolicyModel = Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine/src/validation/validator.js --- */
(function (global) {
  "use strict";

  function validate({ packageData, policy }) {
    const issues = [];
    const add = (code, severity, message, extra = {}) =>
      issues.push({ code, severity, message, ...extra });

    if (!policy.acceptedPackageVersions.includes(packageData.packageVersion)) {
      add("PACKAGE_VERSION_UNSUPPORTED", "high", "Unsupported package version.");
    }

    if (!policy.acceptedSourceLayers.includes(packageData.sourceLayer)) {
      add("SOURCE_LAYER_UNSUPPORTED", "high", "Unsupported source layer.");
    }

    if (!policy.allowedDecisionStates.includes(packageData.decision?.state)) {
      add(
        "DECISION_STATE_NOT_ELIGIBLE",
        "high",
        `Decision state is not eligible: ${packageData.decision?.state || "missing"}`
      );
    }

    if (packageData.confidence < policy.minimumConfidence) {
      add(
        "CONFIDENCE_BELOW_POLICY",
        "high",
        "Decision confidence is below policy.",
        { actual: packageData.confidence, minimum: policy.minimumConfidence }
      );
    }

    if (
      policy.requireSimulationEvidence &&
      Object.keys(packageData.simulationEvidence || {}).length === 0
    ) {
      add("SIMULATION_EVIDENCE_MISSING", "critical", "Simulation evidence is required.");
    }

    if (policy.requireRiskEvidence && !packageData.riskEvidence.length) {
      add("RISK_EVIDENCE_MISSING", "high", "Risk evidence is required.");
    }

    if (policy.requireConstraints && !packageData.constraints.length) {
      add("CONSTRAINTS_MISSING", "high", "Decision constraints are required.");
    }

    if (policy.requireExpectedOutcomes && !packageData.expectedOutcomes.length) {
      add("EXPECTED_OUTCOMES_MISSING", "high", "Expected outcomes are required.");
    }

    if (policy.requireApprovalRecord && !packageData.approvals.length) {
      add("APPROVAL_RECORD_MISSING", "critical", "Approval record is required.");
    }

    if (packageData.revokedAt) {
      add("DECISION_REVOKED", "critical", "Decision package has been revoked.");
    }

    if (
      packageData.expiresAt &&
      new Date(packageData.expiresAt).getTime() <= Date.now()
    ) {
      add("DECISION_EXPIRED", "critical", "Decision package has expired.");
    }

    if (!packageData.lineage.length) {
      add("LINEAGE_MISSING", "high", "Decision package lineage is required.");
    }

    if (!packageData.correlationId) {
      add("CORRELATION_ID_MISSING", "high", "Correlation ID is required.");
    }

    return {
      valid: !issues.some(item =>
        ["high", "critical"].includes(item.severity)
      ),
      issues
    };
  }

  global.INFINICUS.ABA.decisionPackageValidator =
    Object.freeze({ validate });
})(window);

/* --- approved-business-action/INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine/src/security/checksum.js --- */
(function (global) {
  "use strict";

  function stable(value) {
    if (value == null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;

    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }

  function hash(value) {
    const input = stable(value);
    let result = 2166136261;

    for (let index = 0; index < input.length; index += 1) {
      result ^= input.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }

    return `aba_pkg_${(result >>> 0).toString(16).padStart(8, "0")}`;
  }

  global.INFINICUS.ABA.packageChecksum = Object.freeze({ stable, hash });
})(window);

/* --- approved-business-action/INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine/src/storage/intake-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_DECISION_INTAKE";
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
          ["policies", "intakePolicyId"],
          ["packages", "decisionPackageId"],
          ["quarantine", "quarantineRecordId"],
          ["handoffs", "actionDefinitionHandoffId"],
          ["receipts", "intakeReceiptId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "packages") {
              store.createIndex("decisionId", "decisionId", { unique: true });
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
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision intake storage failed."
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
            "ABA_INTAKE_RECORD_NOT_FOUND",
            "Decision intake record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision intake retrieval failed."
      );
    }
  }

  async function getByDecisionId(decisionId) {
    try {
      const db = await open();
      const tx = db.transaction("packages", "readonly");
      const value = await request(
        tx.objectStore("packages").index("decisionId").get(decisionId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_DECISION_PACKAGE_NOT_FOUND",
            "Decision package was not found.",
            { decisionId }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision package retrieval failed."
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
        "ABA_INTAKE_STORAGE_ERROR",
        error?.message || "Decision intake listing failed."
      );
    }
  }

  global.INFINICUS.ABA.intakeStore =
    Object.freeze({ open, put, get, getByDecisionId, list });
})(window);

/* --- approved-business-action/INFINICUS-ABA-02-Decision-Package-Intake-Validation-Engine/src/engine/intake-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerPolicy(input = {}) {
    const built = global.INFINICUS.ABA.intakePolicyModel.create(input);
    if (!built.ok) return built;

    return global.INFINICUS.ABA.intakeStore.put("policies", built.data);
  }

  async function intake({ packageInput, intakePolicyId } = {}) {
    const policy =
      await global.INFINICUS.ABA.intakeStore.get("policies", intakePolicyId);

    if (!policy.ok) return policy;

    const built =
      global.INFINICUS.ABA.decisionPackageModel.create(packageInput);

    if (!built.ok) return built;

    const existing =
      await global.INFINICUS.ABA.intakeStore.getByDecisionId(
        built.data.decisionId
      );

    if (existing.ok) {
      return runtime.success({
        acceptedPackage: existing.data,
        idempotentReplay: true
      });
    }

    const validation =
      global.INFINICUS.ABA.decisionPackageValidator.validate({
        packageData: built.data,
        policy: policy.data
      });

    const checksum =
      global.INFINICUS.ABA.packageChecksum.hash(built.data);

    if (!validation.valid) {
      const quarantineRecord = {
        quarantineRecordId: runtime.createId("aba_quarantine"),
        decisionPackageId: built.data.decisionPackageId,
        decisionId: built.data.decisionId,
        businessId: built.data.businessId,
        packageChecksum: checksum,
        issues: validation.issues,
        packageData: runtime.clone(built.data),
        status: "quarantined",
        correlationId: built.data.correlationId,
        createdAt: new Date().toISOString()
      };

      await global.INFINICUS.ABA.intakeStore.put(
        "quarantine",
        quarantineRecord
      );

      await runtime.emit(
        "aba.decision_package.quarantined",
        quarantineRecord
      );

      return runtime.failure(
        "ABA_DECISION_PACKAGE_REJECTED",
        "Decision package failed intake validation.",
        quarantineRecord
      );
    }

    const acceptedPackage = {
      ...runtime.clone(built.data),
      packageChecksum: checksum,
      validation: runtime.clone(validation),
      intakePolicyId,
      status: "accepted",
      acceptedAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.intakeStore.put(
      "packages",
      acceptedPackage
    );

    const receipt = {
      intakeReceiptId: runtime.createId("aba_intake_receipt"),
      decisionPackageId: acceptedPackage.decisionPackageId,
      decisionId: acceptedPackage.decisionId,
      businessId: acceptedPackage.businessId,
      packageChecksum: acceptedPackage.packageChecksum,
      intakePolicyId,
      status: "accepted",
      correlationId: acceptedPackage.correlationId,
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.intakeStore.put("receipts", receipt);

    const handoff = {
      actionDefinitionHandoffId:
        runtime.createId("aba_action_definition_handoff"),
      targetBlock: "ABA-03",
      decisionPackageId: acceptedPackage.decisionPackageId,
      packageChecksum: acceptedPackage.packageChecksum,
      businessId: acceptedPackage.businessId,
      twinId: acceptedPackage.twinId,
      simulationRunId: acceptedPackage.simulationRunId,
      scenarioId: acceptedPackage.scenarioId,
      decisionId: acceptedPackage.decisionId,
      recommendationId: acceptedPackage.recommendationId,
      recommendation: runtime.clone(acceptedPackage.recommendation),
      decision: runtime.clone(acceptedPackage.decision),
      approvals: acceptedPackage.approvals.map(runtime.clone),
      simulationEvidence: runtime.clone(acceptedPackage.simulationEvidence),
      riskEvidence: acceptedPackage.riskEvidence.map(runtime.clone),
      constraints: acceptedPackage.constraints.map(runtime.clone),
      dependencies: acceptedPackage.dependencies.map(runtime.clone),
      expectedOutcomes: acceptedPackage.expectedOutcomes.map(runtime.clone),
      confidence: acceptedPackage.confidence,
      lineage: acceptedPackage.lineage.map(runtime.clone),
      correlationId: acceptedPackage.correlationId,
      causationId: acceptedPackage.causationId,
      status: "ready",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.intakeStore.put("handoffs", handoff);

    await runtime.emit("aba.decision_package.accepted", {
      acceptedPackage,
      receipt,
      actionDefinitionHandoffId: handoff.actionDefinitionHandoffId
    });

    return runtime.success({
      acceptedPackage,
      receipt,
      actionDefinitionHandoff: handoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    intake,
    getAcceptedPackage: ({ decisionPackageId }) =>
      global.INFINICUS.ABA.intakeStore.get("packages", decisionPackageId),
    getActionDefinitionHandoff: ({ actionDefinitionHandoffId }) =>
      global.INFINICUS.ABA.intakeStore.get("handoffs", actionDefinitionHandoffId),
    listQuarantinedPackages: () =>
      global.INFINICUS.ABA.intakeStore.list("quarantine"),
    listAcceptedPackages: () =>
      global.INFINICUS.ABA.intakeStore.list("packages")
  });

  runtime.registerService(
    "aba.decision_package_intake",
    api,
    { block: "ABA-02" }
  );

  runtime.registerRoute(
    "aba.intake_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.decision_package.intake",
    intake
  );

  runtime.registerBlock("ABA-02", {
    name: "Decision Package Intake and Validation Engine",
    version: "1.0.0",
    status: "active"
  });

  global.INFINICUS.ABA.decisionPackageIntakeEngine = api;
})(window);

/* ===== INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";
  const ABA = global.INFINICUS?.ABA;
  if (!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-03.");
  if (!ABA?.decisionPackageIntakeEngine) {
    throw new Error("ABA-02 must be loaded before ABA-03.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/model/action-category.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_ACTION_CATEGORY_INVALID",
        "Action category name and code are required."
      );
    }

    return runtime.success({
      actionCategoryId:
        input.actionCategoryId || runtime.createId("aba_action_category"),
      name: String(input.name),
      code: String(input.code)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      description: String(input.description || ""),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionCategoryModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/model/target-type.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_TARGET_TYPE_INVALID",
        "Target type name and code are required."
      );
    }

    return runtime.success({
      targetTypeId:
        input.targetTypeId || runtime.createId("aba_target_type"),
      name: String(input.name),
      code: String(input.code)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      allowedReferencePatterns:
        runtime.clone(input.allowedReferencePatterns || []),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.targetTypeModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/model/action-type.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.name ||
      !input.code ||
      !input.actionCategoryId ||
      !input.targetTypeId
    ) {
      return runtime.failure(
        "ABA_ACTION_TYPE_INVALID",
        "name, code, actionCategoryId, and targetTypeId are required."
      );
    }

    return runtime.success({
      actionTypeId:
        input.actionTypeId || runtime.createId("aba_action_type"),
      name: String(input.name),
      code: String(input.code)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      description: String(input.description || ""),
      actionCategoryId: String(input.actionCategoryId),
      targetTypeId: String(input.targetTypeId),
      requiredParameters:
        runtime.clone(input.requiredParameters || []),
      optionalParameters:
        runtime.clone(input.optionalParameters || []),
      reversibility:
        String(input.reversibility || "conditional"),
      requiredApprovalClass:
        String(input.requiredApprovalClass || "standard"),
      requiredMonitoring:
        runtime.clone(input.requiredMonitoring || []),
      supportedAdapterCodes:
        runtime.clone(input.supportedAdapterCodes || []),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionTypeModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/model/parameter-schema.js --- */
(function (global) {
  "use strict";

  const TYPES = Object.freeze([
    "string", "number", "integer", "boolean",
    "currency", "percentage", "date", "datetime",
    "object", "array"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.name ||
      !input.code ||
      !TYPES.includes(input.valueType)
    ) {
      return runtime.failure(
        "ABA_PARAMETER_SCHEMA_INVALID",
        "name, code, and supported valueType are required."
      );
    }

    return runtime.success({
      parameterSchemaId:
        input.parameterSchemaId || runtime.createId("aba_parameter_schema"),
      name: String(input.name),
      code: String(input.code),
      valueType: input.valueType,
      unit: input.unit || null,
      minimum: input.minimum ?? null,
      maximum: input.maximum ?? null,
      allowedValues: runtime.clone(input.allowedValues || []),
      required: Boolean(input.required),
      sensitive: Boolean(input.sensitive),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.parameterSchemaModel =
    Object.freeze({ TYPES, create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/validation/action-definition-validator.js --- */
(function (global) {
  "use strict";

  function valueTypeMatches(value, type) {
    if (type === "integer") return Number.isInteger(value);
    if (type === "number" || type === "currency" || type === "percentage") {
      return typeof value === "number" && Number.isFinite(value);
    }
    if (type === "array") return Array.isArray(value);
    if (type === "object") {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    if (type === "boolean") return typeof value === "boolean";
    if (type === "date" || type === "datetime") {
      return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
    }
    return typeof value === "string";
  }

  function validateParameter(schema, value) {
    const issues = [];

    if (value == null) {
      if (schema.required) {
        issues.push(`Required parameter is missing: ${schema.code}`);
      }
      return issues;
    }

    if (!valueTypeMatches(value, schema.valueType)) {
      issues.push(`Invalid value type for ${schema.code}`);
      return issues;
    }

    if (
      typeof value === "number" &&
      schema.minimum != null &&
      value < schema.minimum
    ) {
      issues.push(`${schema.code} is below minimum.`);
    }

    if (
      typeof value === "number" &&
      schema.maximum != null &&
      value > schema.maximum
    ) {
      issues.push(`${schema.code} exceeds maximum.`);
    }

    if (
      schema.allowedValues.length &&
      !schema.allowedValues.some(item =>
        JSON.stringify(item) === JSON.stringify(value)
      )
    ) {
      issues.push(`${schema.code} contains an unsupported value.`);
    }

    return issues;
  }

  function validateDefinition({
    actionType,
    target,
    parameters,
    parameterSchemas
  }) {
    const issues = [];

    if (!target?.targetId || !target?.targetTypeId) {
      issues.push("Action target is incomplete.");
    }

    if (target?.targetTypeId !== actionType.targetTypeId) {
      issues.push("Action target type does not match action type.");
    }

    const schemaById =
      new Map(
        parameterSchemas.map(item => [item.parameterSchemaId, item])
      );

    const requiredIds =
      new Set(actionType.requiredParameters || []);

    for (const schemaId of requiredIds) {
      const schema = schemaById.get(schemaId);

      if (!schema) {
        issues.push(`Unknown required parameter schema: ${schemaId}`);
        continue;
      }

      issues.push(
        ...validateParameter(schema, parameters[schema.code])
      );
    }

    for (const schemaId of actionType.optionalParameters || []) {
      const schema = schemaById.get(schemaId);
      if (!schema) {
        issues.push(`Unknown optional parameter schema: ${schemaId}`);
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(parameters, schema.code)) {
        issues.push(
          ...validateParameter(schema, parameters[schema.code])
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.ABA.actionDefinitionValidator =
    Object.freeze({ valueTypeMatches, validateParameter, validateDefinition });
})(window);

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/storage/ontology-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_ONTOLOGY";
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
          ["categories", "actionCategoryId"],
          ["targets", "targetTypeId"],
          ["parameters", "parameterSchemaId"],
          ["action_types", "actionTypeId"],
          ["definitions", "actionDefinitionId"],
          ["quarantine", "actionDefinitionQuarantineId"],
          ["handoffs", "actionInstanceHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "action_types") {
              store.createIndex("code", "code", { unique: true });
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
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ABA_ONTOLOGY_STORAGE_ERROR",
        error?.message || "Action ontology storage failed."
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
            "ABA_ONTOLOGY_RECORD_NOT_FOUND",
            "Action ontology record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_ONTOLOGY_STORAGE_ERROR",
        error?.message || "Action ontology retrieval failed."
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
        "ABA_ONTOLOGY_STORAGE_ERROR",
        error?.message || "Action ontology listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionOntologyStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- approved-business-action/INFINICUS-ABA-03-Action-Definition-Business-Action-Ontology-Engine/src/engine/action-definition-ontology-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerCategory(input = {}) {
    const built = global.INFINICUS.ABA.actionCategoryModel.create(input);
    if (!built.ok) return built;
    return global.INFINICUS.ABA.actionOntologyStore.put("categories", built.data);
  }

  async function registerTargetType(input = {}) {
    const built = global.INFINICUS.ABA.targetTypeModel.create(input);
    if (!built.ok) return built;
    return global.INFINICUS.ABA.actionOntologyStore.put("targets", built.data);
  }

  async function registerParameterSchema(input = {}) {
    const built = global.INFINICUS.ABA.parameterSchemaModel.create(input);
    if (!built.ok) return built;
    return global.INFINICUS.ABA.actionOntologyStore.put("parameters", built.data);
  }

  async function registerActionType(input = {}) {
    const category =
      await global.INFINICUS.ABA.actionOntologyStore.get(
        "categories",
        input.actionCategoryId
      );
    if (!category.ok) return category;

    const target =
      await global.INFINICUS.ABA.actionOntologyStore.get(
        "targets",
        input.targetTypeId
      );
    if (!target.ok) return target;

    const built = global.INFINICUS.ABA.actionTypeModel.create(input);
    if (!built.ok) return built;

    return global.INFINICUS.ABA.actionOntologyStore.put(
      "action_types",
      built.data
    );
  }

  async function defineAction({
    actionDefinitionHandoffId,
    actionTypeId,
    target,
    parameters = {}
  } = {}) {
    const handoff =
      await global.INFINICUS.ABA.decisionPackageIntakeEngine
        .getActionDefinitionHandoff({ actionDefinitionHandoffId });

    if (!handoff.ok) return handoff;

    const actionType =
      await global.INFINICUS.ABA.actionOntologyStore.get(
        "action_types",
        actionTypeId
      );

    if (!actionType.ok) return actionType;

    const parameterResult =
      await global.INFINICUS.ABA.actionOntologyStore.list("parameters");

    if (!parameterResult.ok) return parameterResult;

    const validation =
      global.INFINICUS.ABA.actionDefinitionValidator.validateDefinition({
        actionType: actionType.data,
        target,
        parameters,
        parameterSchemas: parameterResult.data
      });

    if (!validation.valid) {
      const quarantine = {
        actionDefinitionQuarantineId:
          runtime.createId("aba_action_definition_quarantine"),
        actionDefinitionHandoffId,
        actionTypeId,
        target: runtime.clone(target),
        parameters: runtime.clone(parameters),
        issues: validation.issues,
        businessId: handoff.data.businessId,
        decisionId: handoff.data.decisionId,
        correlationId: handoff.data.correlationId,
        status: "quarantined",
        createdAt: new Date().toISOString()
      };

      await global.INFINICUS.ABA.actionOntologyStore.put(
        "quarantine",
        quarantine
      );

      return runtime.failure(
        "ABA_ACTION_DEFINITION_REJECTED",
        "Action definition failed ontology validation.",
        quarantine
      );
    }

    const definition = {
      actionDefinitionId:
        runtime.createId("aba_action_definition"),
      actionDefinitionHandoffId,
      decisionPackageId: handoff.data.decisionPackageId,
      packageChecksum: handoff.data.packageChecksum,
      businessId: handoff.data.businessId,
      twinId: handoff.data.twinId,
      simulationRunId: handoff.data.simulationRunId,
      scenarioId: handoff.data.scenarioId,
      decisionId: handoff.data.decisionId,
      recommendationId: handoff.data.recommendationId,
      actionTypeId: actionType.data.actionTypeId,
      actionTypeCode: actionType.data.code,
      actionCategoryId: actionType.data.actionCategoryId,
      target: runtime.clone(target),
      parameters: runtime.clone(parameters),
      reversibility: actionType.data.reversibility,
      requiredApprovalClass: actionType.data.requiredApprovalClass,
      requiredMonitoring: runtime.clone(actionType.data.requiredMonitoring),
      supportedAdapterCodes:
        runtime.clone(actionType.data.supportedAdapterCodes),
      constraints: handoff.data.constraints.map(runtime.clone),
      dependencies: handoff.data.dependencies.map(runtime.clone),
      expectedOutcomes: handoff.data.expectedOutcomes.map(runtime.clone),
      riskEvidence: handoff.data.riskEvidence.map(runtime.clone),
      simulationEvidence: runtime.clone(handoff.data.simulationEvidence),
      confidence: handoff.data.confidence,
      lineage: handoff.data.lineage.map(runtime.clone),
      correlationId: handoff.data.correlationId,
      causationId: handoff.data.causationId,
      status: "defined",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionOntologyStore.put(
      "definitions",
      definition
    );

    const instanceHandoff = {
      actionInstanceHandoffId:
        runtime.createId("aba_action_instance_handoff"),
      targetBlock: "ABA-04",
      actionDefinitionId: definition.actionDefinitionId,
      businessId: definition.businessId,
      twinId: definition.twinId,
      simulationRunId: definition.simulationRunId,
      scenarioId: definition.scenarioId,
      decisionId: definition.decisionId,
      recommendationId: definition.recommendationId,
      actionTypeId: definition.actionTypeId,
      actionTypeCode: definition.actionTypeCode,
      actionCategoryId: definition.actionCategoryId,
      target: runtime.clone(definition.target),
      parameters: runtime.clone(definition.parameters),
      reversibility: definition.reversibility,
      requiredApprovalClass: definition.requiredApprovalClass,
      requiredMonitoring: runtime.clone(definition.requiredMonitoring),
      supportedAdapterCodes: runtime.clone(definition.supportedAdapterCodes),
      constraints: definition.constraints.map(runtime.clone),
      dependencies: definition.dependencies.map(runtime.clone),
      expectedOutcomes: definition.expectedOutcomes.map(runtime.clone),
      riskEvidence: definition.riskEvidence.map(runtime.clone),
      simulationEvidence: runtime.clone(definition.simulationEvidence),
      confidence: definition.confidence,
      lineage: definition.lineage.map(runtime.clone),
      correlationId: definition.correlationId,
      causationId: definition.causationId,
      status: "ready",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionOntologyStore.put(
      "handoffs",
      instanceHandoff
    );

    await runtime.emit("aba.action_definition.created", {
      actionDefinition: definition,
      actionInstanceHandoffId: instanceHandoff.actionInstanceHandoffId
    });

    return runtime.success({
      actionDefinition: definition,
      actionInstanceHandoff: instanceHandoff
    });
  }

  const api = Object.freeze({
    registerCategory,
    registerTargetType,
    registerParameterSchema,
    registerActionType,
    defineAction,
    getActionDefinition: ({ actionDefinitionId }) =>
      global.INFINICUS.ABA.actionOntologyStore.get(
        "definitions",
        actionDefinitionId
      ),
    getActionInstanceHandoff: ({ actionInstanceHandoffId }) =>
      global.INFINICUS.ABA.actionOntologyStore.get(
        "handoffs",
        actionInstanceHandoffId
      ),
    listActionTypes: () =>
      global.INFINICUS.ABA.actionOntologyStore.list("action_types"),
    listQuarantinedDefinitions: () =>
      global.INFINICUS.ABA.actionOntologyStore.list("quarantine")
  });

  runtime.registerService(
    "aba.action_definition_ontology",
    api,
    { block: "ABA-03" }
  );

  runtime.registerRoute("aba.action_category.register", registerCategory);
  runtime.registerRoute("aba.target_type.register", registerTargetType);
  runtime.registerRoute(
    "aba.parameter_schema.register",
    registerParameterSchema
  );
  runtime.registerRoute("aba.action_type.register", registerActionType);
  runtime.registerRoute("aba.action_definition.create", defineAction);

  runtime.registerBlock("ABA-03", {
    name: "Action Definition and Business Action Ontology Engine",
    version: "1.0.0",
    status: "active"
  });

  global.INFINICUS.ABA.actionDefinitionOntologyEngine = api;
})(window);

/* ===== INFINICUS-ABA-04-Action-Instance-Lifecycle-Registry ===== */

/* --- approved-business-action/INFINICUS-ABA-04-Action-Instance-Lifecycle-Registry/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";
  const ABA = global.INFINICUS?.ABA;

  if (!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-04.");
  if (!ABA?.actionDefinitionOntologyEngine) {
    throw new Error("ABA-03 must be loaded before ABA-04.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-04-Action-Instance-Lifecycle-Registry/src/model/action-instance.js --- */
(function (global) {
  "use strict";

  function create(handoff, input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      actionInstanceId:
        input.actionInstanceId || runtime.createId("aba_action_instance"),
      actionDefinitionId: handoff.actionDefinitionId,
      businessId: handoff.businessId,
      twinId: handoff.twinId,
      simulationRunId: handoff.simulationRunId,
      scenarioId: handoff.scenarioId,
      decisionId: handoff.decisionId,
      recommendationId: handoff.recommendationId,
      actionTypeId: handoff.actionTypeId,
      actionTypeCode: handoff.actionTypeCode,
      actionCategoryId: handoff.actionCategoryId,
      target: runtime.clone(handoff.target),
      parameters: runtime.clone(handoff.parameters),
      reversibility: handoff.reversibility,
      requiredApprovalClass: handoff.requiredApprovalClass,
      requiredMonitoring: runtime.clone(handoff.requiredMonitoring),
      supportedAdapterCodes: runtime.clone(handoff.supportedAdapterCodes),
      constraints: handoff.constraints.map(runtime.clone),
      dependencies: handoff.dependencies.map(runtime.clone),
      expectedOutcomes: handoff.expectedOutcomes.map(runtime.clone),
      riskEvidence: handoff.riskEvidence.map(runtime.clone),
      simulationEvidence: runtime.clone(handoff.simulationEvidence),
      confidence: handoff.confidence,
      lineage: handoff.lineage.map(runtime.clone),
      correlationId: handoff.correlationId,
      causationId: handoff.causationId,
      lifecycleName: "approved_business_action",
      state: "draft",
      version: 1,
      expiresAt: input.expiresAt || null,
      revokedAt: null,
      blockedReason: null,
      createdBy: input.createdBy || "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionInstanceModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-04-Action-Instance-Lifecycle-Registry/src/model/transition-record.js --- */
(function (global) {
  "use strict";

  function create({
    actionInstance,
    fromState,
    toState,
    actorId,
    actorType,
    reason,
    metadata
  }) {
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      actionTransitionId:
        runtime.createId("aba_action_transition"),
      actionInstanceId:
        actionInstance.actionInstanceId,
      actionDefinitionId:
        actionInstance.actionDefinitionId,
      businessId:
        actionInstance.businessId,
      fromState,
      toState,
      actorId: actorId || "system",
      actorType: actorType || "system",
      reason: reason || null,
      metadata: runtime.clone(metadata || {}),
      version: actionInstance.version + 1,
      correlationId:
        actionInstance.correlationId,
      occurredAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionTransitionModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-04-Action-Instance-Lifecycle-Registry/src/validation/instance-validator.js --- */
(function (global) {
  "use strict";

  function validateCreate(handoff, input = {}) {
    const issues = [];

    if (!handoff.actionDefinitionId) {
      issues.push("Action definition ID is required.");
    }

    if (!handoff.businessId) {
      issues.push("Business ID is required.");
    }

    if (!handoff.actionTypeId || !handoff.target) {
      issues.push("Action type and target are required.");
    }

    if (
      input.expiresAt &&
      new Date(input.expiresAt).getTime() <= Date.now()
    ) {
      issues.push("Action instance expiry must be in the future.");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  function validateTransitionInput({
    currentVersion,
    expectedVersion,
    toState,
    expiresAt,
    revokedAt
  }) {
    const issues = [];

    if (
      expectedVersion != null &&
      Number(expectedVersion) !== Number(currentVersion)
    ) {
      issues.push("Action instance version conflict.");
    }

    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      if (!["expired", "cancelled"].includes(toState)) {
        issues.push("Expired action cannot transition to the requested state.");
      }
    }

    if (revokedAt && toState !== "revoked") {
      issues.push("Revoked action cannot transition to another state.");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.ABA.actionInstanceValidator =
    Object.freeze({ validateCreate, validateTransitionInput });
})(window);

/* --- approved-business-action/INFINICUS-ABA-04-Action-Instance-Lifecycle-Registry/src/storage/lifecycle-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_LIFECYCLE";
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

        if (!db.objectStoreNames.contains("instances")) {
          const store = db.createObjectStore(
            "instances",
            { keyPath: "actionInstanceId" }
          );

          store.createIndex(
            "actionDefinitionId",
            "actionDefinitionId",
            { unique: true }
          );

          store.createIndex(
            "businessId",
            "businessId",
            { unique: false }
          );
        }

        for (const [name, keyPath] of [
          ["transitions", "actionTransitionId"],
          ["authority_handoffs", "authorityHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "transitions") {
              store.createIndex(
                "actionInstanceId",
                "actionInstanceId",
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
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action lifecycle storage failed."
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
            "ABA_LIFECYCLE_RECORD_NOT_FOUND",
            "Action lifecycle record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action lifecycle retrieval failed."
      );
    }
  }

  async function getByDefinitionId(actionDefinitionId) {
    try {
      const db = await open();
      const tx = db.transaction("instances", "readonly");
      const value = await request(
        tx.objectStore("instances")
          .index("actionDefinitionId")
          .get(actionDefinitionId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_ACTION_INSTANCE_NOT_FOUND",
            "Action instance was not found.",
            { actionDefinitionId }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action instance retrieval failed."
      );
    }
  }

  async function listTransitions(actionInstanceId) {
    try {
      const db = await open();
      const tx = db.transaction("transitions", "readonly");
      const values = await request(
        tx.objectStore("transitions")
          .index("actionInstanceId")
          .getAll(actionInstanceId)
      );

      return runtime.success(
        values
          .map(structuredClone)
          .sort((a, b) =>
            new Date(a.occurredAt).getTime() -
            new Date(b.occurredAt).getTime()
          )
      );
    } catch (error) {
      return runtime.failure(
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action transition listing failed."
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
        "ABA_LIFECYCLE_STORAGE_ERROR",
        error?.message || "Action lifecycle listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionLifecycleStore =
    Object.freeze({
      open,
      put,
      get,
      getByDefinitionId,
      listTransitions,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-04-Action-Instance-Lifecycle-Registry/src/engine/action-instance-lifecycle-registry.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function createInstance({
    actionInstanceHandoffId,
    createdBy,
    expiresAt
  } = {}) {
    const handoff =
      await global.INFINICUS.ABA.actionDefinitionOntologyEngine
        .getActionInstanceHandoff({ actionInstanceHandoffId });

    if (!handoff.ok) return handoff;

    const existing =
      await global.INFINICUS.ABA.actionLifecycleStore
        .getByDefinitionId(handoff.data.actionDefinitionId);

    if (existing.ok) {
      return runtime.success({
        actionInstance: existing.data,
        idempotentReplay: true
      });
    }

    const validation =
      global.INFINICUS.ABA.actionInstanceValidator.validateCreate(
        handoff.data,
        { expiresAt }
      );

    if (!validation.valid) {
      return runtime.failure(
        "ABA_ACTION_INSTANCE_INVALID",
        "Action instance validation failed.",
        validation
      );
    }

    const built =
      global.INFINICUS.ABA.actionInstanceModel.create(
        handoff.data,
        { createdBy, expiresAt }
      );

    if (!built.ok) return built;

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "instances",
      built.data
    );

    const initialTransition =
      global.INFINICUS.ABA.actionTransitionModel.create({
        actionInstance: { ...built.data, version: 0 },
        fromState: null,
        toState: "draft",
        actorId: createdBy || "system",
        actorType: "system",
        reason: "Action instance created.",
        metadata: {
          actionInstanceHandoffId
        }
      });

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "transitions",
      initialTransition.data
    );

    await runtime.emit("aba.action_instance.created", {
      actionInstance: built.data
    });

    return runtime.success({
      actionInstance: built.data,
      initialTransition: initialTransition.data
    });
  }

  async function transition({
    actionInstanceId,
    toState,
    actorId,
    actorType,
    reason,
    metadata = {},
    expectedVersion
  } = {}) {
    const current =
      await global.INFINICUS.ABA.actionLifecycleStore.get(
        "instances",
        actionInstanceId
      );

    if (!current.ok) return current;

    const inputValidation =
      global.INFINICUS.ABA.actionInstanceValidator
        .validateTransitionInput({
          currentVersion: current.data.version,
          expectedVersion,
          toState,
          expiresAt: current.data.expiresAt,
          revokedAt: current.data.revokedAt
        });

    if (!inputValidation.valid) {
      return runtime.failure(
        "ABA_ACTION_TRANSITION_INPUT_INVALID",
        "Action transition input validation failed.",
        inputValidation
      );
    }

    const lifecycleValidation =
      runtime.validateTransition(
        current.data.lifecycleName,
        current.data.state,
        toState
      );

    if (!lifecycleValidation.ok) return lifecycleValidation;

    const transitionRecord =
      global.INFINICUS.ABA.actionTransitionModel.create({
        actionInstance: current.data,
        fromState: current.data.state,
        toState,
        actorId,
        actorType,
        reason,
        metadata
      });

    if (!transitionRecord.ok) return transitionRecord;

    const updated = {
      ...runtime.clone(current.data),
      state: toState,
      version: current.data.version + 1,
      updatedAt: new Date().toISOString(),
      revokedAt:
        toState === "revoked"
          ? new Date().toISOString()
          : current.data.revokedAt,
      blockedReason:
        toState === "blocked"
          ? reason || "Action blocked."
          : current.data.blockedReason
    };

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "instances",
      updated
    );

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "transitions",
      transitionRecord.data
    );

    let authorityHandoff = null;

    if (toState === "pending_approval") {
      authorityHandoff = {
        authorityHandoffId:
          runtime.createId("aba_authority_handoff"),
        targetBlock: "ABA-05",
        actionInstanceId: updated.actionInstanceId,
        actionDefinitionId: updated.actionDefinitionId,
        businessId: updated.businessId,
        twinId: updated.twinId,
        decisionId: updated.decisionId,
        recommendationId: updated.recommendationId,
        actionTypeId: updated.actionTypeId,
        actionTypeCode: updated.actionTypeCode,
        actionCategoryId: updated.actionCategoryId,
        target: runtime.clone(updated.target),
        parameters: runtime.clone(updated.parameters),
        requiredApprovalClass: updated.requiredApprovalClass,
        reversibility: updated.reversibility,
        constraints: updated.constraints.map(runtime.clone),
        dependencies: updated.dependencies.map(runtime.clone),
        riskEvidence: updated.riskEvidence.map(runtime.clone),
        expectedOutcomes: updated.expectedOutcomes.map(runtime.clone),
        confidence: updated.confidence,
        lineage: updated.lineage.map(runtime.clone),
        correlationId: updated.correlationId,
        causationId: updated.causationId,
        status: "ready",
        createdAt: new Date().toISOString()
      };

      await global.INFINICUS.ABA.actionLifecycleStore.put(
        "authority_handoffs",
        authorityHandoff
      );
    }

    await runtime.emit("aba.action_instance.transitioned", {
      actionInstance: updated,
      transitionRecord: transitionRecord.data,
      authorityHandoffId:
        authorityHandoff?.authorityHandoffId || null
    });

    return runtime.success({
      actionInstance: updated,
      transitionRecord: transitionRecord.data,
      authorityHandoff
    });
  }

  const api = Object.freeze({
    createInstance,
    transition,
    getActionInstance: ({ actionInstanceId }) =>
      global.INFINICUS.ABA.actionLifecycleStore.get(
        "instances",
        actionInstanceId
      ),
    getAuthorityHandoff: ({ authorityHandoffId }) =>
      global.INFINICUS.ABA.actionLifecycleStore.get(
        "authority_handoffs",
        authorityHandoffId
      ),
    listActionTransitions: ({ actionInstanceId }) =>
      global.INFINICUS.ABA.actionLifecycleStore.listTransitions(
        actionInstanceId
      ),
    listActionInstances: () =>
      global.INFINICUS.ABA.actionLifecycleStore.list("instances")
  });

  runtime.registerService(
    "aba.action_instance_lifecycle",
    api,
    { block: "ABA-04" }
  );

  runtime.registerRoute("aba.action_instance.create", createInstance);
  runtime.registerRoute("aba.action_instance.transition", transition);

  runtime.registerBlock("ABA-04", {
    name: "Action Instance and Lifecycle Registry",
    version: "1.0.0",
    status: "active"
  });

  global.INFINICUS.ABA.actionInstanceLifecycleRegistry = api;
})(window);

/* ===== INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if (!ABA?.runtime) {
    throw new Error("ABA-01 must be loaded before ABA-05.");
  }

  if (!ABA?.actionInstanceLifecycleRegistry) {
    throw new Error("ABA-04 must be loaded before ABA-05.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/model/role.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_ROLE_INVALID",
        "Role name and code are required."
      );
    }

    return runtime.success({
      roleId:
        input.roleId || runtime.createId("aba_role"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      departmentId:
        input.departmentId || null,
      legalEntityId:
        input.legalEntityId || null,
      rank:
        Number(input.rank || 0),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.roleModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/model/authority-scope.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.scopeType) {
      return runtime.failure(
        "ABA_AUTHORITY_SCOPE_INVALID",
        "Authority scope name and scopeType are required."
      );
    }

    return runtime.success({
      authorityScopeId:
        input.authorityScopeId ||
        runtime.createId("aba_authority_scope"),
      name:
        String(input.name),
      scopeType:
        String(input.scopeType),
      businessIds:
        runtime.clone(input.businessIds || []),
      legalEntityIds:
        runtime.clone(input.legalEntityIds || []),
      departmentIds:
        runtime.clone(input.departmentIds || []),
      geographicCodes:
        runtime.clone(input.geographicCodes || []),
      actionCategoryIds:
        runtime.clone(input.actionCategoryIds || []),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      targetTypeIds:
        runtime.clone(input.targetTypeIds || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.authorityScopeModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/model/decision-right.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.roleId ||
      !input.authorityScopeId ||
      !input.approvalClass
    ) {
      return runtime.failure(
        "ABA_DECISION_RIGHT_INVALID",
        "roleId, authorityScopeId, and approvalClass are required."
      );
    }

    return runtime.success({
      decisionRightId:
        input.decisionRightId ||
        runtime.createId("aba_decision_right"),
      roleId:
        String(input.roleId),
      authorityScopeId:
        String(input.authorityScopeId),
      approvalClass:
        String(input.approvalClass),
      maximumFinancialValue:
        input.maximumFinancialValue == null
          ? null
          : Number(input.maximumFinancialValue),
      currency:
        String(input.currency || "USD"),
      allowedRiskSeverities:
        runtime.clone(
          input.allowedRiskSeverities ||
          ["low", "medium"]
        ),
      mayDelegate:
        Boolean(input.mayDelegate),
      requiresNoConflict:
        input.requiresNoConflict !== false,
      status:
        String(input.status || "active"),
      validFrom:
        input.validFrom || new Date().toISOString(),
      validUntil:
        input.validUntil || null,
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.decisionRightModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/model/delegation.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.delegatorActorId ||
      !input.delegateActorId ||
      !input.decisionRightId
    ) {
      return runtime.failure(
        "ABA_DELEGATION_INVALID",
        "delegatorActorId, delegateActorId, and decisionRightId are required."
      );
    }

    return runtime.success({
      delegationId:
        input.delegationId ||
        runtime.createId("aba_delegation"),
      delegatorActorId:
        String(input.delegatorActorId),
      delegateActorId:
        String(input.delegateActorId),
      decisionRightId:
        String(input.decisionRightId),
      reason:
        String(input.reason || ""),
      validFrom:
        input.validFrom || new Date().toISOString(),
      validUntil:
        input.validUntil || null,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.delegationModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/validation/authority-evaluator.js --- */
(function (global) {
  "use strict";

  function includesOrOpen(values, value) {
    return !values.length || values.includes(value);
  }

  function withinPeriod(record, now = Date.now()) {
    const from = record.validFrom
      ? new Date(record.validFrom).getTime()
      : -Infinity;

    const until = record.validUntil
      ? new Date(record.validUntil).getTime()
      : Infinity;

    return now >= from && now <= until;
  }

  function scopeMatches(scope, action) {
    return (
      includesOrOpen(scope.businessIds, action.businessId) &&
      includesOrOpen(scope.legalEntityIds, action.legalEntityId || null) &&
      includesOrOpen(scope.departmentIds, action.departmentId || null) &&
      includesOrOpen(scope.geographicCodes, action.geographicCode || null) &&
      includesOrOpen(scope.actionCategoryIds, action.actionCategoryId) &&
      includesOrOpen(scope.actionTypeIds, action.actionTypeId) &&
      includesOrOpen(
        scope.targetTypeIds,
        action.target?.targetTypeId || null
      )
    );
  }

  function evaluate({
    actor,
    role,
    decisionRight,
    scope,
    delegation,
    action,
    financialValue,
    currency,
    riskSeverity,
    conflicts = []
  }) {
    const issues = [];

    if (!actor?.actorId) {
      issues.push("Actor ID is required.");
    }

    if (!role || role.status !== "active") {
      issues.push("Actor role is not active.");
    }

    if (!decisionRight || decisionRight.status !== "active") {
      issues.push("Decision right is not active.");
    }

    if (!scope || scope.status !== "active") {
      issues.push("Authority scope is not active.");
    }

    if (decisionRight && !withinPeriod(decisionRight)) {
      issues.push("Decision right is outside its valid period.");
    }

    if (
      decisionRight &&
      decisionRight.approvalClass !== action.requiredApprovalClass
    ) {
      issues.push("Decision right approval class does not match action.");
    }

    if (scope && !scopeMatches(scope, action)) {
      issues.push("Authority scope does not cover the action.");
    }

    if (
      decisionRight?.maximumFinancialValue != null &&
      Number(financialValue || 0) >
        decisionRight.maximumFinancialValue
    ) {
      issues.push("Action value exceeds financial authority limit.");
    }

    if (
      decisionRight?.maximumFinancialValue != null &&
      currency !== decisionRight.currency
    ) {
      issues.push("Action currency does not match authority currency.");
    }

    if (
      decisionRight &&
      !decisionRight.allowedRiskSeverities.includes(riskSeverity)
    ) {
      issues.push("Risk severity is outside authority.");
    }

    if (
      decisionRight?.requiresNoConflict &&
      conflicts.some(item => item.status !== "resolved")
    ) {
      issues.push("Unresolved conflict of interest exists.");
    }

    if (delegation) {
      if (
        !decisionRight?.mayDelegate
      ) {
        issues.push("Decision right cannot be delegated.");
      }

      if (
        delegation.status !== "active" ||
        !withinPeriod(delegation)
      ) {
        issues.push("Delegation is not currently valid.");
      }

      if (
        delegation.delegateActorId !== actor.actorId
      ) {
        issues.push("Delegation does not belong to this actor.");
      }
    }

    return {
      eligible:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.ABA.authorityEvaluator =
    Object.freeze({
      includesOrOpen,
      withinPeriod,
      scopeMatches,
      evaluate
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/storage/authority-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_AUTHORITY_RIGHTS";
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
          ["roles", "roleId"],
          ["scopes", "authorityScopeId"],
          ["rights", "decisionRightId"],
          ["delegations", "delegationId"],
          ["evaluations", "authorityEvaluationId"],
          ["policy_handoffs", "approvalPolicyHandoffId"]
        ]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            if (name === "evaluations") {
              store.createIndex(
                "actionInstanceId",
                "actionInstanceId",
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
      await request(tx.objectStore(storeName).put(structuredClone(record)));
      return runtime.success(structuredClone(record));
    } catch (error) {
      return runtime.failure(
        "ABA_AUTHORITY_STORAGE_ERROR",
        error?.message || "Authority storage failed."
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
            "ABA_AUTHORITY_RECORD_NOT_FOUND",
            "Authority record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_AUTHORITY_STORAGE_ERROR",
        error?.message || "Authority retrieval failed."
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
        "ABA_AUTHORITY_STORAGE_ERROR",
        error?.message || "Authority listing failed."
      );
    }
  }

  global.INFINICUS.ABA.authorityStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- approved-business-action/INFINICUS-ABA-05-Authority-Role-Decision-Rights-Engine/src/engine/authority-decision-rights-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerRole(input = {}) {
    const built = global.INFINICUS.ABA.roleModel.create(input);
    if (!built.ok) return built;
    return global.INFINICUS.ABA.authorityStore.put("roles", built.data);
  }

  async function registerScope(input = {}) {
    const built = global.INFINICUS.ABA.authorityScopeModel.create(input);
    if (!built.ok) return built;
    return global.INFINICUS.ABA.authorityStore.put("scopes", built.data);
  }

  async function registerDecisionRight(input = {}) {
    const role =
      await global.INFINICUS.ABA.authorityStore.get(
        "roles",
        input.roleId
      );

    if (!role.ok) return role;

    const scope =
      await global.INFINICUS.ABA.authorityStore.get(
        "scopes",
        input.authorityScopeId
      );

    if (!scope.ok) return scope;

    const built =
      global.INFINICUS.ABA.decisionRightModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.authorityStore.put(
      "rights",
      built.data
    );
  }

  async function registerDelegation(input = {}) {
    const right =
      await global.INFINICUS.ABA.authorityStore.get(
        "rights",
        input.decisionRightId
      );

    if (!right.ok) return right;

    const built =
      global.INFINICUS.ABA.delegationModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.authorityStore.put(
      "delegations",
      built.data
    );
  }

  async function evaluateAuthority({
    authorityHandoffId,
    actor,
    roleId,
    decisionRightId,
    delegationId,
    financialValue = 0,
    currency = "USD",
    riskSeverity = "low",
    conflicts = []
  } = {}) {
    const handoff =
      await global.INFINICUS.ABA.actionInstanceLifecycleRegistry
        .getAuthorityHandoff({ authorityHandoffId });

    if (!handoff.ok) return handoff;

    const role =
      await global.INFINICUS.ABA.authorityStore.get(
        "roles",
        roleId
      );

    if (!role.ok) return role;

    const right =
      await global.INFINICUS.ABA.authorityStore.get(
        "rights",
        decisionRightId
      );

    if (!right.ok) return right;

    const scope =
      await global.INFINICUS.ABA.authorityStore.get(
        "scopes",
        right.data.authorityScopeId
      );

    if (!scope.ok) return scope;

    let delegation = null;

    if (delegationId) {
      const delegated =
        await global.INFINICUS.ABA.authorityStore.get(
          "delegations",
          delegationId
        );

      if (!delegated.ok) return delegated;
      delegation = delegated.data;
    }

    const evaluationResult =
      global.INFINICUS.ABA.authorityEvaluator.evaluate({
        actor,
        role: role.data,
        decisionRight: right.data,
        scope: scope.data,
        delegation,
        action: handoff.data,
        financialValue,
        currency,
        riskSeverity,
        conflicts
      });

    const evaluation = {
      authorityEvaluationId:
        runtime.createId("aba_authority_evaluation"),
      authorityHandoffId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      actor:
        runtime.clone(actor),
      roleId,
      decisionRightId,
      authorityScopeId:
        scope.data.authorityScopeId,
      delegationId:
        delegation?.delegationId || null,
      financialValue:
        Number(financialValue),
      currency,
      riskSeverity,
      conflicts:
        runtime.clone(conflicts),
      eligible:
        evaluationResult.eligible,
      issues:
        evaluationResult.issues,
      correlationId:
        handoff.data.correlationId,
      status:
        evaluationResult.eligible
          ? "eligible"
          : "ineligible",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.authorityStore.put(
      "evaluations",
      evaluation
    );

    if (!evaluationResult.eligible) {
      await runtime.emit(
        "aba.authority.ineligible",
        evaluation
      );

      return runtime.failure(
        "ABA_AUTHORITY_INELIGIBLE",
        "Actor is not eligible to approve this action.",
        evaluation
      );
    }

    const policyHandoff = {
      approvalPolicyHandoffId:
        runtime.createId("aba_approval_policy_handoff"),
      targetBlock:
        "ABA-06",
      authorityEvaluationId:
        evaluation.authorityEvaluationId,
      authorityHandoffId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      actionDefinitionId:
        handoff.data.actionDefinitionId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      decisionId:
        handoff.data.decisionId,
      recommendationId:
        handoff.data.recommendationId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      parameters:
        runtime.clone(handoff.data.parameters),
      requiredApprovalClass:
        handoff.data.requiredApprovalClass,
      reversibility:
        handoff.data.reversibility,
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      eligibleAuthority:
        runtime.clone(evaluation),
      financialValue:
        Number(financialValue),
      currency,
      riskSeverity,
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.authorityStore.put(
      "policy_handoffs",
      policyHandoff
    );

    await runtime.emit(
      "aba.authority.eligible",
      {
        evaluation,
        approvalPolicyHandoffId:
          policyHandoff.approvalPolicyHandoffId
      }
    );

    return runtime.success({
      authorityEvaluation:
        evaluation,
      approvalPolicyHandoff:
        policyHandoff
    });
  }

  const api = Object.freeze({
    registerRole,
    registerScope,
    registerDecisionRight,
    registerDelegation,
    evaluateAuthority,
    getAuthorityEvaluation: ({ authorityEvaluationId }) =>
      global.INFINICUS.ABA.authorityStore.get(
        "evaluations",
        authorityEvaluationId
      ),
    getApprovalPolicyHandoff: ({ approvalPolicyHandoffId }) =>
      global.INFINICUS.ABA.authorityStore.get(
        "policy_handoffs",
        approvalPolicyHandoffId
      ),
    listRoles: () =>
      global.INFINICUS.ABA.authorityStore.list("roles"),
    listDecisionRights: () =>
      global.INFINICUS.ABA.authorityStore.list("rights")
  });

  runtime.registerService(
    "aba.authority_decision_rights",
    api,
    { block: "ABA-05" }
  );

  runtime.registerRoute(
    "aba.role.register",
    registerRole
  );

  runtime.registerRoute(
    "aba.authority_scope.register",
    registerScope
  );

  runtime.registerRoute(
    "aba.decision_right.register",
    registerDecisionRight
  );

  runtime.registerRoute(
    "aba.delegation.register",
    registerDelegation
  );

  runtime.registerRoute(
    "aba.authority.evaluate",
    evaluateAuthority
  );

  runtime.registerBlock("ABA-05", {
    name:
      "Authority, Role and Decision-Rights Engine",
    version:
      "1.0.0",
    status:
      "active"
  });

  global.INFINICUS.ABA.authorityDecisionRightsEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-06-Approval-Policy-Threshold-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-06-Approval-Policy-Threshold-Engine/src/core/runtime-guard.js --- */
(function (global) {
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if (!ABA?.runtime) {
    throw new Error("ABA-01 must be loaded before ABA-06.");
  }

  if (!ABA?.authorityDecisionRightsEngine) {
    throw new Error("ABA-05 must be loaded before ABA-06.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-06-Approval-Policy-Threshold-Engine/src/model/approval-policy.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_APPROVAL_POLICY_INVALID",
        "Approval policy name and code are required."
      );
    }

    return runtime.success({
      approvalPolicyId:
        input.approvalPolicyId ||
        runtime.createId("aba_approval_policy"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      description:
        String(input.description || ""),
      priority:
        Number(input.priority || 0),
      status:
        String(input.status || "active"),
      validFrom:
        input.validFrom || new Date().toISOString(),
      validUntil:
        input.validUntil || null,
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.approvalPolicyModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-06-Approval-Policy-Threshold-Engine/src/model/threshold-rule.js --- */
(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.approvalPolicyId ||
      !input.name ||
      !input.workflowMode
    ) {
      return runtime.failure(
        "ABA_THRESHOLD_RULE_INVALID",
        "approvalPolicyId, name, and workflowMode are required."
      );
    }

    return runtime.success({
      thresholdRuleId:
        input.thresholdRuleId ||
        runtime.createId("aba_threshold_rule"),
      approvalPolicyId:
        String(input.approvalPolicyId),
      name:
        String(input.name),
      actionCategoryIds:
        runtime.clone(input.actionCategoryIds || []),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      approvalClasses:
        runtime.clone(input.approvalClasses || []),
      minimumFinancialValue:
        input.minimumFinancialValue == null
          ? null
          : Number(input.minimumFinancialValue),
      maximumFinancialValue:
        input.maximumFinancialValue == null
          ? null
          : Number(input.maximumFinancialValue),
      currency:
        String(input.currency || "USD"),
      riskSeverities:
        runtime.clone(input.riskSeverities || []),
      reversibilityClasses:
        runtime.clone(input.reversibilityClasses || []),
      customerImpactLevels:
        runtime.clone(input.customerImpactLevels || []),
      workforceImpactLevels:
        runtime.clone(input.workforceImpactLevels || []),
      legalImpactLevels:
        runtime.clone(input.legalImpactLevels || []),
      dataSensitivityLevels:
        runtime.clone(input.dataSensitivityLevels || []),
      geographicScopeLevels:
        runtime.clone(input.geographicScopeLevels || []),
      businessCriticalityLevels:
        runtime.clone(input.businessCriticalityLevels || []),
      requiredApproverRoles:
        runtime.clone(input.requiredApproverRoles || []),
      requiredApprovalCount:
        Math.max(1, Number(input.requiredApprovalCount || 1)),
      workflowMode:
        String(input.workflowMode),
      unanimous:
        Boolean(input.unanimous),
      allowConditionalApproval:
        input.allowConditionalApproval !== false,
      escalationRoleIds:
        runtime.clone(input.escalationRoleIds || []),
      approvalDeadlineHours:
        Math.max(1, Number(input.approvalDeadlineHours || 24)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.thresholdRuleModel =
    Object.freeze({ create });
})(window);

/* --- approved-business-action/INFINICUS-ABA-06-Approval-Policy-Threshold-Engine/src/validation/policy-matcher.js --- */
(function (global) {
  "use strict";

  function includesOrOpen(values, value) {
    return !values.length || values.includes(value);
  }

  function inRange(value, minimum, maximum) {
    if (minimum != null && value < minimum) return false;
    if (maximum != null && value > maximum) return false;
    return true;
  }

  function matches(rule, action) {
    return (
      rule.status === "active" &&
      includesOrOpen(
        rule.actionCategoryIds,
        action.actionCategoryId
      ) &&
      includesOrOpen(
        rule.actionTypeIds,
        action.actionTypeId
      ) &&
      includesOrOpen(
        rule.approvalClasses,
        action.requiredApprovalClass
      ) &&
      inRange(
        Number(action.financialValue || 0),
        rule.minimumFinancialValue,
        rule.maximumFinancialValue
      ) &&
      (
        rule.minimumFinancialValue == null &&
        rule.maximumFinancialValue == null ||
        rule.currency === action.currency
      ) &&
      includesOrOpen(
        rule.riskSeverities,
        action.riskSeverity
      ) &&
      includesOrOpen(
        rule.reversibilityClasses,
        action.reversibility
      ) &&
      includesOrOpen(
        rule.customerImpactLevels,
        action.customerImpactLevel
      ) &&
      includesOrOpen(
        rule.workforceImpactLevels,
        action.workforceImpactLevel
      ) &&
      includesOrOpen(
        rule.legalImpactLevels,
        action.legalImpactLevel
      ) &&
      includesOrOpen(
        rule.dataSensitivityLevels,
        action.dataSensitivityLevel
      ) &&
      includesOrOpen(
        rule.geographicScopeLevels,
        action.geographicScopeLevel
      ) &&
      includesOrOpen(
        rule.businessCriticalityLevels,
        action.businessCriticalityLevel
      )
    );
  }

  function specificity(rule) {
    const arrays = [
      rule.actionCategoryIds,
      rule.actionTypeIds,
      rule.approvalClasses,
      rule.riskSeverities,
      rule.reversibilityClasses,
      rule.customerImpactLevels,
      rule.workforceImpactLevels,
      rule.legalImpactLevels,
      rule.dataSensitivityLevels,
      rule.geographicScopeLevels,
      rule.businessCriticalityLevels
    ];

    let score =
      arrays.reduce(
        (sum, values) =>
          sum + (values.length ? 1 : 0),
        0
      );

    if (rule.minimumFinancialValue != null) score += 1;
    if (rule.maximumFinancialValue != null) score += 1;

    return score;
  }

  function select(rules, action, policies) {
    const policyById =
      new Map(
        policies.map(item => [
          item.approvalPolicyId,
          item
        ])
      );

    return rules
      .filter(rule =>
        matches(rule, action)
      )
      .map(rule => ({
        rule,
        policy:
          policyById.get(rule.approvalPolicyId),
        specificity:
          specificity(rule)
      }))
      .filter(item =>
        item.policy &&
        item.policy.status === "active"
      )
      .sort((left, right) =>
        right.specificity - left.specificity ||
        right.policy.priority - left.policy.priority
      )[0] || null;
  }

  global.INFINICUS.ABA.approvalPolicyMatcher =
    Object.freeze({
      includesOrOpen,
      inRange,
      matches,
      specificity,
      select
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-06-Approval-Policy-Threshold-Engine/src/storage/policy-store.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_APPROVAL_POLICY";
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
          ["policies", "approvalPolicyId"],
          ["rules", "thresholdRuleId"],
          ["resolutions", "approvalRequirementResolutionId"],
          ["workflow_handoffs", "approvalWorkflowHandoffId"]
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
        "ABA_APPROVAL_POLICY_STORAGE_ERROR",
        error?.message || "Approval policy storage failed."
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
            "ABA_APPROVAL_POLICY_RECORD_NOT_FOUND",
            "Approval policy record was not found.",
            { storeName, id }
          );
    } catch (error) {
      return runtime.failure(
        "ABA_APPROVAL_POLICY_STORAGE_ERROR",
        error?.message || "Approval policy retrieval failed."
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
        "ABA_APPROVAL_POLICY_STORAGE_ERROR",
        error?.message || "Approval policy listing failed."
      );
    }
  }

  global.INFINICUS.ABA.approvalPolicyStore =
    Object.freeze({ open, put, get, list });
})(window);

/* --- approved-business-action/INFINICUS-ABA-06-Approval-Policy-Threshold-Engine/src/engine/approval-policy-threshold-engine.js --- */
(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerPolicy(input = {}) {
    const built =
      global.INFINICUS.ABA.approvalPolicyModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.approvalPolicyStore.put(
      "policies",
      built.data
    );
  }

  async function registerThresholdRule(input = {}) {
    const policy =
      await global.INFINICUS.ABA.approvalPolicyStore.get(
        "policies",
        input.approvalPolicyId
      );

    if (!policy.ok) return policy;

    const built =
      global.INFINICUS.ABA.thresholdRuleModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.approvalPolicyStore.put(
      "rules",
      built.data
    );
  }

  async function resolveRequirements({
    approvalPolicyHandoffId,
    customerImpactLevel = "low",
    workforceImpactLevel = "low",
    legalImpactLevel = "low",
    dataSensitivityLevel = "low",
    geographicScopeLevel = "local",
    businessCriticalityLevel = "standard"
  } = {}) {
    const handoff =
      await global.INFINICUS.ABA.authorityDecisionRightsEngine
        .getApprovalPolicyHandoff({ approvalPolicyHandoffId });

    if (!handoff.ok) return handoff;

    const policies =
      await global.INFINICUS.ABA.approvalPolicyStore.list(
        "policies"
      );

    if (!policies.ok) return policies;

    const rules =
      await global.INFINICUS.ABA.approvalPolicyStore.list(
        "rules"
      );

    if (!rules.ok) return rules;

    const actionContext = {
      ...runtime.clone(handoff.data),
      customerImpactLevel,
      workforceImpactLevel,
      legalImpactLevel,
      dataSensitivityLevel,
      geographicScopeLevel,
      businessCriticalityLevel
    };

    const selected =
      global.INFINICUS.ABA.approvalPolicyMatcher.select(
        rules.data,
        actionContext,
        policies.data
      );

    if (!selected) {
      return runtime.failure(
        "ABA_APPROVAL_POLICY_NOT_FOUND",
        "No approval policy applies to this action.",
        {
          actionInstanceId:
            handoff.data.actionInstanceId,
          actionContext
        }
      );
    }

    const resolution = {
      approvalRequirementResolutionId:
        runtime.createId(
          "aba_approval_requirement_resolution"
        ),
      approvalPolicyHandoffId,
      approvalPolicyId:
        selected.policy.approvalPolicyId,
      thresholdRuleId:
        selected.rule.thresholdRuleId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionCategoryId:
        handoff.data.actionCategoryId,
      requiredApprovalClass:
        handoff.data.requiredApprovalClass,
      eligibleAuthority:
        runtime.clone(handoff.data.eligibleAuthority),
      requiredApproverRoles:
        runtime.clone(
          selected.rule.requiredApproverRoles
        ),
      requiredApprovalCount:
        selected.rule.requiredApprovalCount,
      workflowMode:
        selected.rule.workflowMode,
      unanimous:
        selected.rule.unanimous,
      allowConditionalApproval:
        selected.rule.allowConditionalApproval,
      escalationRoleIds:
        runtime.clone(
          selected.rule.escalationRoleIds
        ),
      approvalDeadlineHours:
        selected.rule.approvalDeadlineHours,
      impactContext: {
        financialValue:
          handoff.data.financialValue,
        currency:
          handoff.data.currency,
        riskSeverity:
          handoff.data.riskSeverity,
        reversibility:
          handoff.data.reversibility,
        customerImpactLevel,
        workforceImpactLevel,
        legalImpactLevel,
        dataSensitivityLevel,
        geographicScopeLevel,
        businessCriticalityLevel
      },
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "resolved",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalPolicyStore.put(
      "resolutions",
      resolution
    );

    const workflowHandoff = {
      approvalWorkflowHandoffId:
        runtime.createId("aba_approval_workflow_handoff"),
      targetBlock:
        "ABA-07",
      approvalRequirementResolutionId:
        resolution.approvalRequirementResolutionId,
      approvalPolicyId:
        resolution.approvalPolicyId,
      thresholdRuleId:
        resolution.thresholdRuleId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      actionDefinitionId:
        handoff.data.actionDefinitionId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      decisionId:
        handoff.data.decisionId,
      recommendationId:
        handoff.data.recommendationId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      parameters:
        runtime.clone(handoff.data.parameters),
      requiredApproverRoles:
        resolution.requiredApproverRoles.map(runtime.clone),
      requiredApprovalCount:
        resolution.requiredApprovalCount,
      workflowMode:
        resolution.workflowMode,
      unanimous:
        resolution.unanimous,
      allowConditionalApproval:
        resolution.allowConditionalApproval,
      escalationRoleIds:
        resolution.escalationRoleIds.map(runtime.clone),
      approvalDeadlineHours:
        resolution.approvalDeadlineHours,
      eligibleAuthority:
        runtime.clone(handoff.data.eligibleAuthority),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      impactContext:
        runtime.clone(resolution.impactContext),
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalPolicyStore.put(
      "workflow_handoffs",
      workflowHandoff
    );

    await runtime.emit(
      "aba.approval_requirements.resolved",
      {
        resolution,
        approvalWorkflowHandoffId:
          workflowHandoff.approvalWorkflowHandoffId
      }
    );

    return runtime.success({
      approvalRequirementResolution:
        resolution,
      approvalWorkflowHandoff:
        workflowHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    registerThresholdRule,
    resolveRequirements,
    getApprovalRequirementResolution: ({
      approvalRequirementResolutionId
    }) =>
      global.INFINICUS.ABA.approvalPolicyStore.get(
        "resolutions",
        approvalRequirementResolutionId
      ),
    getApprovalWorkflowHandoff: ({
      approvalWorkflowHandoffId
    }) =>
      global.INFINICUS.ABA.approvalPolicyStore.get(
        "workflow_handoffs",
        approvalWorkflowHandoffId
      ),
    listPolicies: () =>
      global.INFINICUS.ABA.approvalPolicyStore.list(
        "policies"
      ),
    listThresholdRules: () =>
      global.INFINICUS.ABA.approvalPolicyStore.list(
        "rules"
      )
  });

  runtime.registerService(
    "aba.approval_policy_threshold",
    api,
    { block: "ABA-06" }
  );

  runtime.registerRoute(
    "aba.approval_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.approval_threshold_rule.register",
    registerThresholdRule
  );

  runtime.registerRoute(
    "aba.approval_requirements.resolve",
    resolveRequirements
  );

  runtime.registerBlock("ABA-06", {
    name:
      "Approval Policy and Threshold Engine",
    version:
      "1.0.0",
    status:
      "active"
  });

  global.INFINICUS.ABA.approvalPolicyThresholdEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const ABA = global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-07.");
  if(!ABA?.approvalPolicyThresholdEngine){
    throw new Error("ABA-06 must be loaded before ABA-07.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine/src/model/workflow.js --- */
(function(global){
  "use strict";
  function create(handoff, input={}){
    const runtime = global.INFINICUS.ABA.runtime;
    const now = new Date();
    const deadline = new Date(
      now.getTime() + Number(handoff.approvalDeadlineHours || 24) * 3600000
    ).toISOString();

    return runtime.success({
      approvalWorkflowId: input.approvalWorkflowId || runtime.createId("aba_approval_workflow"),
      approvalWorkflowHandoffId: handoff.approvalWorkflowHandoffId,
      actionInstanceId: handoff.actionInstanceId,
      businessId: handoff.businessId,
      workflowMode: handoff.workflowMode,
      requiredApprovalCount: handoff.requiredApprovalCount,
      requiredApproverRoles: runtime.clone(handoff.requiredApproverRoles),
      unanimous: Boolean(handoff.unanimous),
      allowConditionalApproval: Boolean(handoff.allowConditionalApproval),
      escalationRoleIds: runtime.clone(handoff.escalationRoleIds),
      deadlineAt: input.deadlineAt || deadline,
      currentStage: 1,
      state: "active",
      version: 1,
      correlationId: handoff.correlationId,
      causationId: handoff.causationId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
  }
  global.INFINICUS.ABA.approvalWorkflowModel = Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine/src/model/stage.js --- */
(function(global){
  "use strict";
  function create({workflow, stageNumber, roleIds, mode, requiredCount}){
    const runtime = global.INFINICUS.ABA.runtime;
    return runtime.success({
      approvalStageId: runtime.createId("aba_approval_stage"),
      approvalWorkflowId: workflow.approvalWorkflowId,
      stageNumber: Number(stageNumber),
      roleIds: runtime.clone(roleIds || []),
      mode: String(mode || workflow.workflowMode),
      requiredCount: Math.max(1, Number(requiredCount || workflow.requiredApprovalCount || 1)),
      state: "pending",
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalStageModel = Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine/src/model/approval-task.js --- */
(function(global){
  "use strict";
  function create({workflow, stage, approver}){
    const runtime = global.INFINICUS.ABA.runtime;
    if(!approver?.actorId || !approver?.roleId){
      return runtime.failure("ABA_APPROVER_INVALID","approver actorId and roleId are required.");
    }
    return runtime.success({
      approvalTaskId: runtime.createId("aba_approval_task"),
      approvalWorkflowId: workflow.approvalWorkflowId,
      approvalStageId: stage.approvalStageId,
      actionInstanceId: workflow.actionInstanceId,
      approverActorId: String(approver.actorId),
      approverRoleId: String(approver.roleId),
      delegatedFromActorId: approver.delegatedFromActorId || null,
      state: "pending",
      decision: null,
      conditions: [],
      comment: null,
      respondedAt: null,
      createdAt: new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalTaskModel = Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine/src/validation/workflow-validator.js --- */
(function(global){
  "use strict";

  function validateApprovers(handoff, approvers){
    const issues = [];
    const allowed = new Set(handoff.requiredApproverRoles || []);
    const seen = new Set();

    for(const approver of approvers){
      if(!approver.actorId || !approver.roleId){
        issues.push("Approver actorId and roleId are required.");
        continue;
      }
      if(allowed.size && !allowed.has(approver.roleId)){
        issues.push(`Approver role is not required: ${approver.roleId}`);
      }
      const key = `${approver.actorId}|${approver.roleId}`;
      if(seen.has(key)) issues.push(`Duplicate approver: ${key}`);
      seen.add(key);
    }

    if(approvers.length < Number(handoff.requiredApprovalCount || 1)){
      issues.push("Not enough approvers were assigned.");
    }

    return {valid: issues.length===0, issues};
  }

  function evaluateStage({tasks, mode, requiredCount, unanimous}){
    const approved = tasks.filter(t=>t.decision==="approved").length;
    const conditional = tasks.filter(t=>t.decision==="approved_with_conditions").length;
    const rejected = tasks.filter(t=>t.decision==="rejected").length;
    const responded = tasks.filter(t=>t.state==="responded").length;
    const positive = approved + conditional;

    if(unanimous && rejected>0) return {complete:true, outcome:"rejected"};
    if(unanimous && responded===tasks.length && positive===tasks.length){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(mode==="majority" && positive > tasks.length/2){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(mode==="parallel" && positive>=requiredCount){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(mode==="sequential" && positive>=requiredCount){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(rejected > tasks.length-requiredCount){
      return {complete:true, outcome:"rejected"};
    }
    return {complete:false, outcome:null};
  }

  global.INFINICUS.ABA.approvalWorkflowValidator =
    Object.freeze({validateApprovers,evaluateStage});
})(window);

/* --- approved-business-action/INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine/src/storage/workflow-store.js --- */
(function(global){
  "use strict";
  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_APPROVAL_WORKFLOW";
  let dbPromise;
  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const [name,keyPath] of [
          ["workflows","approvalWorkflowId"],
          ["stages","approvalStageId"],
          ["tasks","approvalTaskId"],
          ["events","approvalWorkflowEventId"],
          ["evidence_handoffs","approvalEvidenceHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});
            if(name==="tasks"){
              store.createIndex("workflowId","approvalWorkflowId",{unique:false});
              store.createIndex("stageId","approvalStageId",{unique:false});
            }
          }
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow storage failed.");
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));
      return value ? runtime.success(structuredClone(value))
        : runtime.failure("ABA_WORKFLOW_RECORD_NOT_FOUND","Workflow record not found.",{storeName,id});
    }catch(error){
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow retrieval failed.");
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).index(indexName).getAll(value));
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow listing failed.");
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure("ABA_WORKFLOW_STORAGE_ERROR",error?.message||"Workflow listing failed.");
    }
  }

  global.INFINICUS.ABA.approvalWorkflowStore =
    Object.freeze({open,put,get,listByIndex,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-07-Multi-Stage-Approval-Workflow-Engine/src/engine/multi-stage-approval-workflow-engine.js --- */
(function(global){
  "use strict";
  const runtime = global.INFINICUS.ABA.runtime;

  async function createWorkflow({
    approvalWorkflowHandoffId,
    stages = [],
    approvers = []
  }={}){
    const handoff = await global.INFINICUS.ABA.approvalPolicyThresholdEngine
      .getApprovalWorkflowHandoff({approvalWorkflowHandoffId});
    if(!handoff.ok) return handoff;

    const validity = global.INFINICUS.ABA.approvalWorkflowValidator
      .validateApprovers(handoff.data,approvers);
    if(!validity.valid){
      return runtime.failure("ABA_APPROVAL_WORKFLOW_INVALID","Approver assignment failed.",validity);
    }

    const built = global.INFINICUS.ABA.approvalWorkflowModel.create(handoff.data);
    if(!built.ok) return built;
    await global.INFINICUS.ABA.approvalWorkflowStore.put("workflows",built.data);

    const stageInputs = stages.length ? stages : [{
      stageNumber:1,
      roleIds:handoff.data.requiredApproverRoles,
      mode:handoff.data.workflowMode,
      requiredCount:handoff.data.requiredApprovalCount
    }];

    const stageRecords=[];
    const taskRecords=[];

    for(const stageInput of stageInputs){
      const stageBuilt = global.INFINICUS.ABA.approvalStageModel.create({
        workflow:built.data,
        stageNumber:stageInput.stageNumber,
        roleIds:stageInput.roleIds,
        mode:stageInput.mode,
        requiredCount:stageInput.requiredCount
      });
      if(!stageBuilt.ok) return stageBuilt;
      const stage = {
        ...stageBuilt.data,
        state: Number(stageInput.stageNumber)===1 ? "active" : "pending",
        startedAt: Number(stageInput.stageNumber)===1 ? new Date().toISOString() : null
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("stages",stage);
      stageRecords.push(stage);

      const stageApprovers = approvers.filter(a =>
        !stage.roleIds.length || stage.roleIds.includes(a.roleId)
      );

      for(const approver of stageApprovers){
        const taskBuilt = global.INFINICUS.ABA.approvalTaskModel.create({
          workflow:built.data,stage,approver
        });
        if(!taskBuilt.ok) return taskBuilt;
        await global.INFINICUS.ABA.approvalWorkflowStore.put("tasks",taskBuilt.data);
        taskRecords.push(taskBuilt.data);
      }
    }

    await runtime.emit("aba.approval_workflow.created",{
      workflow:built.data,
      stageCount:stageRecords.length,
      taskCount:taskRecords.length
    });

    return runtime.success({
      approvalWorkflow:built.data,
      stages:stageRecords,
      tasks:taskRecords
    });
  }

  async function respond({
    approvalTaskId,
    decision,
    conditions=[],
    comment=null
  }={}){
    const allowed=["approved","approved_with_conditions","rejected"];
    if(!allowed.includes(decision)){
      return runtime.failure("ABA_APPROVAL_DECISION_INVALID","Unsupported approval decision.");
    }

    const task = await global.INFINICUS.ABA.approvalWorkflowStore.get("tasks",approvalTaskId);
    if(!task.ok) return task;
    if(task.data.state==="responded"){
      return runtime.success({approvalTask:task.data,idempotentReplay:true});
    }

    const workflow = await global.INFINICUS.ABA.approvalWorkflowStore.get(
      "workflows",task.data.approvalWorkflowId
    );
    if(!workflow.ok) return workflow;

    if(new Date(workflow.data.deadlineAt).getTime() <= Date.now()){
      return runtime.failure("ABA_APPROVAL_WORKFLOW_EXPIRED","Approval workflow deadline has passed.");
    }

    if(decision==="approved_with_conditions" && !workflow.data.allowConditionalApproval){
      return runtime.failure("ABA_CONDITIONAL_APPROVAL_NOT_ALLOWED","Conditional approval is not allowed.");
    }

    const updatedTask={
      ...runtime.clone(task.data),
      state:"responded",
      decision,
      conditions:runtime.clone(conditions),
      comment,
      respondedAt:new Date().toISOString()
    };
    await global.INFINICUS.ABA.approvalWorkflowStore.put("tasks",updatedTask);

    const stageTasks = await global.INFINICUS.ABA.approvalWorkflowStore
      .listByIndex("tasks","stageId",task.data.approvalStageId);
    if(!stageTasks.ok) return stageTasks;

    const stage = await global.INFINICUS.ABA.approvalWorkflowStore.get(
      "stages",task.data.approvalStageId
    );
    if(!stage.ok) return stage;

    const evaluation = global.INFINICUS.ABA.approvalWorkflowValidator.evaluateStage({
      tasks:stageTasks.data.map(t=>t.approvalTaskId===approvalTaskId?updatedTask:t),
      mode:stage.data.mode,
      requiredCount:stage.data.requiredCount,
      unanimous:workflow.data.unanimous
    });

    let updatedWorkflow=workflow.data;
    let evidenceHandoff=null;

    if(evaluation.complete){
      const updatedStage={
        ...runtime.clone(stage.data),
        state:evaluation.outcome==="rejected"?"rejected":"completed",
        completedAt:new Date().toISOString()
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("stages",updatedStage);

      updatedWorkflow={
        ...runtime.clone(workflow.data),
        state:evaluation.outcome,
        version:workflow.data.version+1,
        updatedAt:new Date().toISOString()
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("workflows",updatedWorkflow);

      evidenceHandoff={
        approvalEvidenceHandoffId:runtime.createId("aba_approval_evidence_handoff"),
        targetBlock:"ABA-08",
        approvalWorkflowId:updatedWorkflow.approvalWorkflowId,
        actionInstanceId:updatedWorkflow.actionInstanceId,
        workflowOutcome:evaluation.outcome,
        tasks:(await global.INFINICUS.ABA.approvalWorkflowStore
          .listByIndex("tasks","workflowId",updatedWorkflow.approvalWorkflowId)).data,
        correlationId:updatedWorkflow.correlationId,
        causationId:updatedWorkflow.causationId,
        status:"ready",
        createdAt:new Date().toISOString()
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("evidence_handoffs",evidenceHandoff);
    }

    await runtime.emit("aba.approval_task.responded",{
      approvalTask:updatedTask,
      workflowOutcome:evaluation.outcome,
      approvalEvidenceHandoffId:evidenceHandoff?.approvalEvidenceHandoffId||null
    });

    return runtime.success({
      approvalTask:updatedTask,
      approvalWorkflow:updatedWorkflow,
      stageEvaluation:evaluation,
      approvalEvidenceHandoff:evidenceHandoff
    });
  }

  async function escalate({approvalWorkflowId,reason}={}){
    const workflow = await global.INFINICUS.ABA.approvalWorkflowStore.get(
      "workflows",approvalWorkflowId
    );
    if(!workflow.ok) return workflow;

    const updated={
      ...runtime.clone(workflow.data),
      state:"escalated",
      version:workflow.data.version+1,
      escalationReason:reason||"Approval deadline or authority escalation.",
      updatedAt:new Date().toISOString()
    };
    await global.INFINICUS.ABA.approvalWorkflowStore.put("workflows",updated);
    await runtime.emit("aba.approval_workflow.escalated",updated);
    return runtime.success(updated);
  }

  const api=Object.freeze({
    createWorkflow,
    respond,
    escalate,
    getWorkflow:({approvalWorkflowId}) =>
      global.INFINICUS.ABA.approvalWorkflowStore.get("workflows",approvalWorkflowId),
    getApprovalEvidenceHandoff:({approvalEvidenceHandoffId}) =>
      global.INFINICUS.ABA.approvalWorkflowStore.get("evidence_handoffs",approvalEvidenceHandoffId),
    listWorkflowTasks:({approvalWorkflowId}) =>
      global.INFINICUS.ABA.approvalWorkflowStore.listByIndex("tasks","workflowId",approvalWorkflowId)
  });

  runtime.registerService("aba.multi_stage_approval_workflow",api,{block:"ABA-07"});
  runtime.registerRoute("aba.approval_workflow.create",createWorkflow);
  runtime.registerRoute("aba.approval_task.respond",respond);
  runtime.registerRoute("aba.approval_workflow.escalate",escalate);
  runtime.registerBlock("ABA-07",{
    name:"Multi-Stage Approval Workflow Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.multiStageApprovalWorkflowEngine=api;
})(window);

/* ===== INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-08.");
  if(!ABA?.multiStageApprovalWorkflowEngine){
    throw new Error("ABA-07 must be loaded before ABA-08.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine/src/security/checksum.js --- */
(function(global){
  "use strict";
  function stable(value){
    if(value==null || typeof value!=="object") return JSON.stringify(value);
    if(Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    return `{${Object.keys(value).sort()
      .map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  function hash(value){
    const input=stable(value);
    let result=2166136261;
    for(let i=0;i<input.length;i+=1){
      result^=input.charCodeAt(i);
      result=Math.imul(result,16777619);
    }
    return `aba_approval_${(result>>>0).toString(16).padStart(8,"0")}`;
  }
  global.INFINICUS.ABA.approvalEvidenceChecksum=Object.freeze({stable,hash});
})(window);

/* --- approved-business-action/INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine/src/model/evidence-record.js --- */
(function(global){
  "use strict";
  function create({handoff,task,signature}){
    const runtime=global.INFINICUS.ABA.runtime;
    return runtime.success({
      approvalEvidenceId:runtime.createId("aba_approval_evidence"),
      approvalWorkflowId:handoff.approvalWorkflowId,
      actionInstanceId:handoff.actionInstanceId,
      approvalTaskId:task.approvalTaskId,
      approverActorId:task.approverActorId,
      approverRoleId:task.approverRoleId,
      delegatedFromActorId:task.delegatedFromActorId,
      decision:task.decision,
      conditions:runtime.clone(task.conditions||[]),
      comment:task.comment||null,
      respondedAt:task.respondedAt,
      signature:runtime.clone(signature||{
        signatureType:"recorded_approval",
        signerId:task.approverActorId,
        signedAt:task.respondedAt
      }),
      correlationId:handoff.correlationId,
      status:"recorded",
      createdAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalEvidenceModel=Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine/src/model/audit-event.js --- */
(function(global){
  "use strict";
  function create({eventType,subjectId,payload,correlationId}){
    const runtime=global.INFINICUS.ABA.runtime;
    return runtime.success({
      approvalAuditEventId:runtime.createId("aba_approval_audit"),
      eventType:String(eventType),
      subjectId:String(subjectId),
      payload:runtime.clone(payload||{}),
      correlationId:correlationId||null,
      occurredAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalAuditEventModel=Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine/src/validation/evidence-validator.js --- */
(function(global){
  "use strict";
  function validateHandoff(handoff){
    const issues=[];
    if(!handoff.approvalWorkflowId) issues.push("Approval workflow ID is required.");
    if(!handoff.actionInstanceId) issues.push("Action instance ID is required.");
    if(!["approved","approved_with_conditions","rejected"].includes(handoff.workflowOutcome)){
      issues.push("Workflow outcome is unsupported.");
    }
    if(!Array.isArray(handoff.tasks) || !handoff.tasks.length){
      issues.push("Approval tasks are required.");
    }
    for(const task of handoff.tasks||[]){
      if(!task.approverActorId || !task.approverRoleId){
        issues.push("Approver identity evidence is incomplete.");
      }
      if(!["approved","approved_with_conditions","rejected"].includes(task.decision)){
        issues.push(`Task decision is invalid: ${task.approvalTaskId}`);
      }
      if(!task.respondedAt){
        issues.push(`Task response timestamp is missing: ${task.approvalTaskId}`);
      }
    }
    return {valid:issues.length===0,issues};
  }

  function verify(record,expectedChecksum,checksum){
    const calculated=checksum.hash(record);
    return {
      valid:calculated===expectedChecksum,
      expectedChecksum,
      calculatedChecksum:calculated
    };
  }

  global.INFINICUS.ABA.approvalEvidenceValidator=
    Object.freeze({validateHandoff,verify});
})(window);

/* --- approved-business-action/INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine/src/storage/evidence-store.js --- */
(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_APPROVAL_EVIDENCE";
  let dbPromise;
  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const [name,keyPath] of [
          ["evidence","approvalEvidenceId"],
          ["packages","approvalEvidencePackageId"],
          ["audits","approvalAuditEventId"],
          ["revocations","approvalRevocationId"],
          ["contract_handoffs","actionContractHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});
            if(name==="evidence"){
              store.createIndex("workflowId","approvalWorkflowId",{unique:false});
            }
          }
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
      return runtime.failure("ABA_EVIDENCE_STORAGE_ERROR",error?.message||"Evidence storage failed.");
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(tx.objectStore(storeName).get(id));
      return value?runtime.success(structuredClone(value))
        :runtime.failure("ABA_EVIDENCE_RECORD_NOT_FOUND","Evidence record not found.",{storeName,id});
    }catch(error){
      return runtime.failure("ABA_EVIDENCE_STORAGE_ERROR",error?.message||"Evidence retrieval failed.");
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).index(indexName).getAll(value));
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure("ABA_EVIDENCE_STORAGE_ERROR",error?.message||"Evidence listing failed.");
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(tx.objectStore(storeName).getAll());
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure("ABA_EVIDENCE_STORAGE_ERROR",error?.message||"Evidence listing failed.");
    }
  }

  global.INFINICUS.ABA.approvalEvidenceStore=
    Object.freeze({open,put,get,listByIndex,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-08-Approval-Evidence-Signature-Audit-Engine/src/engine/approval-evidence-audit-engine.js --- */
(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;

  async function recordEvidence({
    approvalEvidenceHandoffId,
    signatures={}
  }={}){
    const handoff=await global.INFINICUS.ABA.multiStageApprovalWorkflowEngine
      .getApprovalEvidenceHandoff({approvalEvidenceHandoffId});
    if(!handoff.ok) return handoff;

    const validation=global.INFINICUS.ABA.approvalEvidenceValidator
      .validateHandoff(handoff.data);
    if(!validation.valid){
      return runtime.failure("ABA_APPROVAL_EVIDENCE_INVALID",
        "Approval evidence handoff failed validation.",validation);
    }

    const evidenceRecords=[];
    for(const task of handoff.data.tasks){
      const built=global.INFINICUS.ABA.approvalEvidenceModel.create({
        handoff:handoff.data,
        task,
        signature:signatures[task.approvalTaskId]
      });
      if(!built.ok) return built;
      const checksum=global.INFINICUS.ABA.approvalEvidenceChecksum.hash(built.data);
      const record={...built.data,evidenceChecksum:checksum};
      await global.INFINICUS.ABA.approvalEvidenceStore.put("evidence",record);
      evidenceRecords.push(record);

      const audit=global.INFINICUS.ABA.approvalAuditEventModel.create({
        eventType:"approval_evidence.recorded",
        subjectId:record.approvalEvidenceId,
        payload:{approvalTaskId:record.approvalTaskId,evidenceChecksum:checksum},
        correlationId:record.correlationId
      });
      await global.INFINICUS.ABA.approvalEvidenceStore.put("audits",audit.data);
    }

    const packageBody={
      approvalWorkflowId:handoff.data.approvalWorkflowId,
      actionInstanceId:handoff.data.actionInstanceId,
      workflowOutcome:handoff.data.workflowOutcome,
      evidence:evidenceRecords
    };

    const evidencePackage={
      approvalEvidencePackageId:runtime.createId("aba_approval_evidence_package"),
      approvalEvidenceHandoffId,
      approvalWorkflowId:handoff.data.approvalWorkflowId,
      actionInstanceId:handoff.data.actionInstanceId,
      workflowOutcome:handoff.data.workflowOutcome,
      evidence:evidenceRecords.map(runtime.clone),
      packageChecksum:global.INFINICUS.ABA.approvalEvidenceChecksum.hash(packageBody),
      correlationId:handoff.data.correlationId,
      causationId:handoff.data.causationId,
      status:"verified",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalEvidenceStore.put("packages",evidencePackage);

    const contractHandoff={
      actionContractHandoffId:runtime.createId("aba_action_contract_handoff"),
      targetBlock:"ABA-09",
      approvalEvidencePackageId:evidencePackage.approvalEvidencePackageId,
      approvalWorkflowId:evidencePackage.approvalWorkflowId,
      actionInstanceId:evidencePackage.actionInstanceId,
      workflowOutcome:evidencePackage.workflowOutcome,
      approvalEvidence:evidencePackage.evidence.map(runtime.clone),
      packageChecksum:evidencePackage.packageChecksum,
      correlationId:evidencePackage.correlationId,
      causationId:evidencePackage.causationId,
      status:evidencePackage.workflowOutcome==="rejected"?"rejected":"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalEvidenceStore.put(
      "contract_handoffs",contractHandoff
    );

    await runtime.emit("aba.approval_evidence.package_created",{
      evidencePackage,
      actionContractHandoffId:contractHandoff.actionContractHandoffId
    });

    return runtime.success({
      approvalEvidencePackage:evidencePackage,
      actionContractHandoff:contractHandoff
    });
  }

  async function verifyEvidence({approvalEvidenceId}={}){
    const record=await global.INFINICUS.ABA.approvalEvidenceStore.get(
      "evidence",approvalEvidenceId
    );
    if(!record.ok) return record;

    const body={...runtime.clone(record.data)};
    delete body.evidenceChecksum;

    const result=global.INFINICUS.ABA.approvalEvidenceValidator.verify(
      body,record.data.evidenceChecksum,global.INFINICUS.ABA.approvalEvidenceChecksum
    );

    const audit=global.INFINICUS.ABA.approvalAuditEventModel.create({
      eventType:"approval_evidence.verified",
      subjectId:approvalEvidenceId,
      payload:result,
      correlationId:record.data.correlationId
    });
    await global.INFINICUS.ABA.approvalEvidenceStore.put("audits",audit.data);

    return runtime.success(result);
  }

  async function revokeEvidence({
    approvalEvidencePackageId,
    revokedBy,
    reason
  }={}){
    const pkg=await global.INFINICUS.ABA.approvalEvidenceStore.get(
      "packages",approvalEvidencePackageId
    );
    if(!pkg.ok) return pkg;

    const revocation={
      approvalRevocationId:runtime.createId("aba_approval_revocation"),
      approvalEvidencePackageId,
      approvalWorkflowId:pkg.data.approvalWorkflowId,
      actionInstanceId:pkg.data.actionInstanceId,
      revokedBy:String(revokedBy||"unknown"),
      reason:String(reason||"Approval evidence revoked."),
      correlationId:pkg.data.correlationId,
      createdAt:new Date().toISOString()
    };
    await global.INFINICUS.ABA.approvalEvidenceStore.put("revocations",revocation);

    const updated={...runtime.clone(pkg.data),status:"revoked",revokedAt:new Date().toISOString()};
    await global.INFINICUS.ABA.approvalEvidenceStore.put("packages",updated);

    await runtime.emit("aba.approval_evidence.revoked",revocation);
    return runtime.success({approvalEvidencePackage:updated,revocation});
  }

  const api=Object.freeze({
    recordEvidence,
    verifyEvidence,
    revokeEvidence,
    getEvidencePackage:({approvalEvidencePackageId}) =>
      global.INFINICUS.ABA.approvalEvidenceStore.get("packages",approvalEvidencePackageId),
    getActionContractHandoff:({actionContractHandoffId}) =>
      global.INFINICUS.ABA.approvalEvidenceStore.get("contract_handoffs",actionContractHandoffId),
    listAuditEvents:() =>
      global.INFINICUS.ABA.approvalEvidenceStore.list("audits")
  });

  runtime.registerService("aba.approval_evidence_audit",api,{block:"ABA-08"});
  runtime.registerRoute("aba.approval_evidence.record",recordEvidence);
  runtime.registerRoute("aba.approval_evidence.verify",verifyEvidence);
  runtime.registerRoute("aba.approval_evidence.revoke",revokeEvidence);
  runtime.registerBlock("ABA-08",{
    name:"Approval Evidence, Signature and Audit Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.approvalEvidenceAuditEngine=api;
})(window);

/* ===== INFINICUS-ABA-09-Approved-Action-Contract-Generation-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-09-Approved-Action-Contract-Generation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-09.");
  }

  if(!ABA?.approvalEvidenceAuditEngine){
    throw new Error("ABA-08 must be loaded before ABA-09.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-09-Approved-Action-Contract-Generation-Engine/src/model/contract-template.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_CONTRACT_TEMPLATE_INVALID",
        "Contract template name and code are required."
      );
    }

    return runtime.success({
      actionContractTemplateId:
        input.actionContractTemplateId ||
        runtime.createId("aba_action_contract_template"),
      name:
        String(input.name),
      code:
        String(input.code),
      description:
        String(input.description || ""),
      requiredSections:
        runtime.clone(
          input.requiredSections || [
            "identity",
            "approval",
            "target",
            "parameters",
            "conditions",
            "constraints",
            "dependencies",
            "expected_outcomes",
            "rollback",
            "monitoring"
          ]
        ),
      defaultValidityHours:
        Math.max(1,Number(input.defaultValidityHours || 72)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionContractTemplateModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-09-Approved-Action-Contract-Generation-Engine/src/security/contract-checksum.js --- */
(function(global){
  "use strict";

  function stable(value){
    if(value==null || typeof value!=="object"){
      return JSON.stringify(value);
    }

    if(Array.isArray(value)){
      return `[${value.map(stable).join(",")}]`;
    }

    return `{${Object.keys(value).sort()
      .map(key=>`${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }

  function hash(value){
    const input = stable(value);
    let result = 2166136261;

    for(let index=0;index<input.length;index+=1){
      result ^= input.charCodeAt(index);
      result = Math.imul(result,16777619);
    }

    return `aba_contract_${(result>>>0)
      .toString(16)
      .padStart(8,"0")}`;
  }

  global.INFINICUS.ABA.actionContractChecksum =
    Object.freeze({stable,hash});
})(window);

/* --- approved-business-action/INFINICUS-ABA-09-Approved-Action-Contract-Generation-Engine/src/validation/contract-validator.js --- */
(function(global){
  "use strict";

  function validateEvidencePackage(pkg){
    const issues=[];

    if(!pkg){
      issues.push("Approval evidence package is required.");
      return {valid:false,issues};
    }

    if(pkg.status!=="verified"){
      issues.push("Approval evidence package is not verified.");
    }

    if(pkg.workflowOutcome==="rejected"){
      issues.push("Rejected workflow cannot generate an approved action contract.");
    }

    if(
      !Array.isArray(pkg.evidence) ||
      !pkg.evidence.length
    ){
      issues.push("Approval evidence records are required.");
    }

    if(pkg.revokedAt || pkg.status==="revoked"){
      issues.push("Approval evidence package has been revoked.");
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  function validateContract(contract,template){
    const issues=[];

    if(!contract.actionInstanceId){
      issues.push("Action instance ID is required.");
    }

    if(!contract.approvalEvidencePackageId){
      issues.push("Approval evidence package ID is required.");
    }

    if(!contract.target){
      issues.push("Action target is required.");
    }

    for(const section of template.requiredSections || []){
      if(
        !Object.prototype.hasOwnProperty.call(
          contract.sections,
          section
        )
      ){
        issues.push(`Required contract section is missing: ${section}`);
      }
    }

    if(
      contract.expiresAt &&
      new Date(contract.expiresAt).getTime() <=
      new Date(contract.issuedAt).getTime()
    ){
      issues.push("Contract expiry must be later than issue time.");
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.actionContractValidator =
    Object.freeze({
      validateEvidencePackage,
      validateContract
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-09-Approved-Action-Contract-Generation-Engine/src/storage/contract-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_CONTRACT";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["templates","actionContractTemplateId"],
          ["contracts","actionContractId"],
          ["versions","actionContractVersionId"],
          ["revocations","actionContractRevocationId"],
          ["boundary_handoffs","actionBoundaryHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="contracts"){
              store.createIndex(
                "actionInstanceId",
                "actionInstanceId",
                {unique:true}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    }catch(error){
      return runtime.failure(
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_CONTRACT_RECORD_NOT_FOUND",
            "Action-contract record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract retrieval failed."
      );
    }
  }

  async function getByActionInstanceId(actionInstanceId){
    try{
      const db=await open();
      const tx=db.transaction("contracts","readonly");
      const value=await reqp(
        tx.objectStore("contracts")
          .index("actionInstanceId")
          .get(actionInstanceId)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_ACTION_CONTRACT_NOT_FOUND",
            "Action contract was not found.",
            {actionInstanceId}
          );
    }catch(error){
      return runtime.failure(
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "ABA_CONTRACT_STORAGE_ERROR",
        error?.message || "Action-contract listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionContractStore =
    Object.freeze({
      open,
      put,
      get,
      getByActionInstanceId,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-09-Approved-Action-Contract-Generation-Engine/src/engine/approved-action-contract-engine.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerTemplate(input={}){
    const built =
      global.INFINICUS.ABA.actionContractTemplateModel
        .create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionContractStore.put(
      "templates",
      built.data
    );
  }

  async function generateContract({
    actionContractHandoffId,
    actionContractTemplateId,
    actionContext={},
    validityHours
  }={}){
    const handoff =
      await global.INFINICUS.ABA.approvalEvidenceAuditEngine
        .getActionContractHandoff({
          actionContractHandoffId
        });

    if(!handoff.ok) return handoff;

    if(handoff.data.status==="rejected"){
      return runtime.failure(
        "ABA_ACTION_CONTRACT_REJECTED",
        "Rejected approval evidence cannot generate an action contract."
      );
    }

    const evidencePackage =
      await global.INFINICUS.ABA.approvalEvidenceAuditEngine
        .getEvidencePackage({
          approvalEvidencePackageId:
            handoff.data.approvalEvidencePackageId
        });

    if(!evidencePackage.ok) return evidencePackage;

    const evidenceValidation =
      global.INFINICUS.ABA.actionContractValidator
        .validateEvidencePackage(evidencePackage.data);

    if(!evidenceValidation.valid){
      return runtime.failure(
        "ABA_APPROVAL_EVIDENCE_NOT_ELIGIBLE",
        "Approval evidence package cannot generate a contract.",
        evidenceValidation
      );
    }

    const template =
      await global.INFINICUS.ABA.actionContractStore.get(
        "templates",
        actionContractTemplateId
      );

    if(!template.ok) return template;

    const existing =
      await global.INFINICUS.ABA.actionContractStore
        .getByActionInstanceId(
          handoff.data.actionInstanceId
        );

    if(existing.ok){
      return runtime.success({
        actionContract:existing.data,
        idempotentReplay:true
      });
    }

    const issuedAt =
      new Date().toISOString();

    const hours =
      Math.max(
        1,
        Number(
          validityHours ||
          template.data.defaultValidityHours ||
          72
        )
      );

    const expiresAt =
      new Date(
        new Date(issuedAt).getTime() +
        hours * 3600000
      ).toISOString();

    const sections={
      identity:{
        actionInstanceId:
          handoff.data.actionInstanceId,
        approvalWorkflowId:
          handoff.data.approvalWorkflowId
      },
      approval:{
        approvalEvidencePackageId:
          evidencePackage.data.approvalEvidencePackageId,
        evidence:
          evidencePackage.data.evidence.map(runtime.clone),
        workflowOutcome:
          evidencePackage.data.workflowOutcome
      },
      target:
        runtime.clone(actionContext.target || {}),
      parameters:
        runtime.clone(actionContext.parameters || {}),
      conditions:
        evidencePackage.data.evidence
          .flatMap(item=>item.conditions || [])
          .map(runtime.clone),
      constraints:
        runtime.clone(actionContext.constraints || []),
      dependencies:
        runtime.clone(actionContext.dependencies || []),
      expected_outcomes:
        runtime.clone(actionContext.expectedOutcomes || []),
      rollback:
        runtime.clone(actionContext.rollbackConditions || []),
      monitoring:
        runtime.clone(actionContext.monitoringRequirements || [])
    };

    const contract={
      actionContractId:
        runtime.createId("aba_action_contract"),
      actionContractTemplateId,
      actionContractHandoffId,
      approvalEvidencePackageId:
        evidencePackage.data.approvalEvidencePackageId,
      approvalWorkflowId:
        handoff.data.approvalWorkflowId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        actionContext.businessId || null,
      twinId:
        actionContext.twinId || null,
      decisionId:
        actionContext.decisionId || null,
      recommendationId:
        actionContext.recommendationId || null,
      actionTypeId:
        actionContext.actionTypeId || null,
      actionTypeCode:
        actionContext.actionTypeCode || null,
      actionCategoryId:
        actionContext.actionCategoryId || null,
      target:
        runtime.clone(actionContext.target || {}),
      parameters:
        runtime.clone(actionContext.parameters || {}),
      constraints:
        runtime.clone(actionContext.constraints || []),
      dependencies:
        runtime.clone(actionContext.dependencies || []),
      expectedOutcomes:
        runtime.clone(actionContext.expectedOutcomes || []),
      rollbackConditions:
        runtime.clone(actionContext.rollbackConditions || []),
      monitoringRequirements:
        runtime.clone(actionContext.monitoringRequirements || []),
      executionConditions:
        runtime.clone(actionContext.executionConditions || []),
      approvalConditions:
        sections.conditions.map(runtime.clone),
      sections,
      version:
        1,
      status:
        "issued",
      issuedAt,
      expiresAt,
      revokedAt:
        null,
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      lineage:
        runtime.clone(actionContext.lineage || []),
      confidence:
        Number(actionContext.confidence ?? 0)
    };

    const validation =
      global.INFINICUS.ABA.actionContractValidator
        .validateContract(
          contract,
          template.data
        );

    if(!validation.valid){
      return runtime.failure(
        "ABA_ACTION_CONTRACT_INVALID",
        "Generated action contract failed validation.",
        validation
      );
    }

    const contractBody =
      runtime.clone(contract);

    contract.contractChecksum =
      global.INFINICUS.ABA.actionContractChecksum
        .hash(contractBody);

    await global.INFINICUS.ABA.actionContractStore.put(
      "contracts",
      contract
    );

    await global.INFINICUS.ABA.actionContractStore.put(
      "versions",
      {
        actionContractVersionId:
          runtime.createId("aba_action_contract_version"),
        actionContractId:
          contract.actionContractId,
        version:
          contract.version,
        contractChecksum:
          contract.contractChecksum,
        contractSnapshot:
          runtime.clone(contract),
        createdAt:
          new Date().toISOString()
      }
    );

    const boundaryHandoff={
      actionBoundaryHandoffId:
        runtime.createId("aba_action_boundary_handoff"),
      targetBlock:
        "ABA-10",
      actionContractId:
        contract.actionContractId,
      contractChecksum:
        contract.contractChecksum,
      actionInstanceId:
        contract.actionInstanceId,
      businessId:
        contract.businessId,
      twinId:
        contract.twinId,
      decisionId:
        contract.decisionId,
      recommendationId:
        contract.recommendationId,
      actionTypeId:
        contract.actionTypeId,
      actionTypeCode:
        contract.actionTypeCode,
      actionCategoryId:
        contract.actionCategoryId,
      target:
        runtime.clone(contract.target),
      parameters:
        runtime.clone(contract.parameters),
      constraints:
        contract.constraints.map(runtime.clone),
      dependencies:
        contract.dependencies.map(runtime.clone),
      expectedOutcomes:
        contract.expectedOutcomes.map(runtime.clone),
      rollbackConditions:
        contract.rollbackConditions.map(runtime.clone),
      monitoringRequirements:
        contract.monitoringRequirements.map(runtime.clone),
      executionConditions:
        contract.executionConditions.map(runtime.clone),
      approvalConditions:
        contract.approvalConditions.map(runtime.clone),
      issuedAt:
        contract.issuedAt,
      expiresAt:
        contract.expiresAt,
      confidence:
        contract.confidence,
      lineage:
        contract.lineage.map(runtime.clone),
      correlationId:
        contract.correlationId,
      causationId:
        contract.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionContractStore.put(
      "boundary_handoffs",
      boundaryHandoff
    );

    await runtime.emit(
      "aba.action_contract.issued",
      {
        actionContract:contract,
        actionBoundaryHandoffId:
          boundaryHandoff.actionBoundaryHandoffId
      }
    );

    return runtime.success({
      actionContract:contract,
      actionBoundaryHandoff:boundaryHandoff
    });
  }

  async function verifyContract({
    actionContractId
  }={}){
    const contract =
      await global.INFINICUS.ABA.actionContractStore.get(
        "contracts",
        actionContractId
      );

    if(!contract.ok) return contract;

    const body =
      runtime.clone(contract.data);

    const expected =
      body.contractChecksum;

    delete body.contractChecksum;

    const actual =
      global.INFINICUS.ABA.actionContractChecksum
        .hash(body);

    return runtime.success({
      valid:
        expected===actual,
      expectedChecksum:
        expected,
      calculatedChecksum:
        actual
    });
  }

  async function revokeContract({
    actionContractId,
    revokedBy,
    reason
  }={}){
    const contract =
      await global.INFINICUS.ABA.actionContractStore.get(
        "contracts",
        actionContractId
      );

    if(!contract.ok) return contract;

    const revocation={
      actionContractRevocationId:
        runtime.createId("aba_action_contract_revocation"),
      actionContractId,
      revokedBy:
        String(revokedBy || "unknown"),
      reason:
        String(reason || "Action contract revoked."),
      correlationId:
        contract.data.correlationId,
      createdAt:
        new Date().toISOString()
    };

    const updated={
      ...runtime.clone(contract.data),
      status:
        "revoked",
      revokedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionContractStore.put(
      "contracts",
      updated
    );

    await global.INFINICUS.ABA.actionContractStore.put(
      "revocations",
      revocation
    );

    await runtime.emit(
      "aba.action_contract.revoked",
      revocation
    );

    return runtime.success({
      actionContract:updated,
      revocation
    });
  }

  const api = Object.freeze({
    registerTemplate,
    generateContract,
    verifyContract,
    revokeContract,
    getActionContract:({actionContractId}) =>
      global.INFINICUS.ABA.actionContractStore.get(
        "contracts",
        actionContractId
      ),
    getActionBoundaryHandoff:({actionBoundaryHandoffId}) =>
      global.INFINICUS.ABA.actionContractStore.get(
        "boundary_handoffs",
        actionBoundaryHandoffId
      ),
    listContracts:() =>
      global.INFINICUS.ABA.actionContractStore.list(
        "contracts"
      )
  });

  runtime.registerService(
    "aba.approved_action_contract",
    api,
    {block:"ABA-09"}
  );

  runtime.registerRoute(
    "aba.action_contract_template.register",
    registerTemplate
  );

  runtime.registerRoute(
    "aba.action_contract.generate",
    generateContract
  );

  runtime.registerRoute(
    "aba.action_contract.verify",
    verifyContract
  );

  runtime.registerRoute(
    "aba.action_contract.revoke",
    revokeContract
  );

  runtime.registerBlock("ABA-09",{
    name:"Approved Action Contract Generation Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.approvedActionContractEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-10-Action-Scope-Parameter-Boundary-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-10-Action-Scope-Parameter-Boundary-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-10.");
  }

  if(!ABA?.approvedActionContractEngine){
    throw new Error("ABA-09 must be loaded before ABA-10.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-10-Action-Scope-Parameter-Boundary-Engine/src/model/boundary-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_BOUNDARY_POLICY_INVALID",
        "Boundary policy name and code are required."
      );
    }

    return runtime.success({
      actionBoundaryPolicyId:
        input.actionBoundaryPolicyId ||
        runtime.createId("aba_action_boundary_policy"),
      name:
        String(input.name),
      code:
        String(input.code),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      allowedTargetTypeIds:
        runtime.clone(input.allowedTargetTypeIds || []),
      parameterRules:
        runtime.clone(input.parameterRules || {}),
      maximumFinancialValue:
        input.maximumFinancialValue == null
          ? null
          : Number(input.maximumFinancialValue),
      currency:
        String(input.currency || "USD"),
      maximumQuantity:
        input.maximumQuantity == null
          ? null
          : Number(input.maximumQuantity),
      geographicCodes:
        runtime.clone(input.geographicCodes || []),
      allowedOperations:
        runtime.clone(input.allowedOperations || []),
      forbiddenOperations:
        runtime.clone(input.forbiddenOperations || []),
      maximumDurationMinutes:
        input.maximumDurationMinutes == null
          ? null
          : Number(input.maximumDurationMinutes),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionBoundaryPolicyModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-10-Action-Scope-Parameter-Boundary-Engine/src/validation/boundary-validator.js --- */
(function(global){
  "use strict";

  function includesOrOpen(values,value){
    return !values.length || values.includes(value);
  }

  function validateParameterRule(name,value,rule={}){
    const issues=[];

    if(rule.required && (value===undefined || value===null)){
      issues.push(`Required parameter is missing: ${name}`);
      return issues;
    }

    if(value===undefined || value===null){
      return issues;
    }

    if(
      rule.minimum != null &&
      Number(value) < Number(rule.minimum)
    ){
      issues.push(`${name} is below the approved minimum.`);
    }

    if(
      rule.maximum != null &&
      Number(value) > Number(rule.maximum)
    ){
      issues.push(`${name} exceeds the approved maximum.`);
    }

    if(
      Array.isArray(rule.allowedValues) &&
      rule.allowedValues.length &&
      !rule.allowedValues.some(item =>
        JSON.stringify(item) === JSON.stringify(value)
      )
    ){
      issues.push(`${name} contains a value outside the approved set.`);
    }

    return issues;
  }

  function validate({
    contract,
    policy,
    requestedTarget,
    requestedParameters,
    executionWindow,
    financialValue,
    currency,
    quantity,
    geographicCode,
    operations
  }){
    const issues=[];

    if(contract.status!=="issued"){
      issues.push("Action contract is not active.");
    }

    if(
      contract.expiresAt &&
      new Date(contract.expiresAt).getTime() <= Date.now()
    ){
      issues.push("Action contract has expired.");
    }

    if(contract.revokedAt){
      issues.push("Action contract has been revoked.");
    }

    if(
      !includesOrOpen(
        policy.actionTypeIds,
        contract.actionTypeId
      )
    ){
      issues.push("Boundary policy does not apply to this action type.");
    }

    if(
      !includesOrOpen(
        policy.allowedTargetTypeIds,
        requestedTarget?.targetTypeId
      )
    ){
      issues.push("Requested target type is outside approved scope.");
    }

    if(
      contract.target?.targetId &&
      requestedTarget?.targetId !== contract.target.targetId
    ){
      issues.push("Requested target differs from approved target.");
    }

    for(const [name,rule] of Object.entries(policy.parameterRules || {})){
      issues.push(
        ...validateParameterRule(
          name,
          requestedParameters[name],
          rule
        )
      );
    }

    for(const [name,value] of Object.entries(requestedParameters || {})){
      if(
        Object.prototype.hasOwnProperty.call(
          contract.parameters || {},
          name
        ) &&
        JSON.stringify(value) !==
        JSON.stringify(contract.parameters[name])
      ){
        const rule = policy.parameterRules?.[name];

        if(!rule?.allowOverride){
          issues.push(
            `Requested parameter changes approved value: ${name}`
          );
        }
      }
    }

    if(
      policy.maximumFinancialValue != null &&
      Number(financialValue || 0) >
      policy.maximumFinancialValue
    ){
      issues.push("Requested financial value exceeds approved boundary.");
    }

    if(
      policy.maximumFinancialValue != null &&
      currency !== policy.currency
    ){
      issues.push("Requested currency differs from boundary currency.");
    }

    if(
      policy.maximumQuantity != null &&
      Number(quantity || 0) >
      policy.maximumQuantity
    ){
      issues.push("Requested quantity exceeds approved boundary.");
    }

    if(
      !includesOrOpen(
        policy.geographicCodes,
        geographicCode
      )
    ){
      issues.push("Requested geography is outside approved boundary.");
    }

    for(const operation of operations || []){
      if(
        policy.forbiddenOperations.includes(operation)
      ){
        issues.push(`Operation is forbidden: ${operation}`);
      }

      if(
        policy.allowedOperations.length &&
        !policy.allowedOperations.includes(operation)
      ){
        issues.push(`Operation is not approved: ${operation}`);
      }
    }

    if(
      policy.maximumDurationMinutes != null &&
      executionWindow?.startsAt &&
      executionWindow?.endsAt
    ){
      const duration =
        (
          new Date(executionWindow.endsAt).getTime() -
          new Date(executionWindow.startsAt).getTime()
        ) / 60000;

      if(duration > policy.maximumDurationMinutes){
        issues.push("Execution window exceeds approved duration.");
      }
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.actionBoundaryValidator =
    Object.freeze({
      includesOrOpen,
      validateParameterRule,
      validate
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-10-Action-Scope-Parameter-Boundary-Engine/src/storage/boundary-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_BOUNDARY";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["policies","actionBoundaryPolicyId"],
          ["boundaries","actionBoundaryId"],
          ["violations","actionBoundaryViolationId"],
          ["revalidation_handoffs","constraintRevalidationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    }catch(error){
      return runtime.failure(
        "ABA_BOUNDARY_STORAGE_ERROR",
        error?.message || "Action-boundary storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_BOUNDARY_RECORD_NOT_FOUND",
            "Action-boundary record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_BOUNDARY_STORAGE_ERROR",
        error?.message || "Action-boundary retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "ABA_BOUNDARY_STORAGE_ERROR",
        error?.message || "Action-boundary listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionBoundaryStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-10-Action-Scope-Parameter-Boundary-Engine/src/engine/action-scope-boundary-engine.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerPolicy(input={}){
    const built =
      global.INFINICUS.ABA.actionBoundaryPolicyModel
        .create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionBoundaryStore.put(
      "policies",
      built.data
    );
  }

  async function defineBoundary({
    actionBoundaryHandoffId,
    actionBoundaryPolicyId,
    requestedTarget,
    requestedParameters={},
    executionWindow={},
    financialValue=0,
    currency="USD",
    quantity=0,
    geographicCode=null,
    operations=[]
  }={}){
    const handoff =
      await global.INFINICUS.ABA.approvedActionContractEngine
        .getActionBoundaryHandoff({
          actionBoundaryHandoffId
        });

    if(!handoff.ok) return handoff;

    const contract =
      await global.INFINICUS.ABA.approvedActionContractEngine
        .getActionContract({
          actionContractId:
            handoff.data.actionContractId
        });

    if(!contract.ok) return contract;

    const policy =
      await global.INFINICUS.ABA.actionBoundaryStore.get(
        "policies",
        actionBoundaryPolicyId
      );

    if(!policy.ok) return policy;

    const validation =
      global.INFINICUS.ABA.actionBoundaryValidator.validate({
        contract:contract.data,
        policy:policy.data,
        requestedTarget:
          requestedTarget || contract.data.target,
        requestedParameters,
        executionWindow,
        financialValue,
        currency,
        quantity,
        geographicCode,
        operations
      });

    if(!validation.valid){
      const violation={
        actionBoundaryViolationId:
          runtime.createId("aba_action_boundary_violation"),
        actionBoundaryHandoffId,
        actionContractId:
          contract.data.actionContractId,
        actionInstanceId:
          contract.data.actionInstanceId,
        issues:
          validation.issues,
        requestedTarget:
          runtime.clone(requestedTarget || {}),
        requestedParameters:
          runtime.clone(requestedParameters),
        executionWindow:
          runtime.clone(executionWindow),
        financialValue:
          Number(financialValue),
        currency,
        quantity:
          Number(quantity),
        geographicCode,
        operations:
          runtime.clone(operations),
        correlationId:
          contract.data.correlationId,
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.actionBoundaryStore.put(
        "violations",
        violation
      );

      await runtime.emit(
        "aba.action_boundary.violated",
        violation
      );

      return runtime.failure(
        "ABA_ACTION_BOUNDARY_VIOLATION",
        "Requested action exceeds approved boundaries.",
        violation
      );
    }

    const boundary={
      actionBoundaryId:
        runtime.createId("aba_action_boundary"),
      actionBoundaryHandoffId,
      actionBoundaryPolicyId,
      actionContractId:
        contract.data.actionContractId,
      actionInstanceId:
        contract.data.actionInstanceId,
      businessId:
        contract.data.businessId,
      twinId:
        contract.data.twinId,
      decisionId:
        contract.data.decisionId,
      recommendationId:
        contract.data.recommendationId,
      actionTypeId:
        contract.data.actionTypeId,
      actionTypeCode:
        contract.data.actionTypeCode,
      actionCategoryId:
        contract.data.actionCategoryId,
      target:
        runtime.clone(
          requestedTarget || contract.data.target
        ),
      boundedParameters:
        runtime.clone(requestedParameters),
      executionWindow:
        runtime.clone(executionWindow),
      financialBoundary:{
        maximum:
          policy.data.maximumFinancialValue,
        requested:
          Number(financialValue),
        currency
      },
      quantityBoundary:{
        maximum:
          policy.data.maximumQuantity,
        requested:
          Number(quantity)
      },
      geographicBoundary:{
        allowed:
          runtime.clone(policy.data.geographicCodes),
        requested:
          geographicCode
      },
      operationBoundary:{
        allowed:
          runtime.clone(policy.data.allowedOperations),
        forbidden:
          runtime.clone(policy.data.forbiddenOperations),
        requested:
          runtime.clone(operations)
      },
      parameterRules:
        runtime.clone(policy.data.parameterRules),
      approvalConditions:
        contract.data.approvalConditions.map(runtime.clone),
      executionConditions:
        contract.data.executionConditions.map(runtime.clone),
      rollbackConditions:
        contract.data.rollbackConditions.map(runtime.clone),
      monitoringRequirements:
        contract.data.monitoringRequirements.map(runtime.clone),
      constraints:
        contract.data.constraints.map(runtime.clone),
      dependencies:
        contract.data.dependencies.map(runtime.clone),
      expectedOutcomes:
        contract.data.expectedOutcomes.map(runtime.clone),
      expiresAt:
        contract.data.expiresAt,
      revokedAt:
        contract.data.revokedAt,
      confidence:
        contract.data.confidence,
      lineage:
        contract.data.lineage.map(runtime.clone),
      correlationId:
        contract.data.correlationId,
      causationId:
        contract.data.causationId,
      status:
        "bounded",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionBoundaryStore.put(
      "boundaries",
      boundary
    );

    const revalidationHandoff={
      constraintRevalidationHandoffId:
        runtime.createId("aba_constraint_revalidation_handoff"),
      targetBlock:
        "ABA-11",
      actionBoundaryId:
        boundary.actionBoundaryId,
      actionContractId:
        boundary.actionContractId,
      actionInstanceId:
        boundary.actionInstanceId,
      businessId:
        boundary.businessId,
      twinId:
        boundary.twinId,
      decisionId:
        boundary.decisionId,
      recommendationId:
        boundary.recommendationId,
      actionTypeId:
        boundary.actionTypeId,
      actionTypeCode:
        boundary.actionTypeCode,
      actionCategoryId:
        boundary.actionCategoryId,
      target:
        runtime.clone(boundary.target),
      boundedParameters:
        runtime.clone(boundary.boundedParameters),
      executionWindow:
        runtime.clone(boundary.executionWindow),
      financialBoundary:
        runtime.clone(boundary.financialBoundary),
      quantityBoundary:
        runtime.clone(boundary.quantityBoundary),
      geographicBoundary:
        runtime.clone(boundary.geographicBoundary),
      operationBoundary:
        runtime.clone(boundary.operationBoundary),
      approvalConditions:
        boundary.approvalConditions.map(runtime.clone),
      executionConditions:
        boundary.executionConditions.map(runtime.clone),
      rollbackConditions:
        boundary.rollbackConditions.map(runtime.clone),
      monitoringRequirements:
        boundary.monitoringRequirements.map(runtime.clone),
      constraints:
        boundary.constraints.map(runtime.clone),
      dependencies:
        boundary.dependencies.map(runtime.clone),
      expectedOutcomes:
        boundary.expectedOutcomes.map(runtime.clone),
      expiresAt:
        boundary.expiresAt,
      revokedAt:
        boundary.revokedAt,
      confidence:
        boundary.confidence,
      lineage:
        boundary.lineage.map(runtime.clone),
      correlationId:
        boundary.correlationId,
      causationId:
        boundary.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionBoundaryStore.put(
      "revalidation_handoffs",
      revalidationHandoff
    );

    await runtime.emit(
      "aba.action_boundary.defined",
      {
        actionBoundary:boundary,
        constraintRevalidationHandoffId:
          revalidationHandoff.constraintRevalidationHandoffId
      }
    );

    return runtime.success({
      actionBoundary:boundary,
      constraintRevalidationHandoff:
        revalidationHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    defineBoundary,
    getActionBoundary:({actionBoundaryId}) =>
      global.INFINICUS.ABA.actionBoundaryStore.get(
        "boundaries",
        actionBoundaryId
      ),
    getConstraintRevalidationHandoff:({
      constraintRevalidationHandoffId
    }) =>
      global.INFINICUS.ABA.actionBoundaryStore.get(
        "revalidation_handoffs",
        constraintRevalidationHandoffId
      ),
    listViolations:() =>
      global.INFINICUS.ABA.actionBoundaryStore.list(
        "violations"
      )
  });

  runtime.registerService(
    "aba.action_scope_boundary",
    api,
    {block:"ABA-10"}
  );

  runtime.registerRoute(
    "aba.action_boundary_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.action_boundary.define",
    defineBoundary
  );

  runtime.registerBlock("ABA-10",{
    name:"Action Scope, Parameter and Boundary Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionScopeBoundaryEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-11-Constraint-Dependency-Revalidation-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-11-Constraint-Dependency-Revalidation-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-11.");
  }

  if(!ABA?.actionScopeBoundaryEngine){
    throw new Error("ABA-10 must be loaded before ABA-11.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-11-Constraint-Dependency-Revalidation-Engine/src/model/constraint-rule.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.constraintType){
      return runtime.failure(
        "ABA_CONSTRAINT_RULE_INVALID",
        "name, code, and constraintType are required."
      );
    }

    return runtime.success({
      constraintRuleId:
        input.constraintRuleId ||
        runtime.createId("aba_constraint_rule"),
      name:
        String(input.name),
      code:
        String(input.code),
      constraintType:
        String(input.constraintType),
      statePath:
        String(input.statePath || ""),
      operator:
        String(input.operator || "exists"),
      expectedValue:
        runtime.clone(input.expectedValue),
      tolerance:
        input.tolerance == null
          ? null
          : Number(input.tolerance),
      severity:
        String(input.severity || "high"),
      blocking:
        input.blocking !== false,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.constraintRuleModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-11-Constraint-Dependency-Revalidation-Engine/src/model/dependency.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.dependencyType){
      return runtime.failure(
        "ABA_DEPENDENCY_INVALID",
        "name, code, and dependencyType are required."
      );
    }

    return runtime.success({
      dependencyId:
        input.dependencyId ||
        runtime.createId("aba_dependency"),
      name:
        String(input.name),
      code:
        String(input.code),
      dependencyType:
        String(input.dependencyType),
      sourceSystem:
        String(input.sourceSystem || "unknown"),
      requiredState:
        String(input.requiredState || "available"),
      expiresAt:
        input.expiresAt || null,
      blocking:
        input.blocking !== false,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.dependencyModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-11-Constraint-Dependency-Revalidation-Engine/src/validation/revalidation-evaluator.js --- */
(function(global){
  "use strict";

  function getByPath(object,path){
    if(!path) return object;

    return path
      .split(".")
      .reduce(
        (value,key) =>
          value == null ? undefined : value[key],
        object
      );
  }

  function compare(actual,operator,expected,tolerance=null){
    if(operator==="exists") return actual !== undefined && actual !== null;
    if(operator==="equals") return actual === expected;
    if(operator==="not_equals") return actual !== expected;
    if(operator==="gte") return Number(actual) >= Number(expected);
    if(operator==="lte") return Number(actual) <= Number(expected);
    if(operator==="gt") return Number(actual) > Number(expected);
    if(operator==="lt") return Number(actual) < Number(expected);
    if(operator==="includes"){
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual || "").includes(String(expected));
    }
    if(operator==="within_tolerance"){
      return Math.abs(Number(actual)-Number(expected)) <= Number(tolerance || 0);
    }
    return false;
  }

  function evaluate({
    rules,
    dependencies,
    liveState,
    dependencyStates,
    actionContext
  }){
    const issues=[];

    for(const rule of rules.filter(item=>item.status==="active")){
      const actual = getByPath(liveState,rule.statePath);
      const passed = compare(
        actual,
        rule.operator,
        rule.expectedValue,
        rule.tolerance
      );

      if(!passed){
        issues.push({
          type:"constraint",
          ruleId:rule.constraintRuleId,
          code:rule.code,
          severity:rule.severity,
          blocking:rule.blocking,
          actual,
          expected:rule.expectedValue,
          message:`Constraint failed: ${rule.name}`
        });
      }
    }

    for(const dependency of dependencies.filter(item=>item.status==="active")){
      const state = dependencyStates[dependency.code];

      if(
        dependency.expiresAt &&
        new Date(dependency.expiresAt).getTime() <= Date.now()
      ){
        issues.push({
          type:"dependency",
          dependencyId:dependency.dependencyId,
          code:dependency.code,
          severity:"critical",
          blocking:dependency.blocking,
          message:`Dependency expired: ${dependency.name}`
        });
        continue;
      }

      if(state !== dependency.requiredState){
        issues.push({
          type:"dependency",
          dependencyId:dependency.dependencyId,
          code:dependency.code,
          severity:"high",
          blocking:dependency.blocking,
          actual:state,
          expected:dependency.requiredState,
          message:`Dependency unavailable: ${dependency.name}`
        });
      }
    }

    if(
      actionContext.expiresAt &&
      new Date(actionContext.expiresAt).getTime() <= Date.now()
    ){
      issues.push({
        type:"action",
        code:"ACTION_EXPIRED",
        severity:"critical",
        blocking:true,
        message:"Approved action has expired."
      });
    }

    if(actionContext.revokedAt){
      issues.push({
        type:"action",
        code:"ACTION_REVOKED",
        severity:"critical",
        blocking:true,
        message:"Approved action has been revoked."
      });
    }

    return {
      passed:
        !issues.some(item=>item.blocking),
      issues
    };
  }

  global.INFINICUS.ABA.revalidationEvaluator =
    Object.freeze({
      getByPath,
      compare,
      evaluate
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-11-Constraint-Dependency-Revalidation-Engine/src/storage/revalidation-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_REVALIDATION";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["constraints","constraintRuleId"],
          ["dependencies","dependencyId"],
          ["results","revalidationResultId"],
          ["issues","revalidationIssueId"],
          ["conflict_handoffs","conflictAnalysisHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_REVALIDATION_STORAGE_ERROR",
        error?.message || "Revalidation storage failed."
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
            "ABA_REVALIDATION_RECORD_NOT_FOUND",
            "Revalidation record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_REVALIDATION_STORAGE_ERROR",
        error?.message || "Revalidation retrieval failed."
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
        "ABA_REVALIDATION_STORAGE_ERROR",
        error?.message || "Revalidation listing failed."
      );
    }
  }

  global.INFINICUS.ABA.revalidationStore =
    Object.freeze({open,put,get,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-11-Constraint-Dependency-Revalidation-Engine/src/engine/constraint-dependency-revalidation-engine.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerConstraint(input={}){
    const built =
      global.INFINICUS.ABA.constraintRuleModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.revalidationStore.put(
      "constraints",
      built.data
    );
  }

  async function registerDependency(input={}){
    const built =
      global.INFINICUS.ABA.dependencyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.revalidationStore.put(
      "dependencies",
      built.data
    );
  }

  async function revalidate({
    constraintRevalidationHandoffId,
    constraintRuleIds=[],
    dependencyIds=[],
    liveState={},
    dependencyStates={}
  }={}){
    const handoff =
      await global.INFINICUS.ABA.actionScopeBoundaryEngine
        .getConstraintRevalidationHandoff({
          constraintRevalidationHandoffId
        });

    if(!handoff.ok) return handoff;

    const rules=[];

    for(const id of constraintRuleIds){
      const result =
        await global.INFINICUS.ABA.revalidationStore.get(
          "constraints",
          id
        );

      if(!result.ok) return result;
      rules.push(result.data);
    }

    const dependencies=[];

    for(const id of dependencyIds){
      const result =
        await global.INFINICUS.ABA.revalidationStore.get(
          "dependencies",
          id
        );

      if(!result.ok) return result;
      dependencies.push(result.data);
    }

    const evaluation =
      global.INFINICUS.ABA.revalidationEvaluator.evaluate({
        rules,
        dependencies,
        liveState,
        dependencyStates,
        actionContext:handoff.data
      });

    const resultRecord={
      revalidationResultId:
        runtime.createId("aba_revalidation_result"),
      constraintRevalidationHandoffId,
      actionBoundaryId:
        handoff.data.actionBoundaryId,
      actionContractId:
        handoff.data.actionContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      passed:
        evaluation.passed,
      issues:
        runtime.clone(evaluation.issues),
      liveState:
        runtime.clone(liveState),
      dependencyStates:
        runtime.clone(dependencyStates),
      correlationId:
        handoff.data.correlationId,
      status:
        evaluation.passed
          ? "passed"
          : "blocked",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.revalidationStore.put(
      "results",
      resultRecord
    );

    for(const issue of evaluation.issues){
      await global.INFINICUS.ABA.revalidationStore.put(
        "issues",
        {
          revalidationIssueId:
            runtime.createId("aba_revalidation_issue"),
          revalidationResultId:
            resultRecord.revalidationResultId,
          actionInstanceId:
            resultRecord.actionInstanceId,
          ...runtime.clone(issue),
          correlationId:
            resultRecord.correlationId,
          createdAt:
            new Date().toISOString()
        }
      );
    }

    if(!evaluation.passed){
      await runtime.emit(
        "aba.revalidation.blocked",
        resultRecord
      );

      return runtime.failure(
        "ABA_REVALIDATION_FAILED",
        "Live constraints or dependencies failed revalidation.",
        resultRecord
      );
    }

    const conflictHandoff={
      conflictAnalysisHandoffId:
        runtime.createId("aba_conflict_analysis_handoff"),
      targetBlock:
        "ABA-12",
      revalidationResultId:
        resultRecord.revalidationResultId,
      actionBoundaryId:
        handoff.data.actionBoundaryId,
      actionContractId:
        handoff.data.actionContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      boundedParameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      revalidationEvidence:
        runtime.clone(resultRecord),
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.revalidationStore.put(
      "conflict_handoffs",
      conflictHandoff
    );

    await runtime.emit(
      "aba.revalidation.passed",
      {
        revalidationResult:resultRecord,
        conflictAnalysisHandoffId:
          conflictHandoff.conflictAnalysisHandoffId
      }
    );

    return runtime.success({
      revalidationResult:resultRecord,
      conflictAnalysisHandoff:conflictHandoff
    });
  }

  const api = Object.freeze({
    registerConstraint,
    registerDependency,
    revalidate,
    getRevalidationResult:({revalidationResultId}) =>
      global.INFINICUS.ABA.revalidationStore.get(
        "results",
        revalidationResultId
      ),
    getConflictAnalysisHandoff:({conflictAnalysisHandoffId}) =>
      global.INFINICUS.ABA.revalidationStore.get(
        "conflict_handoffs",
        conflictAnalysisHandoffId
      ),
    listIssues:() =>
      global.INFINICUS.ABA.revalidationStore.list(
        "issues"
      )
  });

  runtime.registerService(
    "aba.constraint_dependency_revalidation",
    api,
    {block:"ABA-11"}
  );

  runtime.registerRoute(
    "aba.constraint_rule.register",
    registerConstraint
  );

  runtime.registerRoute(
    "aba.dependency.register",
    registerDependency
  );

  runtime.registerRoute(
    "aba.constraints.revalidate",
    revalidate
  );

  runtime.registerBlock("ABA-11",{
    name:"Constraint and Dependency Revalidation Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.constraintDependencyRevalidationEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-12-Conflict-Duplication-Action-Collision-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-12-Conflict-Duplication-Action-Collision-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-12.");
  }

  if(!ABA?.constraintDependencyRevalidationEngine){
    throw new Error("ABA-11 must be loaded before ABA-12.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-12-Conflict-Duplication-Action-Collision-Engine/src/model/active-action.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(
      !input.actionInstanceId ||
      !input.actionTypeId ||
      !input.businessId
    ){
      return runtime.failure(
        "ABA_ACTIVE_ACTION_INVALID",
        "actionInstanceId, actionTypeId, and businessId are required."
      );
    }

    return runtime.success({
      activeActionId:
        input.activeActionId ||
        runtime.createId("aba_active_action"),
      actionInstanceId:
        String(input.actionInstanceId),
      actionContractId:
        input.actionContractId || null,
      businessId:
        String(input.businessId),
      actionTypeId:
        String(input.actionTypeId),
      actionTypeCode:
        String(input.actionTypeCode || ""),
      actionCategoryId:
        input.actionCategoryId || null,
      target:
        runtime.clone(input.target || {}),
      parameters:
        runtime.clone(input.parameters || {}),
      executionWindow:
        runtime.clone(input.executionWindow || {}),
      allocations:
        runtime.clone(input.allocations || {}),
      operations:
        runtime.clone(input.operations || []),
      state:
        String(input.state || "scheduled"),
      correlationId:
        input.correlationId || null,
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.activeActionModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-12-Conflict-Duplication-Action-Collision-Engine/src/validation/collision-detector.js --- */
(function(global){
  "use strict";

  function windowsOverlap(left={},right={}){
    const leftStart = left.startsAt
      ? new Date(left.startsAt).getTime()
      : -Infinity;

    const leftEnd = left.endsAt
      ? new Date(left.endsAt).getTime()
      : Infinity;

    const rightStart = right.startsAt
      ? new Date(right.startsAt).getTime()
      : -Infinity;

    const rightEnd = right.endsAt
      ? new Date(right.endsAt).getTime()
      : Infinity;

    return leftStart <= rightEnd && rightStart <= leftEnd;
  }

  function sameTarget(left,right){
    return (
      left?.targetId &&
      right?.targetId &&
      left.targetId === right.targetId
    );
  }

  function parameterContradictions(left={},right={}){
    const contradictions=[];

    for(const key of Object.keys(left)){
      if(
        Object.prototype.hasOwnProperty.call(right,key) &&
        JSON.stringify(left[key]) !== JSON.stringify(right[key])
      ){
        contradictions.push(key);
      }
    }

    return contradictions;
  }

  function allocationCollisions(left={},right={}){
    const collisions=[];

    for(const resourceType of [
      "budget",
      "workforceHours",
      "inventoryUnits",
      "capacityUnits"
    ]){
      const leftValue = Number(left[resourceType] || 0);
      const rightValue = Number(right[resourceType] || 0);

      if(leftValue > 0 && rightValue > 0){
        collisions.push({
          resourceType,
          combined:leftValue+rightValue
        });
      }
    }

    return collisions;
  }

  function detect(candidate,activeActions){
    const conflicts=[];

    for(const active of activeActions){
      if(active.state==="cancelled" || active.state==="completed"){
        continue;
      }

      const overlap = windowsOverlap(
        candidate.executionWindow,
        active.executionWindow
      );

      if(!overlap) continue;

      const duplicate = (
        candidate.actionTypeId === active.actionTypeId &&
        sameTarget(candidate.target,active.target) &&
        JSON.stringify(candidate.parameters) === JSON.stringify(active.parameters)
      );

      if(duplicate){
        conflicts.push({
          type:"duplicate",
          severity:"high",
          conflictingActionInstanceId:active.actionInstanceId,
          message:"An equivalent action already exists in an overlapping window."
        });
      }

      if(
        sameTarget(candidate.target,active.target) &&
        candidate.actionTypeId !== active.actionTypeId
      ){
        conflicts.push({
          type:"target_collision",
          severity:"high",
          conflictingActionInstanceId:active.actionInstanceId,
          message:"Different actions target the same entity in an overlapping window."
        });
      }

      const contradictions = parameterContradictions(
        candidate.parameters,
        active.parameters
      );

      if(
        sameTarget(candidate.target,active.target) &&
        contradictions.length
      ){
        conflicts.push({
          type:"parameter_contradiction",
          severity:"high",
          conflictingActionInstanceId:active.actionInstanceId,
          parameters:contradictions,
          message:"Action parameters contradict an overlapping action."
        });
      }

      const allocations = allocationCollisions(
        candidate.allocations,
        active.allocations
      );

      for(const collision of allocations){
        conflicts.push({
          type:"allocation_collision",
          severity:"medium",
          conflictingActionInstanceId:active.actionInstanceId,
          ...collision,
          message:`Potential ${collision.resourceType} allocation collision.`
        });
      }

      const incompatible = (candidate.operations || [])
        .filter(operation =>
          (active.operations || []).includes(`not:${operation}`) ||
          (candidate.operations || []).includes(`not:${operation}`)
        );

      if(incompatible.length){
        conflicts.push({
          type:"operation_collision",
          severity:"critical",
          conflictingActionInstanceId:active.actionInstanceId,
          operations:incompatible,
          message:"Mutually exclusive operations overlap."
        });
      }
    }

    return {
      conflictFree:
        conflicts.length===0,
      conflicts
    };
  }

  global.INFINICUS.ABA.actionCollisionDetector =
    Object.freeze({
      windowsOverlap,
      sameTarget,
      parameterContradictions,
      allocationCollisions,
      detect
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-12-Conflict-Duplication-Action-Collision-Engine/src/storage/collision-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_ACTION_COLLISIONS";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["active_actions","activeActionId"],
          ["analyses","collisionAnalysisId"],
          ["conflicts","actionConflictId"],
          ["resolutions","actionConflictResolutionId"],
          ["decomposition_handoffs","actionDecompositionHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="active_actions"){
              store.createIndex(
                "businessId",
                "businessId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_COLLISION_STORAGE_ERROR",
        error?.message || "Collision storage failed."
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
            "ABA_COLLISION_RECORD_NOT_FOUND",
            "Collision record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_COLLISION_STORAGE_ERROR",
        error?.message || "Collision retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName)
          .index(indexName)
          .getAll(value)
      );

      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_COLLISION_STORAGE_ERROR",
        error?.message || "Collision listing failed."
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
        "ABA_COLLISION_STORAGE_ERROR",
        error?.message || "Collision listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionCollisionStore =
    Object.freeze({
      open,
      put,
      get,
      listByIndex,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-12-Conflict-Duplication-Action-Collision-Engine/src/engine/action-collision-engine.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerActiveAction(input={}){
    const built =
      global.INFINICUS.ABA.activeActionModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionCollisionStore.put(
      "active_actions",
      built.data
    );
  }

  async function analyze({
    conflictAnalysisHandoffId,
    allocations={},
    operations=[]
  }={}){
    const handoff =
      await global.INFINICUS.ABA.constraintDependencyRevalidationEngine
        .getConflictAnalysisHandoff({
          conflictAnalysisHandoffId
        });

    if(!handoff.ok) return handoff;

    const active =
      await global.INFINICUS.ABA.actionCollisionStore
        .listByIndex(
          "active_actions",
          "businessId",
          handoff.data.businessId
        );

    if(!active.ok) return active;

    const candidate={
      actionInstanceId:
        handoff.data.actionInstanceId,
      actionContractId:
        handoff.data.actionContractId,
      businessId:
        handoff.data.businessId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      parameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      allocations:
        runtime.clone(allocations),
      operations:
        runtime.clone(operations)
    };

    const detection =
      global.INFINICUS.ABA.actionCollisionDetector.detect(
        candidate,
        active.data
      );

    const analysis={
      collisionAnalysisId:
        runtime.createId("aba_collision_analysis"),
      conflictAnalysisHandoffId,
      actionInstanceId:
        candidate.actionInstanceId,
      businessId:
        candidate.businessId,
      candidate:
        runtime.clone(candidate),
      conflictFree:
        detection.conflictFree,
      conflicts:
        runtime.clone(detection.conflicts),
      correlationId:
        handoff.data.correlationId,
      status:
        detection.conflictFree
          ? "clear"
          : "conflicted",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "analyses",
      analysis
    );

    for(const conflict of detection.conflicts){
      await global.INFINICUS.ABA.actionCollisionStore.put(
        "conflicts",
        {
          actionConflictId:
            runtime.createId("aba_action_conflict"),
          collisionAnalysisId:
            analysis.collisionAnalysisId,
          actionInstanceId:
            analysis.actionInstanceId,
          ...runtime.clone(conflict),
          resolutionStatus:
            "unresolved",
          correlationId:
            analysis.correlationId,
          createdAt:
            new Date().toISOString()
        }
      );
    }

    if(!detection.conflictFree){
      await runtime.emit(
        "aba.action_collision.detected",
        analysis
      );

      return runtime.failure(
        "ABA_ACTION_COLLISION_DETECTED",
        "Action conflicts or duplicates were detected.",
        analysis
      );
    }

    const decompositionHandoff={
      actionDecompositionHandoffId:
        runtime.createId("aba_action_decomposition_handoff"),
      targetBlock:
        "ABA-13",
      collisionAnalysisId:
        analysis.collisionAnalysisId,
      revalidationResultId:
        handoff.data.revalidationResultId,
      actionBoundaryId:
        handoff.data.actionBoundaryId,
      actionContractId:
        handoff.data.actionContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      boundedParameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      allocations:
        runtime.clone(allocations),
      operations:
        runtime.clone(operations),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      revalidationEvidence:
        runtime.clone(handoff.data.revalidationEvidence),
      collisionEvidence:
        runtime.clone(analysis),
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "decomposition_handoffs",
      decompositionHandoff
    );

    await runtime.emit(
      "aba.action_collision.clear",
      {
        collisionAnalysis:analysis,
        actionDecompositionHandoffId:
          decompositionHandoff.actionDecompositionHandoffId
      }
    );

    return runtime.success({
      collisionAnalysis:analysis,
      actionDecompositionHandoff:decompositionHandoff
    });
  }

  async function resolveConflict({
    actionConflictId,
    resolution,
    resolvedBy
  }={}){
    const conflict =
      await global.INFINICUS.ABA.actionCollisionStore.get(
        "conflicts",
        actionConflictId
      );

    if(!conflict.ok) return conflict;

    const record={
      actionConflictResolutionId:
        runtime.createId("aba_action_conflict_resolution"),
      actionConflictId,
      collisionAnalysisId:
        conflict.data.collisionAnalysisId,
      resolution:
        runtime.clone(resolution || {}),
      resolvedBy:
        String(resolvedBy || "unknown"),
      correlationId:
        conflict.data.correlationId,
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "resolutions",
      record
    );

    const updated={
      ...runtime.clone(conflict.data),
      resolutionStatus:
        "resolved",
      resolvedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "conflicts",
      updated
    );

    await runtime.emit(
      "aba.action_collision.resolved",
      record
    );

    return runtime.success({
      conflict:updated,
      resolution:record
    });
  }

  const api = Object.freeze({
    registerActiveAction,
    analyze,
    resolveConflict,
    getCollisionAnalysis:({collisionAnalysisId}) =>
      global.INFINICUS.ABA.actionCollisionStore.get(
        "analyses",
        collisionAnalysisId
      ),
    getActionDecompositionHandoff:({actionDecompositionHandoffId}) =>
      global.INFINICUS.ABA.actionCollisionStore.get(
        "decomposition_handoffs",
        actionDecompositionHandoffId
      ),
    listConflicts:() =>
      global.INFINICUS.ABA.actionCollisionStore.list(
        "conflicts"
      )
  });

  runtime.registerService(
    "aba.action_collision",
    api,
    {block:"ABA-12"}
  );

  runtime.registerRoute(
    "aba.active_action.register",
    registerActiveAction
  );

  runtime.registerRoute(
    "aba.action_collision.analyze",
    analyze
  );

  runtime.registerRoute(
    "aba.action_collision.resolve",
    resolveConflict
  );

  runtime.registerBlock("ABA-12",{
    name:"Conflict, Duplication and Action Collision Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionCollisionEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-13-Action-Decomposition-Execution-Plan-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-13-Action-Decomposition-Execution-Plan-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-13.");
  }

  if(!ABA?.actionCollisionEngine){
    throw new Error("ABA-12 must be loaded before ABA-13.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-13-Action-Decomposition-Execution-Plan-Engine/src/model/task-template.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_TASK_TEMPLATE_INVALID",
        "Task template name and code are required."
      );
    }

    return runtime.success({
      taskTemplateId:
        input.taskTemplateId ||
        runtime.createId("aba_task_template"),
      name:
        String(input.name),
      code:
        String(input.code),
      description:
        String(input.description || ""),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      defaultDurationMinutes:
        Math.max(1, Number(input.defaultDurationMinutes || 60)),
      requiredCapabilities:
        runtime.clone(input.requiredCapabilities || []),
      requiredInputs:
        runtime.clone(input.requiredInputs || []),
      expectedOutputs:
        runtime.clone(input.expectedOutputs || []),
      completionCriteria:
        runtime.clone(input.completionCriteria || []),
      verificationCriteria:
        runtime.clone(input.verificationCriteria || []),
      rollbackInstructions:
        runtime.clone(input.rollbackInstructions || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.taskTemplateModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-13-Action-Decomposition-Execution-Plan-Engine/src/model/execution-task.js --- */
(function(global){
  "use strict";

  function create({plan,template,input={},sequence=1}){
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      executionTaskId:
        input.executionTaskId ||
        runtime.createId("aba_execution_task"),
      executionPlanId:
        plan.executionPlanId,
      taskTemplateId:
        template.taskTemplateId,
      name:
        String(input.name || template.name),
      code:
        String(input.code || template.code),
      description:
        String(input.description || template.description || ""),
      sequence:
        Number(input.sequence || sequence),
      groupCode:
        String(input.groupCode || "default"),
      executionMode:
        String(input.executionMode || "sequential"),
      durationMinutes:
        Math.max(
          1,
          Number(
            input.durationMinutes ||
            template.defaultDurationMinutes ||
            60
          )
        ),
      dependencies:
        runtime.clone(input.dependencies || []),
      requiredCapabilities:
        runtime.clone(
          input.requiredCapabilities ||
          template.requiredCapabilities ||
          []
        ),
      inputs:
        runtime.clone(input.inputs || {}),
      expectedOutputs:
        runtime.clone(
          input.expectedOutputs ||
          template.expectedOutputs ||
          []
        ),
      completionCriteria:
        runtime.clone(
          input.completionCriteria ||
          template.completionCriteria ||
          []
        ),
      verificationCriteria:
        runtime.clone(
          input.verificationCriteria ||
          template.verificationCriteria ||
          []
        ),
      rollbackInstructions:
        runtime.clone(
          input.rollbackInstructions ||
          template.rollbackInstructions ||
          []
        ),
      isMilestone:
        Boolean(input.isMilestone),
      isRollbackPoint:
        Boolean(input.isRollbackPoint),
      state:
        "planned",
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionTaskModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-13-Action-Decomposition-Execution-Plan-Engine/src/validation/decomposition-validator.js --- */
(function(global){
  "use strict";

  function detectCycles(tasks){
    const byId = new Map(tasks.map(task=>[task.executionTaskId,task]));
    const visiting = new Set();
    const visited = new Set();

    function visit(id){
      if(visiting.has(id)) return true;
      if(visited.has(id)) return false;

      visiting.add(id);

      const task = byId.get(id);

      for(const dependencyId of task?.dependencies || []){
        if(!byId.has(dependencyId)) continue;
        if(visit(dependencyId)) return true;
      }

      visiting.delete(id);
      visited.add(id);
      return false;
    }

    return tasks.some(task=>visit(task.executionTaskId));
  }

  function validate(tasks){
    const issues=[];
    const ids = new Set(tasks.map(task=>task.executionTaskId));

    if(!tasks.length){
      issues.push("Execution plan must contain at least one task.");
    }

    for(const task of tasks){
      if(!task.name || !task.code){
        issues.push(`Task identity is incomplete: ${task.executionTaskId}`);
      }

      for(const dependencyId of task.dependencies || []){
        if(!ids.has(dependencyId)){
          issues.push(
            `Unknown dependency ${dependencyId} for task ${task.executionTaskId}`
          );
        }
      }

      if(!task.completionCriteria.length){
        issues.push(
          `Task lacks completion criteria: ${task.executionTaskId}`
        );
      }
    }

    if(detectCycles(tasks)){
      issues.push("Execution plan contains a circular dependency.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  function calculateCriticalPath(tasks){
    const byId = new Map(tasks.map(task=>[task.executionTaskId,task]));
    const memo = new Map();

    function durationTo(id){
      if(memo.has(id)) return memo.get(id);

      const task = byId.get(id);

      if(!task) return 0;

      const dependencyDuration =
        Math.max(
          0,
          ...(task.dependencies || []).map(durationTo)
        );

      const total =
        dependencyDuration +
        Number(task.durationMinutes || 0);

      memo.set(id,total);
      return total;
    }

    const durations = tasks.map(task=>({
      executionTaskId:task.executionTaskId,
      totalMinutes:durationTo(task.executionTaskId)
    }));

    const maximum =
      Math.max(0,...durations.map(item=>item.totalMinutes));

    return {
      totalDurationMinutes:maximum,
      terminalTasks:
        durations
          .filter(item=>item.totalMinutes===maximum)
          .map(item=>item.executionTaskId)
    };
  }

  global.INFINICUS.ABA.decompositionValidator =
    Object.freeze({
      detectCycles,
      validate,
      calculateCriticalPath
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-13-Action-Decomposition-Execution-Plan-Engine/src/storage/decomposition-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_EXECUTION_PLAN";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["templates","taskTemplateId"],
          ["plans","executionPlanId"],
          ["tasks","executionTaskId"],
          ["milestones","executionMilestoneId"],
          ["assignment_handoffs","taskAssignmentHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="tasks"){
              store.createIndex(
                "executionPlanId",
                "executionPlanId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_DECOMPOSITION_STORAGE_ERROR",
        error?.message || "Execution-plan storage failed."
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
            "ABA_DECOMPOSITION_RECORD_NOT_FOUND",
            "Execution-plan record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_DECOMPOSITION_STORAGE_ERROR",
        error?.message || "Execution-plan retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName)
          .index(indexName)
          .getAll(value)
      );

      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_DECOMPOSITION_STORAGE_ERROR",
        error?.message || "Execution-plan listing failed."
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
        "ABA_DECOMPOSITION_STORAGE_ERROR",
        error?.message || "Execution-plan listing failed."
      );
    }
  }

  global.INFINICUS.ABA.decompositionStore =
    Object.freeze({
      open,
      put,
      get,
      listByIndex,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-13-Action-Decomposition-Execution-Plan-Engine/src/engine/action-decomposition-execution-plan-engine.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerTaskTemplate(input={}){
    const built =
      global.INFINICUS.ABA.taskTemplateModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.decompositionStore.put(
      "templates",
      built.data
    );
  }

  async function decompose({
    actionDecompositionHandoffId,
    taskDefinitions=[]
  }={}){
    const handoff =
      await global.INFINICUS.ABA.actionCollisionEngine
        .getActionDecompositionHandoff({
          actionDecompositionHandoffId
        });

    if(!handoff.ok) return handoff;

    const plan={
      executionPlanId:
        runtime.createId("aba_execution_plan"),
      actionDecompositionHandoffId,
      collisionAnalysisId:
        handoff.data.collisionAnalysisId,
      actionContractId:
        handoff.data.actionContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      target:
        runtime.clone(handoff.data.target),
      boundedParameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      allocations:
        runtime.clone(handoff.data.allocations),
      operations:
        runtime.clone(handoff.data.operations),
      state:
        "draft",
      version:
        1,
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    const taskRecords=[];

    for(let index=0;index<taskDefinitions.length;index+=1){
      const definition=taskDefinitions[index];

      const template =
        await global.INFINICUS.ABA.decompositionStore.get(
          "templates",
          definition.taskTemplateId
        );

      if(!template.ok) return template;

      const built =
        global.INFINICUS.ABA.executionTaskModel.create({
          plan,
          template:template.data,
          input:definition,
          sequence:index+1
        });

      if(!built.ok) return built;
      taskRecords.push(built.data);
    }

    const validation =
      global.INFINICUS.ABA.decompositionValidator.validate(
        taskRecords
      );

    if(!validation.valid){
      return runtime.failure(
        "ABA_EXECUTION_PLAN_INVALID",
        "Execution plan failed decomposition validation.",
        validation
      );
    }

    const criticalPath =
      global.INFINICUS.ABA.decompositionValidator
        .calculateCriticalPath(taskRecords);

    const completedPlan={
      ...plan,
      taskCount:
        taskRecords.length,
      criticalPath:
        runtime.clone(criticalPath),
      state:
        "defined",
      updatedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.decompositionStore.put(
      "plans",
      completedPlan
    );

    for(const task of taskRecords){
      await global.INFINICUS.ABA.decompositionStore.put(
        "tasks",
        task
      );

      if(task.isMilestone){
        await global.INFINICUS.ABA.decompositionStore.put(
          "milestones",
          {
            executionMilestoneId:
              runtime.createId("aba_execution_milestone"),
            executionPlanId:
              completedPlan.executionPlanId,
            executionTaskId:
              task.executionTaskId,
            name:
              task.name,
            verificationCriteria:
              runtime.clone(task.verificationCriteria),
            state:
              "planned",
            createdAt:
              new Date().toISOString()
          }
        );
      }
    }

    const assignmentHandoff={
      taskAssignmentHandoffId:
        runtime.createId("aba_task_assignment_handoff"),
      targetBlock:
        "ABA-14",
      executionPlanId:
        completedPlan.executionPlanId,
      actionContractId:
        completedPlan.actionContractId,
      actionInstanceId:
        completedPlan.actionInstanceId,
      businessId:
        completedPlan.businessId,
      twinId:
        completedPlan.twinId,
      actionTypeId:
        completedPlan.actionTypeId,
      actionTypeCode:
        completedPlan.actionTypeCode,
      target:
        runtime.clone(completedPlan.target),
      executionWindow:
        runtime.clone(completedPlan.executionWindow),
      allocations:
        runtime.clone(completedPlan.allocations),
      tasks:
        taskRecords.map(runtime.clone),
      criticalPath:
        runtime.clone(criticalPath),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.decompositionStore.put(
      "assignment_handoffs",
      assignmentHandoff
    );

    await runtime.emit(
      "aba.execution_plan.created",
      {
        executionPlan:completedPlan,
        taskAssignmentHandoffId:
          assignmentHandoff.taskAssignmentHandoffId
      }
    );

    return runtime.success({
      executionPlan:completedPlan,
      tasks:taskRecords,
      taskAssignmentHandoff:assignmentHandoff
    });
  }

  const api = Object.freeze({
    registerTaskTemplate,
    decompose,
    getExecutionPlan:({executionPlanId}) =>
      global.INFINICUS.ABA.decompositionStore.get(
        "plans",
        executionPlanId
      ),
    getTaskAssignmentHandoff:({taskAssignmentHandoffId}) =>
      global.INFINICUS.ABA.decompositionStore.get(
        "assignment_handoffs",
        taskAssignmentHandoffId
      ),
    listExecutionTasks:({executionPlanId}) =>
      global.INFINICUS.ABA.decompositionStore.listByIndex(
        "tasks",
        "executionPlanId",
        executionPlanId
      )
  });

  runtime.registerService(
    "aba.action_decomposition_execution_plan",
    api,
    {block:"ABA-13"}
  );

  runtime.registerRoute(
    "aba.task_template.register",
    registerTaskTemplate
  );

  runtime.registerRoute(
    "aba.action.decompose",
    decompose
  );

  runtime.registerBlock("ABA-13",{
    name:"Action Decomposition and Execution Plan Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionDecompositionExecutionPlanEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-14.");
  }

  if(!ABA?.actionDecompositionExecutionPlanEngine){
    throw new Error("ABA-13 must be loaded before ABA-14.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine/src/model/actor.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.actorType){
      return runtime.failure(
        "ABA_ACTOR_INVALID",
        "Actor name and actorType are required."
      );
    }

    return runtime.success({
      actorId:
        input.actorId ||
        runtime.createId("aba_actor"),
      name:
        String(input.name),
      actorType:
        String(input.actorType),
      roleIds:
        runtime.clone(input.roleIds || []),
      teamIds:
        runtime.clone(input.teamIds || []),
      capabilityCodes:
        runtime.clone(input.capabilityCodes || []),
      departmentId:
        input.departmentId || null,
      legalEntityId:
        input.legalEntityId || null,
      maximumConcurrentTasks:
        Math.max(1,Number(input.maximumConcurrentTasks || 5)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actorModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine/src/model/team.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_TEAM_INVALID",
        "Team name and code are required."
      );
    }

    return runtime.success({
      teamId:
        input.teamId ||
        runtime.createId("aba_team"),
      name:
        String(input.name),
      code:
        String(input.code),
      actorIds:
        runtime.clone(input.actorIds || []),
      capabilityCodes:
        runtime.clone(input.capabilityCodes || []),
      departmentId:
        input.departmentId || null,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.teamModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine/src/model/assignment.js --- */
(function(global){
  "use strict";

  function create({
    executionTask,
    actor,
    assignmentType,
    assignedBy
  }){
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      taskAssignmentId:
        runtime.createId("aba_task_assignment"),
      executionPlanId:
        executionTask.executionPlanId,
      executionTaskId:
        executionTask.executionTaskId,
      actorId:
        actor.actorId,
      actorType:
        actor.actorType,
      assignmentType:
        String(assignmentType || "primary"),
      assignedBy:
        String(assignedBy || "system"),
      requiredCapabilities:
        runtime.clone(
          executionTask.requiredCapabilities || []
        ),
      state:
        "pending_acceptance",
      acceptedAt:
        null,
      rejectedAt:
        null,
      rejectionReason:
        null,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.taskAssignmentModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine/src/validation/assignment-validator.js --- */
(function(global){
  "use strict";

  function validate({
    actor,
    task,
    currentAssignments,
    unavailablePeriods=[],
    separationRules=[],
    relatedAssignments=[]
  }){
    const issues=[];

    if(!actor || actor.status!=="active"){
      issues.push("Actor is not active.");
    }

    const actorCapabilities =
      new Set(actor?.capabilityCodes || []);

    for(const capability of task.requiredCapabilities || []){
      if(!actorCapabilities.has(capability)){
        issues.push(`Actor lacks required capability: ${capability}`);
      }
    }

    const activeCount =
      currentAssignments.filter(item =>
        !["completed","cancelled","rejected"].includes(item.state)
      ).length;

    if(
      actor &&
      activeCount >= actor.maximumConcurrentTasks
    ){
      issues.push("Actor workload limit has been reached.");
    }

    const now = Date.now();

    for(const period of unavailablePeriods){
      const start =
        new Date(period.startsAt).getTime();

      const end =
        new Date(period.endsAt).getTime();

      if(now >= start && now <= end){
        issues.push("Actor is currently unavailable.");
      }
    }

    for(const rule of separationRules){
      if(
        rule.taskCode === task.code &&
        relatedAssignments.some(item =>
          item.actorId === actor.actorId &&
          rule.incompatibleTaskCodes.includes(item.taskCode)
        )
      ){
        issues.push("Separation-of-duties rule prevents assignment.");
      }
    }

    return {
      eligible:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.assignmentValidator =
    Object.freeze({validate});
})(window);

/* --- approved-business-action/INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine/src/storage/assignment-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_TASK_ASSIGNMENT";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["actors","actorId"],
          ["teams","teamId"],
          ["availability","availabilityRecordId"],
          ["assignments","taskAssignmentId"],
          ["separation_rules","separationRuleId"],
          ["reservation_handoffs","resourceReservationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="assignments"){
              store.createIndex(
                "actorId",
                "actorId",
                {unique:false}
              );

              store.createIndex(
                "executionTaskId",
                "executionTaskId",
                {unique:false}
              );

              store.createIndex(
                "executionPlanId",
                "executionPlanId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_ASSIGNMENT_STORAGE_ERROR",
        error?.message || "Task-assignment storage failed."
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
            "ABA_ASSIGNMENT_RECORD_NOT_FOUND",
            "Task-assignment record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_ASSIGNMENT_STORAGE_ERROR",
        error?.message || "Task-assignment retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName)
          .index(indexName)
          .getAll(value)
      );

      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_ASSIGNMENT_STORAGE_ERROR",
        error?.message || "Task-assignment listing failed."
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
        "ABA_ASSIGNMENT_STORAGE_ERROR",
        error?.message || "Task-assignment listing failed."
      );
    }
  }

  global.INFINICUS.ABA.assignmentStore =
    Object.freeze({
      open,
      put,
      get,
      listByIndex,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-14-Responsible-Actor-Task-Assignment-Engine/src/engine/responsible-actor-task-assignment-engine.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerActor(input={}){
    const built =
      global.INFINICUS.ABA.actorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.assignmentStore.put(
      "actors",
      built.data
    );
  }

  async function registerTeam(input={}){
    const built =
      global.INFINICUS.ABA.teamModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.assignmentStore.put(
      "teams",
      built.data
    );
  }

  async function registerAvailability(input={}){
    if(!input.actorId || !input.startsAt || !input.endsAt){
      return runtime.failure(
        "ABA_AVAILABILITY_INVALID",
        "actorId, startsAt, and endsAt are required."
      );
    }

    return global.INFINICUS.ABA.assignmentStore.put(
      "availability",
      {
        availabilityRecordId:
          input.availabilityRecordId ||
          runtime.createId("aba_availability"),
        actorId:
          input.actorId,
        availabilityType:
          String(input.availabilityType || "unavailable"),
        startsAt:
          input.startsAt,
        endsAt:
          input.endsAt,
        reason:
          input.reason || null,
        createdAt:
          new Date().toISOString()
      }
    );
  }

  async function registerSeparationRule(input={}){
    if(!input.taskCode || !Array.isArray(input.incompatibleTaskCodes)){
      return runtime.failure(
        "ABA_SEPARATION_RULE_INVALID",
        "taskCode and incompatibleTaskCodes are required."
      );
    }

    return global.INFINICUS.ABA.assignmentStore.put(
      "separation_rules",
      {
        separationRuleId:
          input.separationRuleId ||
          runtime.createId("aba_separation_rule"),
        taskCode:
          String(input.taskCode),
        incompatibleTaskCodes:
          runtime.clone(input.incompatibleTaskCodes),
        status:
          String(input.status || "active"),
        createdAt:
          new Date().toISOString()
      }
    );
  }

  async function assignTasks({
    taskAssignmentHandoffId,
    assignments=[],
    assignedBy="system"
  }={}){
    const handoff =
      await global.INFINICUS.ABA.actionDecompositionExecutionPlanEngine
        .getTaskAssignmentHandoff({
          taskAssignmentHandoffId
        });

    if(!handoff.ok) return handoff;

    const separationRules =
      await global.INFINICUS.ABA.assignmentStore.list(
        "separation_rules"
      );

    if(!separationRules.ok) return separationRules;

    const createdAssignments=[];

    for(const request of assignments){
      const task =
        handoff.data.tasks.find(item =>
          item.executionTaskId === request.executionTaskId
        );

      if(!task){
        return runtime.failure(
          "ABA_EXECUTION_TASK_NOT_FOUND",
          `Task not found in assignment handoff: ${request.executionTaskId}`
        );
      }

      const actor =
        await global.INFINICUS.ABA.assignmentStore.get(
          "actors",
          request.actorId
        );

      if(!actor.ok) return actor;

      const currentAssignments =
        await global.INFINICUS.ABA.assignmentStore.listByIndex(
          "assignments",
          "actorId",
          request.actorId
        );

      if(!currentAssignments.ok) return currentAssignments;

      const unavailable =
        (await global.INFINICUS.ABA.assignmentStore.list(
          "availability"
        )).data.filter(item =>
          item.actorId === request.actorId &&
          item.availabilityType === "unavailable"
        );

      const relatedAssignments =
        createdAssignments.map(item=>({
          actorId:item.actorId,
          taskCode:
            handoff.data.tasks.find(task =>
              task.executionTaskId === item.executionTaskId
            )?.code
        }));

      const validation =
        global.INFINICUS.ABA.assignmentValidator.validate({
          actor:actor.data,
          task,
          currentAssignments:currentAssignments.data,
          unavailablePeriods:unavailable,
          separationRules:
            separationRules.data.filter(item =>
              item.status==="active"
            ),
          relatedAssignments
        });

      if(!validation.eligible){
        return runtime.failure(
          "ABA_TASK_ASSIGNMENT_INELIGIBLE",
          "Actor is not eligible for the task.",
          {
            executionTaskId:task.executionTaskId,
            actorId:actor.data.actorId,
            issues:validation.issues
          }
        );
      }

      const built =
        global.INFINICUS.ABA.taskAssignmentModel.create({
          executionTask:task,
          actor:actor.data,
          assignmentType:
            request.assignmentType || "primary",
          assignedBy
        });

      if(!built.ok) return built;

      await global.INFINICUS.ABA.assignmentStore.put(
        "assignments",
        built.data
      );

      createdAssignments.push(built.data);
    }

    const taskIds =
      new Set(handoff.data.tasks.map(task=>task.executionTaskId));

    const primaryTaskIds =
      new Set(
        createdAssignments
          .filter(item=>item.assignmentType==="primary")
          .map(item=>item.executionTaskId)
      );

    const missingPrimary =
      [...taskIds].filter(id=>!primaryTaskIds.has(id));

    if(missingPrimary.length){
      return runtime.failure(
        "ABA_PRIMARY_ASSIGNMENT_MISSING",
        "Every execution task requires a primary responsible actor.",
        {missingPrimary}
      );
    }

    await runtime.emit(
      "aba.task_assignments.created",
      {
        executionPlanId:
          handoff.data.executionPlanId,
        assignmentCount:
          createdAssignments.length
      }
    );

    return runtime.success({
      executionPlanId:
        handoff.data.executionPlanId,
      assignments:
        createdAssignments
    });
  }

  async function respond({
    taskAssignmentId,
    response,
    reason=null
  }={}){
    if(!["accepted","rejected"].includes(response)){
      return runtime.failure(
        "ABA_ASSIGNMENT_RESPONSE_INVALID",
        "Assignment response must be accepted or rejected."
      );
    }

    const assignment =
      await global.INFINICUS.ABA.assignmentStore.get(
        "assignments",
        taskAssignmentId
      );

    if(!assignment.ok) return assignment;

    if(
      ["accepted","rejected"].includes(assignment.data.state)
    ){
      return runtime.success({
        taskAssignment:assignment.data,
        idempotentReplay:true
      });
    }

    const updated={
      ...runtime.clone(assignment.data),
      state:response,
      acceptedAt:
        response==="accepted"
          ? new Date().toISOString()
          : null,
      rejectedAt:
        response==="rejected"
          ? new Date().toISOString()
          : null,
      rejectionReason:
        response==="rejected"
          ? reason || "Assignment rejected."
          : null,
      updatedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.assignmentStore.put(
      "assignments",
      updated
    );

    await runtime.emit(
      `aba.task_assignment.${response}`,
      updated
    );

    return runtime.success({
      taskAssignment:updated
    });
  }

  async function prepareReservationHandoff({
    executionPlanId
  }={}){
    const assignments =
      await global.INFINICUS.ABA.assignmentStore.listByIndex(
        "assignments",
        "executionPlanId",
        executionPlanId
      );

    if(!assignments.ok) return assignments;

    const primary =
      assignments.data.filter(item =>
        item.assignmentType==="primary"
      );

    if(
      !primary.length ||
      primary.some(item=>item.state!=="accepted")
    ){
      return runtime.failure(
        "ABA_ASSIGNMENTS_NOT_ACCEPTED",
        "All primary assignments must be accepted before resource reservation."
      );
    }

    const handoff={
      resourceReservationHandoffId:
        runtime.createId("aba_resource_reservation_handoff"),
      targetBlock:
        "ABA-15",
      executionPlanId,
      assignments:
        assignments.data.map(runtime.clone),
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.assignmentStore.put(
      "reservation_handoffs",
      handoff
    );

    await runtime.emit(
      "aba.task_assignments.ready_for_reservation",
      handoff
    );

    return runtime.success({
      resourceReservationHandoff:handoff
    });
  }

  const api = Object.freeze({
    registerActor,
    registerTeam,
    registerAvailability,
    registerSeparationRule,
    assignTasks,
    respond,
    prepareReservationHandoff,
    getTaskAssignment:({taskAssignmentId}) =>
      global.INFINICUS.ABA.assignmentStore.get(
        "assignments",
        taskAssignmentId
      ),
    getResourceReservationHandoff:({
      resourceReservationHandoffId
    }) =>
      global.INFINICUS.ABA.assignmentStore.get(
        "reservation_handoffs",
        resourceReservationHandoffId
      ),
    listPlanAssignments:({executionPlanId}) =>
      global.INFINICUS.ABA.assignmentStore.listByIndex(
        "assignments",
        "executionPlanId",
        executionPlanId
      )
  });

  runtime.registerService(
    "aba.responsible_actor_task_assignment",
    api,
    {block:"ABA-14"}
  );

  runtime.registerRoute(
    "aba.actor.register",
    registerActor
  );

  runtime.registerRoute(
    "aba.team.register",
    registerTeam
  );

  runtime.registerRoute(
    "aba.actor_availability.register",
    registerAvailability
  );

  runtime.registerRoute(
    "aba.separation_rule.register",
    registerSeparationRule
  );

  runtime.registerRoute(
    "aba.tasks.assign",
    assignTasks
  );

  runtime.registerRoute(
    "aba.task_assignment.respond",
    respond
  );

  runtime.registerRoute(
    "aba.task_assignments.prepare_reservation",
    prepareReservationHandoff
  );

  runtime.registerBlock("ABA-14",{
    name:"Responsible Actor and Task Assignment Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.responsibleActorTaskAssignmentEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-15-Resource-Reservation-Availability-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-15-Resource-Reservation-Availability-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-15.");
  if(!ABA?.responsibleActorTaskAssignmentEngine){
    throw new Error("ABA-14 must be loaded before ABA-15.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-15-Resource-Reservation-Availability-Engine/src/model/resource.js --- */
(function(global){
  "use strict";
  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;
    if(!input.name || !input.resourceType){
      return runtime.failure(
        "ABA_RESOURCE_INVALID",
        "Resource name and resourceType are required."
      );
    }
    return runtime.success({
      resourceId:input.resourceId || runtime.createId("aba_resource"),
      name:String(input.name),
      resourceType:String(input.resourceType),
      poolId:input.poolId || null,
      unit:String(input.unit || "unit"),
      totalQuantity:Number(input.totalQuantity || 0),
      reservedQuantity:Number(input.reservedQuantity || 0),
      availableQuantity:
        Number(input.availableQuantity ??
          (Number(input.totalQuantity || 0)-Number(input.reservedQuantity || 0))),
      currency:input.currency || null,
      locationCode:input.locationCode || null,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.resourceModel=Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-15-Resource-Reservation-Availability-Engine/src/model/reservation.js --- */
(function(global){
  "use strict";
  function create({handoff,request,resource}){
    const runtime=global.INFINICUS.ABA.runtime;
    const startsAt=request.startsAt || new Date().toISOString();
    const expiresAt=request.expiresAt ||
      new Date(Date.now()+Number(request.holdMinutes || 60)*60000).toISOString();

    return runtime.success({
      resourceReservationId:runtime.createId("aba_resource_reservation"),
      resourceReservationHandoffId:handoff.resourceReservationHandoffId,
      executionPlanId:handoff.executionPlanId,
      executionTaskId:request.executionTaskId || null,
      taskAssignmentId:request.taskAssignmentId || null,
      resourceId:resource.resourceId,
      resourceType:resource.resourceType,
      quantity:Number(request.quantity || 0),
      unit:resource.unit,
      startsAt,
      expiresAt,
      state:"reserved",
      correlationId:handoff.correlationId || null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.resourceReservationModel=Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-15-Resource-Reservation-Availability-Engine/src/validation/reservation-validator.js --- */
(function(global){
  "use strict";

  function validateRequest({resource,request,existingReservations=[]}){
    const issues=[];
    const quantity=Number(request.quantity || 0);

    if(!resource || resource.status!=="active"){
      issues.push("Resource is not active.");
    }

    if(quantity<=0){
      issues.push("Reservation quantity must be greater than zero.");
    }

    const currentlyReserved=existingReservations
      .filter(item =>
        item.state==="reserved" &&
        (!item.expiresAt || new Date(item.expiresAt).getTime()>Date.now())
      )
      .reduce((sum,item)=>sum+Number(item.quantity || 0),0);

    const available=
      Number(resource?.totalQuantity || 0)-currentlyReserved;

    if(quantity>available){
      issues.push("Requested quantity exceeds available resource capacity.");
    }

    if(
      request.expiresAt &&
      new Date(request.expiresAt).getTime()<=Date.now()
    ){
      issues.push("Reservation expiry must be in the future.");
    }

    return {
      valid:issues.length===0,
      issues,
      availableQuantity:available
    };
  }

  global.INFINICUS.ABA.resourceReservationValidator=
    Object.freeze({validateRequest});
})(window);

/* --- approved-business-action/INFINICUS-ABA-15-Resource-Reservation-Availability-Engine/src/storage/reservation-store.js --- */
(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_RESOURCE_RESERVATION";
  let dbPromise;
  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const [name,keyPath] of [
          ["resources","resourceId"],
          ["reservations","resourceReservationId"],
          ["availability","availabilitySnapshotId"],
          ["failures","reservationFailureId"],
          ["schedule_handoffs","executionScheduleHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});
            if(name==="reservations"){
              store.createIndex("resourceId","resourceId",{unique:false});
              store.createIndex("executionPlanId","executionPlanId",{unique:false});
            }
          }
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_RESERVATION_STORAGE_ERROR",
        error?.message || "Resource-reservation storage failed."
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
            "ABA_RESERVATION_RECORD_NOT_FOUND",
            "Reservation record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_RESERVATION_STORAGE_ERROR",
        error?.message || "Reservation retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).index(indexName).getAll(value)
      );
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_RESERVATION_STORAGE_ERROR",
        error?.message || "Reservation listing failed."
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
        "ABA_RESERVATION_STORAGE_ERROR",
        error?.message || "Reservation listing failed."
      );
    }
  }

  global.INFINICUS.ABA.resourceReservationStore=
    Object.freeze({open,put,get,listByIndex,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-15-Resource-Reservation-Availability-Engine/src/engine/resource-reservation-availability-engine.js --- */
(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;

  async function registerResource(input={}){
    const built=global.INFINICUS.ABA.resourceModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.ABA.resourceReservationStore.put(
      "resources",built.data
    );
  }

  async function reserve({
    resourceReservationHandoffId,
    requests=[]
  }={}){
    const handoff=
      await global.INFINICUS.ABA.responsibleActorTaskAssignmentEngine
        .getResourceReservationHandoff({resourceReservationHandoffId});

    if(!handoff.ok) return handoff;

    const created=[];

    for(const request of requests){
      const resource=
        await global.INFINICUS.ABA.resourceReservationStore.get(
          "resources",
          request.resourceId
        );
      if(!resource.ok) return resource;

      const existing=
        await global.INFINICUS.ABA.resourceReservationStore.listByIndex(
          "reservations",
          "resourceId",
          request.resourceId
        );
      if(!existing.ok) return existing;

      const validation=
        global.INFINICUS.ABA.resourceReservationValidator.validateRequest({
          resource:resource.data,
          request,
          existingReservations:existing.data
        });

      if(!validation.valid){
        const failure={
          reservationFailureId:runtime.createId("aba_reservation_failure"),
          resourceReservationHandoffId,
          executionPlanId:handoff.data.executionPlanId,
          resourceId:request.resourceId,
          request:runtime.clone(request),
          issues:validation.issues,
          createdAt:new Date().toISOString()
        };
        await global.INFINICUS.ABA.resourceReservationStore.put(
          "failures",
          failure
        );
        return runtime.failure(
          "ABA_RESOURCE_RESERVATION_FAILED",
          "Resource reservation failed.",
          failure
        );
      }

      const built=
        global.INFINICUS.ABA.resourceReservationModel.create({
          handoff:handoff.data,
          request,
          resource:resource.data
        });

      if(!built.ok) return built;

      await global.INFINICUS.ABA.resourceReservationStore.put(
        "reservations",
        built.data
      );

      created.push(built.data);
    }

    const scheduleHandoff={
      executionScheduleHandoffId:
        runtime.createId("aba_execution_schedule_handoff"),
      targetBlock:"ABA-16",
      executionPlanId:handoff.data.executionPlanId,
      assignments:handoff.data.assignments.map(runtime.clone),
      reservations:created.map(runtime.clone),
      correlationId:handoff.data.correlationId || null,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.resourceReservationStore.put(
      "schedule_handoffs",
      scheduleHandoff
    );

    await runtime.emit("aba.resources.reserved",{
      executionPlanId:handoff.data.executionPlanId,
      reservationCount:created.length,
      executionScheduleHandoffId:
        scheduleHandoff.executionScheduleHandoffId
    });

    return runtime.success({
      reservations:created,
      executionScheduleHandoff:scheduleHandoff
    });
  }

  async function release({
    resourceReservationId,
    releasedBy,
    reason
  }={}){
    const reservation=
      await global.INFINICUS.ABA.resourceReservationStore.get(
        "reservations",
        resourceReservationId
      );

    if(!reservation.ok) return reservation;

    if(reservation.data.state==="released"){
      return runtime.success({
        reservation:reservation.data,
        idempotentReplay:true
      });
    }

    const updated={
      ...runtime.clone(reservation.data),
      state:"released",
      releasedBy:String(releasedBy || "system"),
      releaseReason:String(reason || "Reservation released."),
      releasedAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.resourceReservationStore.put(
      "reservations",
      updated
    );

    await runtime.emit("aba.resource_reservation.released",updated);

    return runtime.success({reservation:updated});
  }

  async function expireReservations(){
    const all=
      await global.INFINICUS.ABA.resourceReservationStore.list("reservations");

    if(!all.ok) return all;

    const expired=[];

    for(const item of all.data){
      if(
        item.state==="reserved" &&
        item.expiresAt &&
        new Date(item.expiresAt).getTime()<=Date.now()
      ){
        const updated={
          ...runtime.clone(item),
          state:"expired",
          expiredAt:new Date().toISOString(),
          updatedAt:new Date().toISOString()
        };
        await global.INFINICUS.ABA.resourceReservationStore.put(
          "reservations",
          updated
        );
        expired.push(updated);
      }
    }

    return runtime.success({expired});
  }

  const api=Object.freeze({
    registerResource,
    reserve,
    release,
    expireReservations,
    getReservation:({resourceReservationId}) =>
      global.INFINICUS.ABA.resourceReservationStore.get(
        "reservations",
        resourceReservationId
      ),
    getExecutionScheduleHandoff:({executionScheduleHandoffId}) =>
      global.INFINICUS.ABA.resourceReservationStore.get(
        "schedule_handoffs",
        executionScheduleHandoffId
      ),
    listPlanReservations:({executionPlanId}) =>
      global.INFINICUS.ABA.resourceReservationStore.listByIndex(
        "reservations",
        "executionPlanId",
        executionPlanId
      )
  });

  runtime.registerService(
    "aba.resource_reservation_availability",
    api,
    {block:"ABA-15"}
  );

  runtime.registerRoute("aba.resource.register",registerResource);
  runtime.registerRoute("aba.resources.reserve",reserve);
  runtime.registerRoute("aba.resource_reservation.release",release);
  runtime.registerRoute("aba.resource_reservations.expire",expireReservations);

  runtime.registerBlock("ABA-15",{
    name:"Resource Reservation and Availability Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.resourceReservationAvailabilityEngine=api;
})(window);

/* ===== INFINICUS-ABA-16-Execution-Scheduling-Action-Queue-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-16-Execution-Scheduling-Action-Queue-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-16.");
  if(!ABA?.resourceReservationAvailabilityEngine){
    throw new Error("ABA-15 must be loaded before ABA-16.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-16-Execution-Scheduling-Action-Queue-Engine/src/model/schedule-policy.js --- */
(function(global){
  "use strict";
  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;
    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_SCHEDULE_POLICY_INVALID",
        "Schedule policy name and code are required."
      );
    }
    return runtime.success({
      executionSchedulePolicyId:
        input.executionSchedulePolicyId ||
        runtime.createId("aba_execution_schedule_policy"),
      name:String(input.name),
      code:String(input.code),
      defaultPriority:Number(input.defaultPriority || 50),
      maximumConcurrentTasks:
        Math.max(1,Number(input.maximumConcurrentTasks || 5)),
      retryLimit:Math.max(0,Number(input.retryLimit || 3)),
      retryBackoffSeconds:
        Math.max(1,Number(input.retryBackoffSeconds || 60)),
      leaseSeconds:
        Math.max(30,Number(input.leaseSeconds || 300)),
      allowReschedule:input.allowReschedule !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.executionSchedulePolicyModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-16-Execution-Scheduling-Action-Queue-Engine/src/model/queue-item.js --- */
(function(global){
  "use strict";
  function create({schedule,task,assignment,reservationIds,priority}){
    const runtime=global.INFINICUS.ABA.runtime;
    return runtime.success({
      actionQueueItemId:runtime.createId("aba_action_queue_item"),
      executionScheduleId:schedule.executionScheduleId,
      executionPlanId:schedule.executionPlanId,
      executionTaskId:task.executionTaskId,
      taskAssignmentId:assignment?.taskAssignmentId || null,
      assignedActorId:assignment?.actorId || null,
      reservationIds:runtime.clone(reservationIds || []),
      sequence:Number(task.sequence || 1),
      dependencies:runtime.clone(task.dependencies || []),
      priority:Number(priority ?? schedule.defaultPriority),
      scheduledStartAt:task.scheduledStartAt,
      scheduledEndAt:task.scheduledEndAt,
      state:"queued",
      attemptCount:0,
      leaseOwner:null,
      leaseExpiresAt:null,
      correlationId:schedule.correlationId,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.actionQueueItemModel=Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-16-Execution-Scheduling-Action-Queue-Engine/src/validation/schedule-validator.js --- */
(function(global){
  "use strict";

  function topologicalSort(tasks){
    const byId=new Map(tasks.map(task=>[task.executionTaskId,task]));
    const indegree=new Map(tasks.map(task=>[task.executionTaskId,0]));
    const outgoing=new Map(tasks.map(task=>[task.executionTaskId,[]]));

    for(const task of tasks){
      for(const dependencyId of task.dependencies || []){
        if(!byId.has(dependencyId)) continue;
        indegree.set(task.executionTaskId,indegree.get(task.executionTaskId)+1);
        outgoing.get(dependencyId).push(task.executionTaskId);
      }
    }

    const queue=[...indegree.entries()]
      .filter(([,count])=>count===0)
      .map(([id])=>id);

    const ordered=[];

    while(queue.length){
      const id=queue.shift();
      ordered.push(byId.get(id));

      for(const next of outgoing.get(id) || []){
        indegree.set(next,indegree.get(next)-1);
        if(indegree.get(next)===0) queue.push(next);
      }
    }

    return {
      valid:ordered.length===tasks.length,
      ordered
    };
  }

  function validateWindow(start,end,approvedWindow,reservationExpiry){
    const issues=[];
    const startMs=new Date(start).getTime();
    const endMs=new Date(end).getTime();

    if(!(startMs<endMs)){
      issues.push("Scheduled end must be after start.");
    }

    if(
      approvedWindow?.startsAt &&
      startMs < new Date(approvedWindow.startsAt).getTime()
    ){
      issues.push("Scheduled start is before approved execution window.");
    }

    if(
      approvedWindow?.endsAt &&
      endMs > new Date(approvedWindow.endsAt).getTime()
    ){
      issues.push("Scheduled end exceeds approved execution window.");
    }

    if(
      reservationExpiry &&
      endMs > new Date(reservationExpiry).getTime()
    ){
      issues.push("Scheduled execution exceeds resource reservation expiry.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.executionScheduleValidator=
    Object.freeze({topologicalSort,validateWindow});
})(window);

/* --- approved-business-action/INFINICUS-ABA-16-Execution-Scheduling-Action-Queue-Engine/src/storage/schedule-store.js --- */
(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_EXECUTION_SCHEDULE";
  let dbPromise;
  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const [name,keyPath] of [
          ["policies","executionSchedulePolicyId"],
          ["schedules","executionScheduleId"],
          ["queue","actionQueueItemId"],
          ["events","scheduleEventId"],
          ["adapter_handoffs","executionAdapterHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});
            if(name==="queue"){
              store.createIndex("executionScheduleId","executionScheduleId",{unique:false});
              store.createIndex("state","state",{unique:false});
            }
          }
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule storage failed."
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
            "ABA_SCHEDULE_RECORD_NOT_FOUND",
            "Schedule record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).index(indexName).getAll(value)
      );
      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule listing failed."
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
        "ABA_SCHEDULE_STORAGE_ERROR",
        error?.message || "Schedule listing failed."
      );
    }
  }

  global.INFINICUS.ABA.executionScheduleStore=
    Object.freeze({open,put,get,listByIndex,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-16-Execution-Scheduling-Action-Queue-Engine/src/engine/execution-scheduling-queue-engine.js --- */
(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.executionSchedulePolicyModel.create(input);
    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionScheduleStore.put(
      "policies",
      built.data
    );
  }

  async function createSchedule({
    executionScheduleHandoffId,
    executionSchedulePolicyId,
    tasks=[],
    approvedWindow={}
  }={}){
    const handoff=
      await global.INFINICUS.ABA.resourceReservationAvailabilityEngine
        .getExecutionScheduleHandoff({executionScheduleHandoffId});
    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.ABA.executionScheduleStore.get(
        "policies",
        executionSchedulePolicyId
      );
    if(!policy.ok) return policy;

    const ordering=
      global.INFINICUS.ABA.executionScheduleValidator.topologicalSort(tasks);

    if(!ordering.valid){
      return runtime.failure(
        "ABA_EXECUTION_SCHEDULE_INVALID",
        "Task dependency graph is invalid."
      );
    }

    const reservationExpiry=
      handoff.data.reservations
        .map(item=>item.expiresAt)
        .filter(Boolean)
        .sort()[0] || null;

    let cursor=
      approvedWindow.startsAt
        ? new Date(approvedWindow.startsAt).getTime()
        : Date.now();

    const scheduledTasks=[];

    for(const task of ordering.ordered){
      const startsAt=new Date(cursor).toISOString();
      const endsAt=new Date(
        cursor + Number(task.durationMinutes || 60)*60000
      ).toISOString();

      const validity=
        global.INFINICUS.ABA.executionScheduleValidator.validateWindow(
          startsAt,
          endsAt,
          approvedWindow,
          reservationExpiry
        );

      if(!validity.valid){
        return runtime.failure(
          "ABA_EXECUTION_WINDOW_INVALID",
          "Task cannot be scheduled inside approved boundaries.",
          {
            executionTaskId:task.executionTaskId,
            issues:validity.issues
          }
        );
      }

      scheduledTasks.push({
        ...runtime.clone(task),
        scheduledStartAt:startsAt,
        scheduledEndAt:endsAt
      });

      cursor=new Date(endsAt).getTime();
    }

    const schedule={
      executionScheduleId:runtime.createId("aba_execution_schedule"),
      executionScheduleHandoffId,
      executionPlanId:handoff.data.executionPlanId,
      executionSchedulePolicyId,
      approvedWindow:runtime.clone(approvedWindow),
      reservationExpiry,
      defaultPriority:policy.data.defaultPriority,
      retryLimit:policy.data.retryLimit,
      retryBackoffSeconds:policy.data.retryBackoffSeconds,
      leaseSeconds:policy.data.leaseSeconds,
      state:"active",
      correlationId:handoff.data.correlationId || null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "schedules",
      schedule
    );

    const queueItems=[];

    for(const task of scheduledTasks){
      const assignment=handoff.data.assignments.find(item =>
        item.executionTaskId===task.executionTaskId &&
        item.assignmentType==="primary"
      );

      const reservationIds=handoff.data.reservations
        .filter(item =>
          !item.executionTaskId ||
          item.executionTaskId===task.executionTaskId
        )
        .map(item=>item.resourceReservationId);

      const built=
        global.INFINICUS.ABA.actionQueueItemModel.create({
          schedule,
          task,
          assignment,
          reservationIds
        });

      if(!built.ok) return built;

      await global.INFINICUS.ABA.executionScheduleStore.put(
        "queue",
        built.data
      );

      queueItems.push(built.data);
    }

    const adapterHandoff={
      executionAdapterHandoffId:
        runtime.createId("aba_execution_adapter_handoff"),
      targetBlock:"ABA-17",
      executionScheduleId:schedule.executionScheduleId,
      executionPlanId:schedule.executionPlanId,
      queueItems:queueItems.map(runtime.clone),
      assignments:handoff.data.assignments.map(runtime.clone),
      reservations:handoff.data.reservations.map(runtime.clone),
      retryPolicy:{
        retryLimit:schedule.retryLimit,
        retryBackoffSeconds:schedule.retryBackoffSeconds
      },
      leaseSeconds:schedule.leaseSeconds,
      correlationId:schedule.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "adapter_handoffs",
      adapterHandoff
    );

    await runtime.emit("aba.execution_schedule.created",{
      executionSchedule:schedule,
      queueItemCount:queueItems.length,
      executionAdapterHandoffId:
        adapterHandoff.executionAdapterHandoffId
    });

    return runtime.success({
      executionSchedule:schedule,
      queueItems,
      executionAdapterHandoff:adapterHandoff
    });
  }

  async function updateScheduleState({
    executionScheduleId,
    state,
    reason
  }={}){
    const allowed=["paused","active","cancelled"];
    if(!allowed.includes(state)){
      return runtime.failure(
        "ABA_SCHEDULE_STATE_INVALID",
        "Schedule state must be paused, active, or cancelled."
      );
    }

    const schedule=
      await global.INFINICUS.ABA.executionScheduleStore.get(
        "schedules",
        executionScheduleId
      );
    if(!schedule.ok) return schedule;

    const updated={
      ...runtime.clone(schedule.data),
      state,
      stateReason:reason || null,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "schedules",
      updated
    );

    await runtime.emit(`aba.execution_schedule.${state}`,updated);

    return runtime.success({executionSchedule:updated});
  }

  async function leaseNext({
    workerId,
    now=new Date().toISOString()
  }={}){
    const queued=
      await global.INFINICUS.ABA.executionScheduleStore.listByIndex(
        "queue",
        "state",
        "queued"
      );

    if(!queued.ok) return queued;

    const eligible=queued.data
      .filter(item =>
        new Date(item.scheduledStartAt).getTime() <=
        new Date(now).getTime()
      )
      .sort((a,b) =>
        b.priority-a.priority ||
        new Date(a.scheduledStartAt)-new Date(b.scheduledStartAt)
      )[0];

    if(!eligible){
      return runtime.failure(
        "ABA_QUEUE_EMPTY",
        "No execution queue item is currently due."
      );
    }

    const schedule=
      await global.INFINICUS.ABA.executionScheduleStore.get(
        "schedules",
        eligible.executionScheduleId
      );
    if(!schedule.ok) return schedule;

    if(schedule.data.state!=="active"){
      return runtime.failure(
        "ABA_SCHEDULE_NOT_ACTIVE",
        "Execution schedule is not active."
      );
    }

    const leased={
      ...runtime.clone(eligible),
      state:"leased",
      leaseOwner:String(workerId || "worker"),
      leaseExpiresAt:new Date(
        Date.now()+Number(schedule.data.leaseSeconds || 300)*1000
      ).toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionScheduleStore.put(
      "queue",
      leased
    );

    return runtime.success({queueItem:leased});
  }

  const api=Object.freeze({
    registerPolicy,
    createSchedule,
    updateScheduleState,
    leaseNext,
    getExecutionSchedule:({executionScheduleId}) =>
      global.INFINICUS.ABA.executionScheduleStore.get(
        "schedules",
        executionScheduleId
      ),
    getExecutionAdapterHandoff:({executionAdapterHandoffId}) =>
      global.INFINICUS.ABA.executionScheduleStore.get(
        "adapter_handoffs",
        executionAdapterHandoffId
      ),
    listQueueItems:({executionScheduleId}) =>
      global.INFINICUS.ABA.executionScheduleStore.listByIndex(
        "queue",
        "executionScheduleId",
        executionScheduleId
      )
  });

  runtime.registerService(
    "aba.execution_scheduling_queue",
    api,
    {block:"ABA-16"}
  );

  runtime.registerRoute("aba.execution_schedule_policy.register",registerPolicy);
  runtime.registerRoute("aba.execution_schedule.create",createSchedule);
  runtime.registerRoute("aba.execution_schedule.state",updateScheduleState);
  runtime.registerRoute("aba.execution_queue.lease_next",leaseNext);

  runtime.registerBlock("ABA-16",{
    name:"Execution Scheduling and Action Queue Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionSchedulingQueueEngine=api;
})(window);

/* ===== INFINICUS-ABA-17-Execution-Adapter-Connector-Registry ===== */

/* --- approved-business-action/INFINICUS-ABA-17-Execution-Adapter-Connector-Registry/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-17.");
  }

  if(!ABA?.executionSchedulingQueueEngine){
    throw new Error("ABA-16 must be loaded before ABA-17.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-17-Execution-Adapter-Connector-Registry/src/model/adapter.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.adapterType){
      return runtime.failure(
        "ABA_EXECUTION_ADAPTER_INVALID",
        "Adapter name, code, and adapterType are required."
      );
    }

    return runtime.success({
      executionAdapterId:
        input.executionAdapterId ||
        runtime.createId("aba_execution_adapter"),
      name:
        String(input.name),
      code:
        String(input.code),
      adapterType:
        String(input.adapterType),
      supportedActionTypeIds:
        runtime.clone(input.supportedActionTypeIds || []),
      supportedTaskCodes:
        runtime.clone(input.supportedTaskCodes || []),
      capabilityCodes:
        runtime.clone(input.capabilityCodes || []),
      supportedRegions:
        runtime.clone(input.supportedRegions || []),
      supportedEnvironments:
        runtime.clone(
          input.supportedEnvironments ||
          ["production","sandbox"]
        ),
      requiresIdempotencyKey:
        input.requiresIdempotencyKey !== false,
      requiresDryRun:
        input.requiresDryRun !== false,
      status:
        String(input.status || "active"),
      healthStatus:
        String(input.healthStatus || "unknown"),
      priority:
        Number(input.priority || 0),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionAdapterModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-17-Execution-Adapter-Connector-Registry/src/model/connector.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(
      !input.name ||
      !input.code ||
      !input.executionAdapterId
    ){
      return runtime.failure(
        "ABA_CONNECTOR_INVALID",
        "Connector name, code, and executionAdapterId are required."
      );
    }

    return runtime.success({
      connectorId:
        input.connectorId ||
        runtime.createId("aba_connector"),
      executionAdapterId:
        String(input.executionAdapterId),
      name:
        String(input.name),
      code:
        String(input.code),
      endpointReference:
        input.endpointReference || null,
      credentialReference:
        input.credentialReference || null,
      authenticationType:
        String(input.authenticationType || "none"),
      region:
        input.region || null,
      environment:
        String(input.environment || "production"),
      rateLimitPerMinute:
        input.rateLimitPerMinute == null
          ? null
          : Number(input.rateLimitPerMinute),
      timeoutSeconds:
        Math.max(1,Number(input.timeoutSeconds || 30)),
      retryable:
        input.retryable !== false,
      status:
        String(input.status || "active"),
      healthStatus:
        String(input.healthStatus || "unknown"),
      lastHealthCheckAt:
        input.lastHealthCheckAt || null,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.connectorModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-17-Execution-Adapter-Connector-Registry/src/validation/adapter-selector.js --- */
(function(global){
  "use strict";

  function includesOrOpen(values,value){
    return !values.length || values.includes(value);
  }

  function evaluate({
    adapter,
    connector,
    queueItem,
    task,
    requiredCapabilities=[],
    region=null,
    environment="production"
  }){
    const issues=[];

    if(adapter.status!=="active"){
      issues.push("Execution adapter is not active.");
    }

    if(!["healthy","degraded"].includes(adapter.healthStatus)){
      issues.push("Execution adapter is not healthy.");
    }

    if(connector.status!=="active"){
      issues.push("Connector is not active.");
    }

    if(!["healthy","degraded"].includes(connector.healthStatus)){
      issues.push("Connector is not healthy.");
    }

    if(
      !includesOrOpen(
        adapter.supportedActionTypeIds,
        task.actionTypeId || queueItem.actionTypeId
      )
    ){
      issues.push("Adapter does not support this action type.");
    }

    if(
      !includesOrOpen(
        adapter.supportedTaskCodes,
        task.code
      )
    ){
      issues.push("Adapter does not support this task code.");
    }

    for(const capability of requiredCapabilities){
      if(!adapter.capabilityCodes.includes(capability)){
        issues.push(`Adapter lacks required capability: ${capability}`);
      }
    }

    if(
      region &&
      !includesOrOpen(adapter.supportedRegions,region)
    ){
      issues.push("Adapter does not support the requested region.");
    }

    if(
      !adapter.supportedEnvironments.includes(environment)
    ){
      issues.push("Adapter does not support the requested environment.");
    }

    if(connector.environment!==environment){
      issues.push("Connector environment does not match execution environment.");
    }

    if(region && connector.region && connector.region!==region){
      issues.push("Connector region does not match requested region.");
    }

    return {
      eligible:
        issues.length===0,
      issues
    };
  }

  function select(candidates){
    return candidates
      .filter(item=>item.eligible)
      .sort((left,right)=>
        right.adapter.priority-left.adapter.priority
      )[0] || null;
  }

  global.INFINICUS.ABA.executionAdapterSelector =
    Object.freeze({
      includesOrOpen,
      evaluate,
      select
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-17-Execution-Adapter-Connector-Registry/src/storage/adapter-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_EXECUTION_ADAPTERS";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["adapters","executionAdapterId"],
          ["connectors","connectorId"],
          ["health","adapterHealthRecordId"],
          ["selections","adapterSelectionId"],
          ["dry_run_handoffs","dryRunHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="connectors"){
              store.createIndex(
                "executionAdapterId",
                "executionAdapterId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    }catch(error){
      return runtime.failure(
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_ADAPTER_RECORD_NOT_FOUND",
            "Adapter record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName)
          .index(indexName)
          .getAll(value)
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter listing failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "ABA_ADAPTER_STORAGE_ERROR",
        error?.message || "Adapter listing failed."
      );
    }
  }

  global.INFINICUS.ABA.executionAdapterStore =
    Object.freeze({
      open,
      put,
      get,
      listByIndex,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-17-Execution-Adapter-Connector-Registry/src/engine/execution-adapter-connector-registry.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerAdapter(input={}){
    const built =
      global.INFINICUS.ABA.executionAdapterModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionAdapterStore.put(
      "adapters",
      built.data
    );
  }

  async function registerConnector(input={}){
    const adapter =
      await global.INFINICUS.ABA.executionAdapterStore.get(
        "adapters",
        input.executionAdapterId
      );

    if(!adapter.ok) return adapter;

    const built =
      global.INFINICUS.ABA.connectorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionAdapterStore.put(
      "connectors",
      built.data
    );
  }

  async function recordHealth({
    executionAdapterId,
    connectorId,
    healthStatus,
    details={}
  }={}){
    const record={
      adapterHealthRecordId:
        runtime.createId("aba_adapter_health"),
      executionAdapterId:
        executionAdapterId || null,
      connectorId:
        connectorId || null,
      healthStatus:
        String(healthStatus || "unknown"),
      details:
        runtime.clone(details),
      checkedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionAdapterStore.put(
      "health",
      record
    );

    return runtime.success(record);
  }

  async function prepareAdapters({
    executionAdapterHandoffId,
    taskCatalog=[],
    region=null,
    environment="production"
  }={}){
    const handoff =
      await global.INFINICUS.ABA.executionSchedulingQueueEngine
        .getExecutionAdapterHandoff({
          executionAdapterHandoffId
        });

    if(!handoff.ok) return handoff;

    const adapters =
      await global.INFINICUS.ABA.executionAdapterStore.list(
        "adapters"
      );

    if(!adapters.ok) return adapters;

    const connectors =
      await global.INFINICUS.ABA.executionAdapterStore.list(
        "connectors"
      );

    if(!connectors.ok) return connectors;

    const selections=[];

    for(const queueItem of handoff.data.queueItems){
      const task =
        taskCatalog.find(item =>
          item.executionTaskId === queueItem.executionTaskId
        ) || {};

      const candidates=[];

      for(const adapter of adapters.data){
        const adapterConnectors =
          connectors.data.filter(item =>
            item.executionAdapterId === adapter.executionAdapterId
          );

        for(const connector of adapterConnectors){
          const evaluation =
            global.INFINICUS.ABA.executionAdapterSelector.evaluate({
              adapter,
              connector,
              queueItem,
              task,
              requiredCapabilities:
                task.requiredCapabilities || [],
              region,
              environment
            });

          candidates.push({
            adapter,
            connector,
            ...evaluation
          });
        }
      }

      const selected =
        global.INFINICUS.ABA.executionAdapterSelector.select(
          candidates
        );

      if(!selected){
        return runtime.failure(
          "ABA_EXECUTION_ADAPTER_NOT_FOUND",
          "No eligible execution adapter and connector were found.",
          {
            executionTaskId:
              queueItem.executionTaskId,
            candidateIssues:
              candidates.map(item=>({
                executionAdapterId:
                  item.adapter.executionAdapterId,
                connectorId:
                  item.connector.connectorId,
                issues:
                  item.issues
              }))
          }
        );
      }

      const idempotencyKey =
        selected.adapter.requiresIdempotencyKey
          ? runtime.createId("aba_idempotency")
          : null;

      const invocationEnvelope={
        executionInvocationEnvelopeId:
          runtime.createId("aba_execution_invocation"),
        executionScheduleId:
          handoff.data.executionScheduleId,
        executionPlanId:
          handoff.data.executionPlanId,
        actionQueueItemId:
          queueItem.actionQueueItemId,
        executionTaskId:
          queueItem.executionTaskId,
        executionAdapterId:
          selected.adapter.executionAdapterId,
        connectorId:
          selected.connector.connectorId,
        adapterCode:
          selected.adapter.code,
        connectorCode:
          selected.connector.code,
        endpointReference:
          selected.connector.endpointReference,
        credentialReference:
          selected.connector.credentialReference,
        authenticationType:
          selected.connector.authenticationType,
        payload:
          runtime.clone(task.payload || task.inputs || {}),
        assignedActorId:
          queueItem.assignedActorId,
        reservationIds:
          queueItem.reservationIds.map(runtime.clone),
        idempotencyKey,
        timeoutSeconds:
          selected.connector.timeoutSeconds,
        retryable:
          selected.connector.retryable,
        dryRunRequired:
          selected.adapter.requiresDryRun,
        environment,
        region,
        correlationId:
          queueItem.correlationId,
        status:
          "prepared",
        createdAt:
          new Date().toISOString()
      };

      const selectionRecord={
        adapterSelectionId:
          runtime.createId("aba_adapter_selection"),
        executionInvocationEnvelopeId:
          invocationEnvelope.executionInvocationEnvelopeId,
        actionQueueItemId:
          queueItem.actionQueueItemId,
        executionAdapterId:
          selected.adapter.executionAdapterId,
        connectorId:
          selected.connector.connectorId,
        evaluation:{
          eligible:true,
          issues:[]
        },
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.executionAdapterStore.put(
        "selections",
        selectionRecord
      );

      selections.push({
        selection:
          selectionRecord,
        invocationEnvelope
      });
    }

    const dryRunHandoff={
      dryRunHandoffId:
        runtime.createId("aba_dry_run_handoff"),
      targetBlock:
        "ABA-18",
      executionScheduleId:
        handoff.data.executionScheduleId,
      executionPlanId:
        handoff.data.executionPlanId,
      invocationEnvelopes:
        selections.map(item =>
          runtime.clone(item.invocationEnvelope)
        ),
      retryPolicy:
        runtime.clone(handoff.data.retryPolicy),
      leaseSeconds:
        handoff.data.leaseSeconds,
      correlationId:
        handoff.data.correlationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionAdapterStore.put(
      "dry_run_handoffs",
      dryRunHandoff
    );

    await runtime.emit(
      "aba.execution_adapters.prepared",
      {
        executionScheduleId:
          handoff.data.executionScheduleId,
        invocationCount:
          selections.length,
        dryRunHandoffId:
          dryRunHandoff.dryRunHandoffId
      }
    );

    return runtime.success({
      selections,
      dryRunHandoff
    });
  }

  const api = Object.freeze({
    registerAdapter,
    registerConnector,
    recordHealth,
    prepareAdapters,
    getAdapter:({executionAdapterId}) =>
      global.INFINICUS.ABA.executionAdapterStore.get(
        "adapters",
        executionAdapterId
      ),
    getDryRunHandoff:({dryRunHandoffId}) =>
      global.INFINICUS.ABA.executionAdapterStore.get(
        "dry_run_handoffs",
        dryRunHandoffId
      ),
    listConnectors:() =>
      global.INFINICUS.ABA.executionAdapterStore.list(
        "connectors"
      )
  });

  runtime.registerService(
    "aba.execution_adapter_connector_registry",
    api,
    {block:"ABA-17"}
  );

  runtime.registerRoute(
    "aba.execution_adapter.register",
    registerAdapter
  );

  runtime.registerRoute(
    "aba.connector.register",
    registerConnector
  );

  runtime.registerRoute(
    "aba.execution_adapter.health",
    recordHealth
  );

  runtime.registerRoute(
    "aba.execution_adapters.prepare",
    prepareAdapters
  );

  runtime.registerBlock("ABA-17",{
    name:"Execution Adapter and Connector Registry",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionAdapterConnectorRegistry =
    api;
})(window);

/* ===== INFINICUS-ABA-18-Pre-Execution-Simulation-Dry-Run-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-18-Pre-Execution-Simulation-Dry-Run-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-18.");
  }

  if(!ABA?.executionAdapterConnectorRegistry){
    throw new Error("ABA-17 must be loaded before ABA-18.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-18-Pre-Execution-Simulation-Dry-Run-Engine/src/model/dry-run-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_DRY_RUN_POLICY_INVALID",
        "Dry-run policy name and code are required."
      );
    }

    return runtime.success({
      dryRunPolicyId:
        input.dryRunPolicyId ||
        runtime.createId("aba_dry_run_policy"),
      name:
        String(input.name),
      code:
        String(input.code),
      allowedEnvironments:
        runtime.clone(
          input.allowedEnvironments ||
          ["sandbox","validation"]
        ),
      requireIdempotencyKey:
        input.requireIdempotencyKey !== false,
      prohibitSideEffects:
        input.prohibitSideEffects !== false,
      maximumTimeoutSeconds:
        Math.max(1,Number(input.maximumTimeoutSeconds || 30)),
      maximumRetryLimit:
        Math.max(0,Number(input.maximumRetryLimit || 3)),
      requiredResponseFields:
        runtime.clone(input.requiredResponseFields || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.dryRunPolicyModel =
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-18-Pre-Execution-Simulation-Dry-Run-Engine/src/validation/dry-run-validator.js --- */
(function(global){
  "use strict";

  function getByPath(object,path){
    return path
      .split(".")
      .reduce(
        (value,key) =>
          value == null ? undefined : value[key],
        object
      );
  }

  function validateEnvelope(envelope,policy){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Dry-run policy is not active.");
    }

    if(
      !policy.allowedEnvironments.includes(
        envelope.environment
      )
    ){
      issues.push("Execution environment is not allowed for dry run.");
    }

    if(
      policy.requireIdempotencyKey &&
      !envelope.idempotencyKey
    ){
      issues.push("Idempotency key is required.");
    }

    if(
      policy.prohibitSideEffects &&
      envelope.allowSideEffects===true
    ){
      issues.push("Side effects are prohibited during dry run.");
    }

    if(
      Number(envelope.timeoutSeconds || 0) >
      policy.maximumTimeoutSeconds
    ){
      issues.push("Invocation timeout exceeds dry-run policy.");
    }

    if(!envelope.executionAdapterId || !envelope.connectorId){
      issues.push("Adapter and connector references are required.");
    }

    if(
      !envelope.credentialReference &&
      envelope.authenticationType !== "none"
    ){
      issues.push("Credential reference is required for authenticated connector.");
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  function validateResponse(response,policy){
    const issues=[];

    for(const path of policy.requiredResponseFields){
      if(getByPath(response,path)===undefined){
        issues.push(`Required response field is missing: ${path}`);
      }
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.dryRunValidator =
    Object.freeze({
      getByPath,
      validateEnvelope,
      validateResponse
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-18-Pre-Execution-Simulation-Dry-Run-Engine/src/storage/dry-run-store.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const DB_NAME = "INFINICUS_ABA_DRY_RUN";
  let dbPromise;

  const reqp = req => new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["policies","dryRunPolicyId"],
          ["runs","dryRunId"],
          ["results","dryRunResultId"],
          ["failures","dryRunFailureId"],
          ["execution_handoffs","controlledExecutionHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="results"){
              store.createIndex(
                "dryRunId",
                "dryRunId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });

    return dbPromise;
  }

  async function put(storeName,record){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readwrite");
      await reqp(
        tx.objectStore(storeName)
          .put(structuredClone(record))
      );

      return runtime.success(
        structuredClone(record)
      );
    }catch(error){
      return runtime.failure(
        "ABA_DRY_RUN_STORAGE_ERROR",
        error?.message || "Dry-run storage failed."
      );
    }
  }

  async function get(storeName,id){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const value=await reqp(
        tx.objectStore(storeName).get(id)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_DRY_RUN_RECORD_NOT_FOUND",
            "Dry-run record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_DRY_RUN_STORAGE_ERROR",
        error?.message || "Dry-run retrieval failed."
      );
    }
  }

  async function list(storeName){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName).getAll()
      );

      return runtime.success(
        values.map(structuredClone)
      );
    }catch(error){
      return runtime.failure(
        "ABA_DRY_RUN_STORAGE_ERROR",
        error?.message || "Dry-run listing failed."
      );
    }
  }

  global.INFINICUS.ABA.dryRunStore =
    Object.freeze({
      open,
      put,
      get,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-18-Pre-Execution-Simulation-Dry-Run-Engine/src/engine/pre-execution-dry-run-engine.js --- */
(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;
  const mockRunners = new Map();

  async function registerPolicy(input={}){
    const built =
      global.INFINICUS.ABA.dryRunPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.dryRunStore.put(
      "policies",
      built.data
    );
  }

  function registerMockRunner(adapterCode,runner){
    if(!adapterCode || typeof runner!=="function"){
      return runtime.failure(
        "ABA_MOCK_RUNNER_INVALID",
        "Adapter code and mock runner function are required."
      );
    }

    mockRunners.set(adapterCode,runner);

    return runtime.success({
      adapterCode
    });
  }

  async function runDryRun({
    dryRunHandoffId,
    dryRunPolicyId
  }={}){
    const handoff =
      await global.INFINICUS.ABA.executionAdapterConnectorRegistry
        .getDryRunHandoff({
          dryRunHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy =
      await global.INFINICUS.ABA.dryRunStore.get(
        "policies",
        dryRunPolicyId
      );

    if(!policy.ok) return policy;

    const dryRun={
      dryRunId:
        runtime.createId("aba_dry_run"),
      dryRunHandoffId,
      dryRunPolicyId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      executionPlanId:
        handoff.data.executionPlanId,
      state:
        "running",
      correlationId:
        handoff.data.correlationId,
      startedAt:
        new Date().toISOString(),
      completedAt:
        null
    };

    await global.INFINICUS.ABA.dryRunStore.put(
      "runs",
      dryRun
    );

    const results=[];

    for(const envelope of handoff.data.invocationEnvelopes){
      const envelopeValidation =
        global.INFINICUS.ABA.dryRunValidator
          .validateEnvelope(
            envelope,
            policy.data
          );

      if(!envelopeValidation.valid){
        const failure={
          dryRunFailureId:
            runtime.createId("aba_dry_run_failure"),
          dryRunId:
            dryRun.dryRunId,
          executionInvocationEnvelopeId:
            envelope.executionInvocationEnvelopeId,
          actionQueueItemId:
            envelope.actionQueueItemId,
          issues:
            envelopeValidation.issues,
          correlationId:
            envelope.correlationId,
          createdAt:
            new Date().toISOString()
        };

        await global.INFINICUS.ABA.dryRunStore.put(
          "failures",
          failure
        );

        return runtime.failure(
          "ABA_DRY_RUN_ENVELOPE_INVALID",
          "Execution envelope failed dry-run validation.",
          failure
        );
      }

      const runner =
        mockRunners.get(envelope.adapterCode);

      if(!runner){
        return runtime.failure(
          "ABA_DRY_RUNNER_NOT_FOUND",
          `No mock runner registered for adapter: ${envelope.adapterCode}`
        );
      }

      let mockResponse;

      try{
        mockResponse =
          await runner(
            runtime.clone(envelope),
            {
              dryRun:true,
              allowSideEffects:false
            }
          );
      }catch(error){
        const failure={
          dryRunFailureId:
            runtime.createId("aba_dry_run_failure"),
          dryRunId:
            dryRun.dryRunId,
          executionInvocationEnvelopeId:
            envelope.executionInvocationEnvelopeId,
          actionQueueItemId:
            envelope.actionQueueItemId,
          issues:[
            error?.message || "Mock runner failed."
          ],
          correlationId:
            envelope.correlationId,
          createdAt:
            new Date().toISOString()
        };

        await global.INFINICUS.ABA.dryRunStore.put(
          "failures",
          failure
        );

        return runtime.failure(
          "ABA_DRY_RUN_EXECUTION_FAILED",
          "Mock execution failed.",
          failure
        );
      }

      const responseValidation =
        global.INFINICUS.ABA.dryRunValidator
          .validateResponse(
            mockResponse,
            policy.data
          );

      if(!responseValidation.valid){
        return runtime.failure(
          "ABA_DRY_RUN_RESPONSE_INVALID",
          "Mock response failed validation.",
          {
            executionInvocationEnvelopeId:
              envelope.executionInvocationEnvelopeId,
            issues:
              responseValidation.issues
          }
        );
      }

      const result={
        dryRunResultId:
          runtime.createId("aba_dry_run_result"),
        dryRunId:
          dryRun.dryRunId,
        executionInvocationEnvelopeId:
          envelope.executionInvocationEnvelopeId,
        actionQueueItemId:
          envelope.actionQueueItemId,
        executionAdapterId:
          envelope.executionAdapterId,
        connectorId:
          envelope.connectorId,
        idempotencyKey:
          envelope.idempotencyKey,
        mockRequest:
          runtime.clone(envelope.payload),
        mockResponse:
          runtime.clone(mockResponse),
        sideEffectsProduced:
          false,
        passed:
          true,
        correlationId:
          envelope.correlationId,
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.dryRunStore.put(
        "results",
        result
      );

      results.push(result);
    }

    const completedRun={
      ...runtime.clone(dryRun),
      state:
        "passed",
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.dryRunStore.put(
      "runs",
      completedRun
    );

    const executionHandoff={
      controlledExecutionHandoffId:
        runtime.createId("aba_controlled_execution_handoff"),
      targetBlock:
        "ABA-19",
      dryRunId:
        completedRun.dryRunId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      executionPlanId:
        handoff.data.executionPlanId,
      invocationEnvelopes:
        handoff.data.invocationEnvelopes.map(runtime.clone),
      dryRunResults:
        results.map(runtime.clone),
      retryPolicy:
        runtime.clone(handoff.data.retryPolicy),
      leaseSeconds:
        handoff.data.leaseSeconds,
      correlationId:
        handoff.data.correlationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.dryRunStore.put(
      "execution_handoffs",
      executionHandoff
    );

    await runtime.emit(
      "aba.dry_run.passed",
      {
        dryRun:completedRun,
        resultCount:results.length,
        controlledExecutionHandoffId:
          executionHandoff.controlledExecutionHandoffId
      }
    );

    return runtime.success({
      dryRun:completedRun,
      results,
      controlledExecutionHandoff:executionHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    registerMockRunner,
    runDryRun,
    getDryRun:({dryRunId}) =>
      global.INFINICUS.ABA.dryRunStore.get(
        "runs",
        dryRunId
      ),
    getControlledExecutionHandoff:({
      controlledExecutionHandoffId
    }) =>
      global.INFINICUS.ABA.dryRunStore.get(
        "execution_handoffs",
        controlledExecutionHandoffId
      ),
    listFailures:() =>
      global.INFINICUS.ABA.dryRunStore.list(
        "failures"
      )
  });

  runtime.registerService(
    "aba.pre_execution_dry_run",
    api,
    {block:"ABA-18"}
  );

  runtime.registerRoute(
    "aba.dry_run_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.dry_run.execute",
    runDryRun
  );

  runtime.registerBlock("ABA-18",{
    name:"Pre-Execution Simulation and Dry-Run Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.preExecutionDryRunEngine =
    api;
})(window);

/* ===== INFINICUS-ABA-19-Controlled-Action-Execution-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-19-Controlled-Action-Execution-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-19.");
  if(!ABA?.preExecutionDryRunEngine){
    throw new Error("ABA-18 must be loaded before ABA-19.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-19-Controlled-Action-Execution-Engine/src/model/execution-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_EXECUTION_POLICY_INVALID",
        "Execution policy name and code are required."
      );
    }

    return runtime.success({
      controlledExecutionPolicyId:
        input.controlledExecutionPolicyId ||
        runtime.createId("aba_controlled_execution_policy"),
      name:String(input.name),
      code:String(input.code),
      requireDryRun:input.requireDryRun !== false,
      requireIdempotencyKey:input.requireIdempotencyKey !== false,
      requireQueueLease:input.requireQueueLease !== false,
      maximumAttempts:Math.max(1,Number(input.maximumAttempts || 3)),
      timeoutSeconds:Math.max(1,Number(input.timeoutSeconds || 30)),
      stopOnFailure:input.stopOnFailure !== false,
      allowPartialCompletion:Boolean(input.allowPartialCompletion),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.controlledExecutionPolicyModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-19-Controlled-Action-Execution-Engine/src/security/result-checksum.js --- */
(function(global){
  "use strict";

  function stable(value){
    if(value==null || typeof value!=="object"){
      return JSON.stringify(value);
    }
    if(Array.isArray(value)){
      return `[${value.map(stable).join(",")}]`;
    }
    return `{${Object.keys(value).sort()
      .map(key=>`${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }

  function hash(value){
    const input=stable(value);
    let result=2166136261;

    for(let i=0;i<input.length;i+=1){
      result^=input.charCodeAt(i);
      result=Math.imul(result,16777619);
    }

    return `aba_exec_${(result>>>0).toString(16).padStart(8,"0")}`;
  }

  global.INFINICUS.ABA.executionResultChecksum=
    Object.freeze({stable,hash});
})(window);

/* --- approved-business-action/INFINICUS-ABA-19-Controlled-Action-Execution-Engine/src/validation/execution-validator.js --- */
(function(global){
  "use strict";

  function validateEnvelope({
    envelope,
    dryRunResult,
    policy,
    queueItem
  }){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Execution policy is not active.");
    }

    if(policy.requireDryRun && !dryRunResult?.passed){
      issues.push("Dry-run evidence is missing or unsuccessful.");
    }

    if(
      policy.requireIdempotencyKey &&
      !envelope.idempotencyKey
    ){
      issues.push("Idempotency key is required.");
    }

    if(
      policy.requireQueueLease &&
      queueItem &&
      queueItem.state!=="leased"
    ){
      issues.push("Queue item does not have an active lease.");
    }

    if(
      queueItem?.leaseExpiresAt &&
      new Date(queueItem.leaseExpiresAt).getTime() <= Date.now()
    ){
      issues.push("Queue-item lease has expired.");
    }

    if(!envelope.executionAdapterId || !envelope.connectorId){
      issues.push("Execution adapter and connector are required.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.controlledExecutionValidator=
    Object.freeze({validateEnvelope});
})(window);

/* --- approved-business-action/INFINICUS-ABA-19-Controlled-Action-Execution-Engine/src/storage/execution-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_CONTROLLED_EXECUTION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["policies","controlledExecutionPolicyId"],
          ["attempts","executionAttemptId"],
          ["results","controlledExecutionResultId"],
          ["idempotency","idempotencyRecordId"],
          ["failure_handoffs","executionFailureHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="idempotency"){
              store.createIndex(
                "idempotencyKey",
                "idempotencyKey",
                {unique:true}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Controlled-execution storage failed."
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
            "ABA_EXECUTION_RECORD_NOT_FOUND",
            "Controlled-execution record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Controlled-execution retrieval failed."
      );
    }
  }

  async function getByIdempotencyKey(idempotencyKey){
    try{
      const db=await open();
      const tx=db.transaction("idempotency","readonly");
      const value=await reqp(
        tx.objectStore("idempotency")
          .index("idempotencyKey")
          .get(idempotencyKey)
      );

      return value
        ? runtime.success(structuredClone(value))
        : runtime.failure(
            "ABA_IDEMPOTENCY_RECORD_NOT_FOUND",
            "Idempotency record was not found.",
            {idempotencyKey}
          );
    }catch(error){
      return runtime.failure(
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Idempotency retrieval failed."
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
        "ABA_EXECUTION_STORAGE_ERROR",
        error?.message || "Controlled-execution listing failed."
      );
    }
  }

  global.INFINICUS.ABA.controlledExecutionStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-19-Controlled-Action-Execution-Engine/src/engine/controlled-action-execution-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const executors=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.controlledExecutionPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.controlledExecutionStore.put(
      "policies",
      built.data
    );
  }

  function registerExecutor(adapterCode,executor){
    if(!adapterCode || typeof executor!=="function"){
      return runtime.failure(
        "ABA_EXECUTOR_INVALID",
        "Adapter code and executor function are required."
      );
    }

    executors.set(adapterCode,executor);

    return runtime.success({adapterCode});
  }

  async function execute({
    controlledExecutionHandoffId,
    controlledExecutionPolicyId,
    queueItems=[]
  }={}){
    const handoff=
      await global.INFINICUS.ABA.preExecutionDryRunEngine
        .getControlledExecutionHandoff({
          controlledExecutionHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.ABA.controlledExecutionStore.get(
        "policies",
        controlledExecutionPolicyId
      );

    if(!policy.ok) return policy;

    const results=[];
    const failures=[];

    for(const envelope of handoff.data.invocationEnvelopes){
      const dryRunResult=
        handoff.data.dryRunResults.find(item =>
          item.executionInvocationEnvelopeId ===
          envelope.executionInvocationEnvelopeId
        );

      const queueItem=
        queueItems.find(item =>
          item.actionQueueItemId === envelope.actionQueueItemId
        ) || null;

      const validation=
        global.INFINICUS.ABA.controlledExecutionValidator
          .validateEnvelope({
            envelope,
            dryRunResult,
            policy:policy.data,
            queueItem
          });

      if(!validation.valid){
        failures.push({
          envelope,
          issues:validation.issues
        });

        if(policy.data.stopOnFailure){
          break;
        }

        continue;
      }

      if(envelope.idempotencyKey){
        const existing=
          await global.INFINICUS.ABA.controlledExecutionStore
            .getByIdempotencyKey(envelope.idempotencyKey);

        if(existing.ok){
          results.push({
            ...runtime.clone(existing.data.result),
            idempotentReplay:true
          });

          continue;
        }
      }

      const executor=
        executors.get(envelope.adapterCode);

      if(!executor){
        failures.push({
          envelope,
          issues:[
            `No executor registered for adapter: ${envelope.adapterCode}`
          ]
        });

        if(policy.data.stopOnFailure){
          break;
        }

        continue;
      }

      const attempt={
        executionAttemptId:
          runtime.createId("aba_execution_attempt"),
        controlledExecutionHandoffId,
        executionInvocationEnvelopeId:
          envelope.executionInvocationEnvelopeId,
        actionQueueItemId:
          envelope.actionQueueItemId,
        executionAdapterId:
          envelope.executionAdapterId,
        connectorId:
          envelope.connectorId,
        attemptNumber:
          1,
        state:
          "running",
        correlationId:
          envelope.correlationId,
        startedAt:
          new Date().toISOString(),
        completedAt:
          null
      };

      await global.INFINICUS.ABA.controlledExecutionStore.put(
        "attempts",
        attempt
      );

      try{
        const response=
          await executor(
            runtime.clone(envelope),
            {
              allowSideEffects:true,
              timeoutSeconds:
                Math.min(
                  policy.data.timeoutSeconds,
                  envelope.timeoutSeconds || policy.data.timeoutSeconds
                )
            }
          );

        const resultBody={
          controlledExecutionResultId:
            runtime.createId("aba_controlled_execution_result"),
          executionAttemptId:
            attempt.executionAttemptId,
          controlledExecutionHandoffId,
          executionInvocationEnvelopeId:
            envelope.executionInvocationEnvelopeId,
          actionQueueItemId:
            envelope.actionQueueItemId,
          executionAdapterId:
            envelope.executionAdapterId,
          connectorId:
            envelope.connectorId,
          idempotencyKey:
            envelope.idempotencyKey,
          requestPayload:
            runtime.clone(envelope.payload),
          response:
            runtime.clone(response),
          state:
            response?.partial === true
              ? "partially_completed"
              : "completed",
          correlationId:
            envelope.correlationId,
          completedAt:
            new Date().toISOString()
        };

        resultBody.resultChecksum=
          global.INFINICUS.ABA.executionResultChecksum
            .hash(resultBody);

        await global.INFINICUS.ABA.controlledExecutionStore.put(
          "results",
          resultBody
        );

        await global.INFINICUS.ABA.controlledExecutionStore.put(
          "attempts",
          {
            ...attempt,
            state:resultBody.state,
            completedAt:resultBody.completedAt
          }
        );

        if(envelope.idempotencyKey){
          await global.INFINICUS.ABA.controlledExecutionStore.put(
            "idempotency",
            {
              idempotencyRecordId:
                runtime.createId("aba_idempotency_record"),
              idempotencyKey:
                envelope.idempotencyKey,
              result:
                runtime.clone(resultBody),
              createdAt:
                new Date().toISOString()
            }
          );
        }

        results.push(resultBody);

        if(
          resultBody.state==="partially_completed" &&
          !policy.data.allowPartialCompletion
        ){
          failures.push({
            envelope,
            issues:["Partial completion is not allowed by execution policy."],
            result:resultBody
          });

          if(policy.data.stopOnFailure){
            break;
          }
        }
      }catch(error){
        const failure={
          envelope,
          issues:[
            error?.message || "Controlled execution failed."
          ]
        };

        failures.push(failure);

        await global.INFINICUS.ABA.controlledExecutionStore.put(
          "attempts",
          {
            ...attempt,
            state:"failed",
            failureMessage:
              error?.message || "Controlled execution failed.",
            completedAt:
              new Date().toISOString()
          }
        );

        if(policy.data.stopOnFailure){
          break;
        }
      }
    }

    let failureHandoff=null;

    if(failures.length){
      failureHandoff={
        executionFailureHandoffId:
          runtime.createId("aba_execution_failure_handoff"),
        targetBlock:"ABA-20",
        controlledExecutionHandoffId,
        executionScheduleId:
          handoff.data.executionScheduleId,
        executionPlanId:
          handoff.data.executionPlanId,
        results:
          results.map(runtime.clone),
        failures:
          failures.map(runtime.clone),
        retryPolicy:
          runtime.clone(handoff.data.retryPolicy),
        correlationId:
          handoff.data.correlationId,
        status:"ready",
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.controlledExecutionStore.put(
        "failure_handoffs",
        failureHandoff
      );

      await runtime.emit(
        "aba.controlled_execution.failed",
        failureHandoff
      );
    }else{
      await runtime.emit(
        "aba.controlled_execution.completed",
        {
          controlledExecutionHandoffId,
          resultCount:results.length
        }
      );
    }

    return runtime.success({
      results,
      failures,
      executionFailureHandoff:failureHandoff,
      state:
        failures.length
          ? (
              results.length
                ? "partially_completed"
                : "failed"
            )
          : "completed"
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerExecutor,
    execute,
    getExecutionResult:({controlledExecutionResultId}) =>
      global.INFINICUS.ABA.controlledExecutionStore.get(
        "results",
        controlledExecutionResultId
      ),
    getExecutionFailureHandoff:({executionFailureHandoffId}) =>
      global.INFINICUS.ABA.controlledExecutionStore.get(
        "failure_handoffs",
        executionFailureHandoffId
      ),
    listAttempts:() =>
      global.INFINICUS.ABA.controlledExecutionStore.list(
        "attempts"
      )
  });

  runtime.registerService(
    "aba.controlled_action_execution",
    api,
    {block:"ABA-19"}
  );

  runtime.registerRoute(
    "aba.controlled_execution_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.controlled_execution.execute",
    execute
  );

  runtime.registerBlock("ABA-19",{
    name:"Controlled Action Execution Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.controlledActionExecutionEngine=
    api;
})(window);

/* ===== INFINICUS-ABA-20-Execution-Failure-Compensation-Rollback-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-20-Execution-Failure-Compensation-Rollback-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-20.");
  }

  if(!ABA?.controlledActionExecutionEngine){
    throw new Error("ABA-19 must be loaded before ABA-20.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-20-Execution-Failure-Compensation-Rollback-Engine/src/model/failure-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_FAILURE_POLICY_INVALID",
        "Failure policy name and code are required."
      );
    }

    return runtime.success({
      executionFailurePolicyId:
        input.executionFailurePolicyId ||
        runtime.createId("aba_execution_failure_policy"),
      name:String(input.name),
      code:String(input.code),
      retryableFailureCodes:
        runtime.clone(input.retryableFailureCodes || []),
      maximumRetryAttempts:
        Math.max(0,Number(input.maximumRetryAttempts || 3)),
      rollbackOnFailure:
        input.rollbackOnFailure !== false,
      compensateIrreversibleActions:
        input.compensateIrreversibleActions !== false,
      requireManualInterventionFor:
        runtime.clone(input.requireManualInterventionFor || []),
      stopOnRollbackFailure:
        input.stopOnRollbackFailure !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionFailurePolicyModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-20-Execution-Failure-Compensation-Rollback-Engine/src/model/rollback-step.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_ROLLBACK_STEP_INVALID",
        "Rollback step name and code are required."
      );
    }

    return runtime.success({
      rollbackStepId:
        input.rollbackStepId ||
        runtime.createId("aba_rollback_step"),
      name:String(input.name),
      code:String(input.code),
      targetExecutionResultId:
        input.targetExecutionResultId || null,
      order:
        Number(input.order || 1),
      rollbackType:
        String(input.rollbackType || "compensation"),
      payload:
        runtime.clone(input.payload || {}),
      reversible:
        input.reversible !== false,
      state:"planned",
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.rollbackStepModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-20-Execution-Failure-Compensation-Rollback-Engine/src/validation/failure-classifier.js --- */
(function(global){
  "use strict";

  function classify(failure,policy){
    const code=
      failure.code ||
      failure.errorCode ||
      "UNKNOWN_FAILURE";

    if(
      policy.requireManualInterventionFor.includes(code)
    ){
      return {
        category:"manual_intervention",
        retryable:false,
        rollbackRequired:false,
        compensationRequired:false
      };
    }

    if(
      policy.retryableFailureCodes.includes(code)
    ){
      return {
        category:"retryable",
        retryable:true,
        rollbackRequired:false,
        compensationRequired:false
      };
    }

    if(failure.irreversible===true){
      return {
        category:"irreversible",
        retryable:false,
        rollbackRequired:false,
        compensationRequired:
          policy.compensateIrreversibleActions
      };
    }

    return {
      category:"rollback_required",
      retryable:false,
      rollbackRequired:
        policy.rollbackOnFailure,
      compensationRequired:false
    };
  }

  global.INFINICUS.ABA.executionFailureClassifier=
    Object.freeze({classify});
})(window);

/* --- approved-business-action/INFINICUS-ABA-20-Execution-Failure-Compensation-Rollback-Engine/src/storage/rollback-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_EXECUTION_ROLLBACK";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["policies","executionFailurePolicyId"],
          ["cases","executionFailureCaseId"],
          ["plans","rollbackPlanId"],
          ["steps","rollbackStepId"],
          ["attempts","rollbackAttemptId"],
          ["evidence_handoffs","executionEvidenceHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="steps"){
              store.createIndex(
                "rollbackPlanId",
                "rollbackPlanId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_ROLLBACK_STORAGE_ERROR",
        error?.message || "Rollback storage failed."
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
            "ABA_ROLLBACK_RECORD_NOT_FOUND",
            "Rollback record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_ROLLBACK_STORAGE_ERROR",
        error?.message || "Rollback retrieval failed."
      );
    }
  }

  async function listByIndex(storeName,indexName,value){
    try{
      const db=await open();
      const tx=db.transaction(storeName,"readonly");
      const values=await reqp(
        tx.objectStore(storeName)
          .index(indexName)
          .getAll(value)
      );

      return runtime.success(values.map(structuredClone));
    }catch(error){
      return runtime.failure(
        "ABA_ROLLBACK_STORAGE_ERROR",
        error?.message || "Rollback listing failed."
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
        "ABA_ROLLBACK_STORAGE_ERROR",
        error?.message || "Rollback listing failed."
      );
    }
  }

  global.INFINICUS.ABA.executionRollbackStore=
    Object.freeze({
      open,
      put,
      get,
      listByIndex,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-20-Execution-Failure-Compensation-Rollback-Engine/src/engine/execution-failure-rollback-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const rollbackExecutors=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.executionFailurePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionRollbackStore.put(
      "policies",
      built.data
    );
  }

  function registerRollbackExecutor(code,executor){
    if(!code || typeof executor!=="function"){
      return runtime.failure(
        "ABA_ROLLBACK_EXECUTOR_INVALID",
        "Rollback code and executor function are required."
      );
    }

    rollbackExecutors.set(code,executor);

    return runtime.success({code});
  }

  async function handleFailure({
    executionFailureHandoffId,
    executionFailurePolicyId,
    rollbackSteps=[]
  }={}){
    const handoff=
      await global.INFINICUS.ABA.controlledActionExecutionEngine
        .getExecutionFailureHandoff({
          executionFailureHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.ABA.executionRollbackStore.get(
        "policies",
        executionFailurePolicyId
      );

    if(!policy.ok) return policy;

    const classified=
      handoff.data.failures.map(failure=>({
        failure:runtime.clone(failure),
        classification:
          global.INFINICUS.ABA.executionFailureClassifier
            .classify(failure,policy.data)
      }));

    const failureCase={
      executionFailureCaseId:
        runtime.createId("aba_execution_failure_case"),
      executionFailureHandoffId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      executionPlanId:
        handoff.data.executionPlanId,
      completedResults:
        handoff.data.results.map(runtime.clone),
      classifiedFailures:
        classified.map(runtime.clone),
      retryPolicy:
        runtime.clone(handoff.data.retryPolicy),
      correlationId:
        handoff.data.correlationId,
      state:"under_review",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "cases",
      failureCase
    );

    const manualRequired=
      classified.some(item =>
        item.classification.category==="manual_intervention"
      );

    if(manualRequired){
      const updated={
        ...failureCase,
        state:"manual_intervention_required",
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.ABA.executionRollbackStore.put(
        "cases",
        updated
      );

      return runtime.success({
        executionFailureCase:updated,
        rollbackPlan:null
      });
    }

    const plan={
      rollbackPlanId:
        runtime.createId("aba_rollback_plan"),
      executionFailureCaseId:
        failureCase.executionFailureCaseId,
      executionPlanId:
        failureCase.executionPlanId,
      state:"planned",
      correlationId:
        failureCase.correlationId,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "plans",
      plan
    );

    const stepRecords=[];

    for(const input of rollbackSteps){
      const built=
        global.INFINICUS.ABA.rollbackStepModel.create(input);

      if(!built.ok) return built;

      const step={
        ...built.data,
        rollbackPlanId:plan.rollbackPlanId
      };

      await global.INFINICUS.ABA.executionRollbackStore.put(
        "steps",
        step
      );

      stepRecords.push(step);
    }

    const ordered=
      [...stepRecords].sort((a,b)=>b.order-a.order);

    const attempts=[];
    let finalState="rolled_back";

    for(const step of ordered){
      if(
        step.rollbackType==="rollback" &&
        step.reversible===false
      ){
        finalState="compensation_required";
        continue;
      }

      const executor=
        rollbackExecutors.get(step.code);

      if(!executor){
        finalState="rollback_failed";

        attempts.push({
          rollbackAttemptId:
            runtime.createId("aba_rollback_attempt"),
          rollbackPlanId:
            plan.rollbackPlanId,
          rollbackStepId:
            step.rollbackStepId,
          state:"failed",
          errorMessage:
            `No rollback executor registered for: ${step.code}`,
          createdAt:
            new Date().toISOString()
        });

        if(policy.data.stopOnRollbackFailure){
          break;
        }

        continue;
      }

      try{
        const response=
          await executor(
            runtime.clone(step),
            {
              mode:step.rollbackType
            }
          );

        const attempt={
          rollbackAttemptId:
            runtime.createId("aba_rollback_attempt"),
          rollbackPlanId:
            plan.rollbackPlanId,
          rollbackStepId:
            step.rollbackStepId,
          state:"completed",
          response:
            runtime.clone(response),
          createdAt:
            new Date().toISOString()
        };

        await global.INFINICUS.ABA.executionRollbackStore.put(
          "attempts",
          attempt
        );

        attempts.push(attempt);
      }catch(error){
        finalState="rollback_failed";

        const attempt={
          rollbackAttemptId:
            runtime.createId("aba_rollback_attempt"),
          rollbackPlanId:
            plan.rollbackPlanId,
          rollbackStepId:
            step.rollbackStepId,
          state:"failed",
          errorMessage:
            error?.message || "Rollback execution failed.",
          createdAt:
            new Date().toISOString()
        };

        await global.INFINICUS.ABA.executionRollbackStore.put(
          "attempts",
          attempt
        );

        attempts.push(attempt);

        if(policy.data.stopOnRollbackFailure){
          break;
        }
      }
    }

    const completedPlan={
      ...plan,
      state:finalState,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "plans",
      completedPlan
    );

    const evidenceHandoff={
      executionEvidenceHandoffId:
        runtime.createId("aba_execution_evidence_handoff"),
      targetBlock:"ABA-21",
      executionFailureCaseId:
        failureCase.executionFailureCaseId,
      rollbackPlanId:
        completedPlan.rollbackPlanId,
      executionScheduleId:
        failureCase.executionScheduleId,
      executionPlanId:
        failureCase.executionPlanId,
      completedResults:
        failureCase.completedResults.map(runtime.clone),
      classifiedFailures:
        failureCase.classifiedFailures.map(runtime.clone),
      rollbackSteps:
        stepRecords.map(runtime.clone),
      rollbackAttempts:
        attempts.map(runtime.clone),
      finalState,
      correlationId:
        failureCase.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "evidence_handoffs",
      evidenceHandoff
    );

    await runtime.emit(
      "aba.execution_failure.handled",
      {
        executionFailureCase:failureCase,
        rollbackPlan:completedPlan,
        executionEvidenceHandoffId:
          evidenceHandoff.executionEvidenceHandoffId
      }
    );

    return runtime.success({
      executionFailureCase:failureCase,
      rollbackPlan:completedPlan,
      rollbackAttempts:attempts,
      executionEvidenceHandoff:evidenceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerRollbackExecutor,
    handleFailure,
    getFailureCase:({executionFailureCaseId}) =>
      global.INFINICUS.ABA.executionRollbackStore.get(
        "cases",
        executionFailureCaseId
      ),
    getExecutionEvidenceHandoff:({executionEvidenceHandoffId}) =>
      global.INFINICUS.ABA.executionRollbackStore.get(
        "evidence_handoffs",
        executionEvidenceHandoffId
      ),
    listRollbackAttempts:() =>
      global.INFINICUS.ABA.executionRollbackStore.list(
        "attempts"
      )
  });

  runtime.registerService(
    "aba.execution_failure_rollback",
    api,
    {block:"ABA-20"}
  );

  runtime.registerRoute(
    "aba.execution_failure_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.execution_failure.handle",
    handleFailure
  );

  runtime.registerBlock("ABA-20",{
    name:"Execution Failure, Compensation and Rollback Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionFailureRollbackEngine=
    api;
})(window);

/* ===== INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-21.");
  }

  if(!ABA?.executionFailureRollbackEngine){
    throw new Error("ABA-20 must be loaded before ABA-21.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine/src/security/evidence-checksum.js --- */
(function(global){
  "use strict";

  function stable(value){
    if(value==null || typeof value!=="object"){
      return JSON.stringify(value);
    }

    if(Array.isArray(value)){
      return `[${value.map(stable).join(",")}]`;
    }

    return `{${Object.keys(value).sort()
      .map(key=>`${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }

  function hash(value){
    const input=stable(value);
    let result=2166136261;

    for(let index=0;index<input.length;index+=1){
      result^=input.charCodeAt(index);
      result=Math.imul(result,16777619);
    }

    return `aba_evidence_${(result>>>0)
      .toString(16)
      .padStart(8,"0")}`;
  }

  global.INFINICUS.ABA.executionEvidenceChecksum=
    Object.freeze({stable,hash});
})(window);

/* --- approved-business-action/INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine/src/model/evidence-record.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.evidenceType || !input.subjectId){
      return runtime.failure(
        "ABA_EXECUTION_EVIDENCE_INVALID",
        "evidenceType and subjectId are required."
      );
    }

    return runtime.success({
      executionEvidenceId:
        input.executionEvidenceId ||
        runtime.createId("aba_execution_evidence"),
      evidenceType:
        String(input.evidenceType),
      subjectId:
        String(input.subjectId),
      actionInstanceId:
        input.actionInstanceId || null,
      executionPlanId:
        input.executionPlanId || null,
      executionScheduleId:
        input.executionScheduleId || null,
      executionTaskId:
        input.executionTaskId || null,
      payload:
        runtime.clone(input.payload || {}),
      sourceSystem:
        String(input.sourceSystem || "INFINICUS_ABA"),
      sourceReference:
        input.sourceReference || null,
      correlationId:
        input.correlationId || null,
      status:
        String(input.status || "recorded"),
      createdAt:
        input.createdAt || new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionEvidenceModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine/src/model/audit-event.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    return runtime.success({
      executionAuditEventId:
        runtime.createId("aba_execution_audit"),
      eventType:
        String(input.eventType || "execution_evidence.recorded"),
      subjectId:
        String(input.subjectId || "unknown"),
      actorId:
        input.actorId || "system",
      payload:
        runtime.clone(input.payload || {}),
      correlationId:
        input.correlationId || null,
      occurredAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionAuditEventModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine/src/validation/evidence-validator.js --- */
(function(global){
  "use strict";

  function validateHandoff(handoff){
    const issues=[];

    if(!handoff.executionEvidenceHandoffId){
      issues.push("Execution evidence handoff ID is required.");
    }

    if(!handoff.executionPlanId){
      issues.push("Execution plan ID is required.");
    }

    if(!Array.isArray(handoff.completedResults)){
      issues.push("Completed execution results must be an array.");
    }

    if(!Array.isArray(handoff.classifiedFailures)){
      issues.push("Classified failures must be an array.");
    }

    if(!Array.isArray(handoff.rollbackAttempts)){
      issues.push("Rollback attempts must be an array.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  function verify(record,expectedChecksum,checksum){
    const calculatedChecksum=checksum.hash(record);

    return {
      valid:calculatedChecksum===expectedChecksum,
      expectedChecksum,
      calculatedChecksum
    };
  }

  global.INFINICUS.ABA.executionEvidenceValidator=
    Object.freeze({validateHandoff,verify});
})(window);

/* --- approved-business-action/INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine/src/storage/evidence-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_EXECUTION_EVIDENCE";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["evidence","executionEvidenceId"],
          ["packages","executionEvidencePackageId"],
          ["audits","executionAuditEventId"],
          ["revocations","executionEvidenceRevocationId"],
          ["verification_handoffs","completionVerificationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="evidence"){
              store.createIndex(
                "executionPlanId",
                "executionPlanId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_EXECUTION_EVIDENCE_STORAGE_ERROR",
        error?.message || "Execution-evidence storage failed."
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
            "ABA_EXECUTION_EVIDENCE_RECORD_NOT_FOUND",
            "Execution-evidence record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_EXECUTION_EVIDENCE_STORAGE_ERROR",
        error?.message || "Execution-evidence retrieval failed."
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
        "ABA_EXECUTION_EVIDENCE_STORAGE_ERROR",
        error?.message || "Execution-evidence listing failed."
      );
    }
  }

  global.INFINICUS.ABA.executionEvidenceStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-21-Execution-Evidence-Audit-Trail-Engine/src/engine/execution-evidence-audit-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;

  async function buildEvidencePackage({
    executionEvidenceHandoffId,
    executionContext={}
  }={}){
    const handoff=
      await global.INFINICUS.ABA.executionFailureRollbackEngine
        .getExecutionEvidenceHandoff({
          executionEvidenceHandoffId
        });

    if(!handoff.ok) return handoff;

    const validation=
      global.INFINICUS.ABA.executionEvidenceValidator
        .validateHandoff(handoff.data);

    if(!validation.valid){
      return runtime.failure(
        "ABA_EXECUTION_EVIDENCE_HANDOFF_INVALID",
        "Execution evidence handoff failed validation.",
        validation
      );
    }

    const sourceRecords=[
      ...handoff.data.completedResults.map(item=>({
        evidenceType:"execution_result",
        subjectId:
          item.controlledExecutionResultId ||
          item.executionAttemptId ||
          runtime.createId("aba_result_subject"),
        payload:item
      })),
      ...handoff.data.classifiedFailures.map(item=>({
        evidenceType:"execution_failure",
        subjectId:
          item.failure?.executionInvocationEnvelopeId ||
          runtime.createId("aba_failure_subject"),
        payload:item
      })),
      ...handoff.data.rollbackAttempts.map(item=>({
        evidenceType:"rollback_attempt",
        subjectId:
          item.rollbackAttemptId ||
          runtime.createId("aba_rollback_subject"),
        payload:item
      }))
    ];

    const evidence=[];

    for(const source of sourceRecords){
      const built=
        global.INFINICUS.ABA.executionEvidenceModel.create({
          ...source,
          actionInstanceId:
            executionContext.actionInstanceId || null,
          executionPlanId:
            handoff.data.executionPlanId,
          executionScheduleId:
            handoff.data.executionScheduleId,
          correlationId:
            handoff.data.correlationId
        });

      if(!built.ok) return built;

      const body=runtime.clone(built.data);
      const checksum=
        global.INFINICUS.ABA.executionEvidenceChecksum
          .hash(body);

      const record={
        ...built.data,
        evidenceChecksum:checksum
      };

      await global.INFINICUS.ABA.executionEvidenceStore.put(
        "evidence",
        record
      );

      const audit=
        global.INFINICUS.ABA.executionAuditEventModel.create({
          eventType:"execution_evidence.recorded",
          subjectId:record.executionEvidenceId,
          payload:{
            evidenceType:record.evidenceType,
            evidenceChecksum:checksum
          },
          correlationId:record.correlationId
        });

      await global.INFINICUS.ABA.executionEvidenceStore.put(
        "audits",
        audit.data
      );

      evidence.push(record);
    }

    const packageBody={
      executionEvidenceHandoffId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      finalState:
        handoff.data.finalState,
      evidence
    };

    const evidencePackage={
      executionEvidencePackageId:
        runtime.createId("aba_execution_evidence_package"),
      executionEvidenceHandoffId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      actionInstanceId:
        executionContext.actionInstanceId || null,
      finalState:
        handoff.data.finalState,
      evidence:
        evidence.map(runtime.clone),
      packageChecksum:
        global.INFINICUS.ABA.executionEvidenceChecksum
          .hash(packageBody),
      correlationId:
        handoff.data.correlationId,
      status:
        "verified",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "packages",
      evidencePackage
    );

    const verificationHandoff={
      completionVerificationHandoffId:
        runtime.createId("aba_completion_verification_handoff"),
      targetBlock:"ABA-22",
      executionEvidencePackageId:
        evidencePackage.executionEvidencePackageId,
      executionPlanId:
        evidencePackage.executionPlanId,
      executionScheduleId:
        evidencePackage.executionScheduleId,
      actionInstanceId:
        evidencePackage.actionInstanceId,
      finalState:
        evidencePackage.finalState,
      evidence:
        evidencePackage.evidence.map(runtime.clone),
      packageChecksum:
        evidencePackage.packageChecksum,
      expectedOutcomes:
        runtime.clone(executionContext.expectedOutcomes || []),
      completionCriteria:
        runtime.clone(executionContext.completionCriteria || []),
      verificationCriteria:
        runtime.clone(executionContext.verificationCriteria || []),
      correlationId:
        evidencePackage.correlationId,
      lineage:
        runtime.clone(executionContext.lineage || []),
      confidence:
        Number(executionContext.confidence ?? 0),
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "verification_handoffs",
      verificationHandoff
    );

    await runtime.emit(
      "aba.execution_evidence.package_created",
      {
        executionEvidencePackage:evidencePackage,
        completionVerificationHandoffId:
          verificationHandoff.completionVerificationHandoffId
      }
    );

    return runtime.success({
      executionEvidencePackage:evidencePackage,
      completionVerificationHandoff:verificationHandoff
    });
  }

  async function verifyEvidence({
    executionEvidenceId
  }={}){
    const evidence=
      await global.INFINICUS.ABA.executionEvidenceStore.get(
        "evidence",
        executionEvidenceId
      );

    if(!evidence.ok) return evidence;

    const body=runtime.clone(evidence.data);
    const expected=body.evidenceChecksum;
    delete body.evidenceChecksum;

    const result=
      global.INFINICUS.ABA.executionEvidenceValidator.verify(
        body,
        expected,
        global.INFINICUS.ABA.executionEvidenceChecksum
      );

    const audit=
      global.INFINICUS.ABA.executionAuditEventModel.create({
        eventType:"execution_evidence.verified",
        subjectId:executionEvidenceId,
        payload:result,
        correlationId:evidence.data.correlationId
      });

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "audits",
      audit.data
    );

    return runtime.success(result);
  }

  async function revokePackage({
    executionEvidencePackageId,
    revokedBy,
    reason
  }={}){
    const pkg=
      await global.INFINICUS.ABA.executionEvidenceStore.get(
        "packages",
        executionEvidencePackageId
      );

    if(!pkg.ok) return pkg;

    const revocation={
      executionEvidenceRevocationId:
        runtime.createId("aba_execution_evidence_revocation"),
      executionEvidencePackageId,
      revokedBy:String(revokedBy || "unknown"),
      reason:String(reason || "Execution evidence package revoked."),
      correlationId:pkg.data.correlationId,
      createdAt:new Date().toISOString()
    };

    const updated={
      ...runtime.clone(pkg.data),
      status:"revoked",
      revokedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "packages",
      updated
    );

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "revocations",
      revocation
    );

    await runtime.emit(
      "aba.execution_evidence.revoked",
      revocation
    );

    return runtime.success({
      executionEvidencePackage:updated,
      revocation
    });
  }

  const api=Object.freeze({
    buildEvidencePackage,
    verifyEvidence,
    revokePackage,
    getEvidencePackage:({executionEvidencePackageId}) =>
      global.INFINICUS.ABA.executionEvidenceStore.get(
        "packages",
        executionEvidencePackageId
      ),
    getCompletionVerificationHandoff:({
      completionVerificationHandoffId
    }) =>
      global.INFINICUS.ABA.executionEvidenceStore.get(
        "verification_handoffs",
        completionVerificationHandoffId
      ),
    listAuditEvents:() =>
      global.INFINICUS.ABA.executionEvidenceStore.list(
        "audits"
      )
  });

  runtime.registerService(
    "aba.execution_evidence_audit",
    api,
    {block:"ABA-21"}
  );

  runtime.registerRoute(
    "aba.execution_evidence.build",
    buildEvidencePackage
  );

  runtime.registerRoute(
    "aba.execution_evidence.verify",
    verifyEvidence
  );

  runtime.registerRoute(
    "aba.execution_evidence.revoke",
    revokePackage
  );

  runtime.registerBlock("ABA-21",{
    name:"Execution Evidence and Audit Trail Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionEvidenceAuditEngine=
    api;
})(window);

/* ===== INFINICUS-ABA-22-Action-Completion-Verification-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-22-Action-Completion-Verification-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-22.");
  }

  if(!ABA?.executionEvidenceAuditEngine){
    throw new Error("ABA-21 must be loaded before ABA-22.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-22-Action-Completion-Verification-Engine/src/model/completion-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_COMPLETION_POLICY_INVALID",
        "Completion policy name and code are required."
      );
    }

    return runtime.success({
      actionCompletionPolicyId:
        input.actionCompletionPolicyId ||
        runtime.createId("aba_action_completion_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumEvidenceCount:
        Math.max(1,Number(input.minimumEvidenceCount || 1)),
      requireAllCompletionCriteria:
        input.requireAllCompletionCriteria !== false,
      requireAllVerificationCriteria:
        input.requireAllVerificationCriteria !== false,
      allowManualVerification:
        input.allowManualVerification !== false,
      allowPartialCompletion:
        Boolean(input.allowPartialCompletion),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionCompletionPolicyModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-22-Action-Completion-Verification-Engine/src/validation/completion-evaluator.js --- */
(function(global){
  "use strict";

  function getByPath(object,path){
    return path
      .split(".")
      .reduce(
        (value,key) =>
          value == null ? undefined : value[key],
        object
      );
  }

  function evaluateCriterion(criterion,context){
    const actual=
      getByPath(context,criterion.path || "");

    const expected=
      criterion.expectedValue;

    let passed=false;

    if(criterion.operator==="exists"){
      passed=actual!==undefined && actual!==null;
    }else if(criterion.operator==="equals"){
      passed=actual===expected;
    }else if(criterion.operator==="gte"){
      passed=Number(actual)>=Number(expected);
    }else if(criterion.operator==="lte"){
      passed=Number(actual)<=Number(expected);
    }else if(criterion.operator==="includes"){
      passed=Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual || "").includes(String(expected));
    }

    return {
      criterionId:
        criterion.criterionId || null,
      name:
        criterion.name || criterion.path,
      passed,
      actual,
      expected,
      operator:
        criterion.operator
    };
  }

  function evaluate({
    evidencePackage,
    completionCriteria,
    verificationCriteria,
    policy,
    manualVerification
  }){
    const evidenceCount=
      evidencePackage.evidence?.length || 0;

    const completionResults=
      completionCriteria.map(item=>
        evaluateCriterion(item,evidencePackage)
      );

    const verificationResults=
      verificationCriteria.map(item=>
        evaluateCriterion(item,evidencePackage)
      );

    const evidenceSufficient=
      evidenceCount>=policy.minimumEvidenceCount;

    const completionPassed=
      policy.requireAllCompletionCriteria
        ? completionResults.every(item=>item.passed)
        : completionResults.some(item=>item.passed);

    const verificationPassed=
      policy.requireAllVerificationCriteria
        ? verificationResults.every(item=>item.passed)
        : verificationResults.some(item=>item.passed);

    const manualPassed=
      policy.allowManualVerification &&
      manualVerification?.approved===true;

    let state="unverifiable";

    if(
      evidencePackage.finalState==="rolled_back" ||
      evidencePackage.finalState==="rollback_failed"
    ){
      state="rolled_back";
    }else if(
      evidenceSufficient &&
      completionPassed &&
      (verificationPassed || manualPassed)
    ){
      state="verified";
    }else if(
      policy.allowPartialCompletion &&
      evidenceSufficient &&
      completionResults.some(item=>item.passed)
    ){
      state="partially_completed";
    }else if(
      evidencePackage.finalState==="failed"
    ){
      state="failed";
    }

    return {
      state,
      evidenceSufficient,
      completionResults,
      verificationResults,
      manualVerification:
        manualVerification || null
    };
  }

  global.INFINICUS.ABA.actionCompletionEvaluator=
    Object.freeze({
      getByPath,
      evaluateCriterion,
      evaluate
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-22-Action-Completion-Verification-Engine/src/storage/completion-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_ACTION_COMPLETION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["policies","actionCompletionPolicyId"],
          ["verifications","actionCompletionVerificationId"],
          ["certificates","actionCompletionCertificateId"],
          ["exceptions","completionVerificationExceptionId"],
          ["outcome_handoffs","outcomeMonitoringHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath});
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_COMPLETION_STORAGE_ERROR",
        error?.message || "Completion-verification storage failed."
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
            "ABA_COMPLETION_RECORD_NOT_FOUND",
            "Completion-verification record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_COMPLETION_STORAGE_ERROR",
        error?.message || "Completion-verification retrieval failed."
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
        "ABA_COMPLETION_STORAGE_ERROR",
        error?.message || "Completion-verification listing failed."
      );
    }
  }

  global.INFINICUS.ABA.actionCompletionStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-22-Action-Completion-Verification-Engine/src/engine/action-completion-verification-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.actionCompletionPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionCompletionStore.put(
      "policies",
      built.data
    );
  }

  async function verifyCompletion({
    completionVerificationHandoffId,
    actionCompletionPolicyId,
    manualVerification=null
  }={}){
    const handoff=
      await global.INFINICUS.ABA.executionEvidenceAuditEngine
        .getCompletionVerificationHandoff({
          completionVerificationHandoffId
        });

    if(!handoff.ok) return handoff;

    const evidencePackage=
      await global.INFINICUS.ABA.executionEvidenceAuditEngine
        .getEvidencePackage({
          executionEvidencePackageId:
            handoff.data.executionEvidencePackageId
        });

    if(!evidencePackage.ok) return evidencePackage;

    if(evidencePackage.data.status!=="verified"){
      return runtime.failure(
        "ABA_EXECUTION_EVIDENCE_NOT_VERIFIED",
        "Execution evidence package is not verified."
      );
    }

    const policy=
      await global.INFINICUS.ABA.actionCompletionStore.get(
        "policies",
        actionCompletionPolicyId
      );

    if(!policy.ok) return policy;

    const evaluation=
      global.INFINICUS.ABA.actionCompletionEvaluator.evaluate({
        evidencePackage:evidencePackage.data,
        completionCriteria:
          handoff.data.completionCriteria || [],
        verificationCriteria:
          handoff.data.verificationCriteria || [],
        policy:policy.data,
        manualVerification
      });

    const verification={
      actionCompletionVerificationId:
        runtime.createId("aba_action_completion_verification"),
      completionVerificationHandoffId,
      actionCompletionPolicyId,
      executionEvidencePackageId:
        evidencePackage.data.executionEvidencePackageId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      state:
        evaluation.state,
      evidenceSufficient:
        evaluation.evidenceSufficient,
      completionResults:
        evaluation.completionResults.map(runtime.clone),
      verificationResults:
        evaluation.verificationResults.map(runtime.clone),
      manualVerification:
        runtime.clone(evaluation.manualVerification),
      correlationId:
        handoff.data.correlationId,
      verifiedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCompletionStore.put(
      "verifications",
      verification
    );

    if(
      !["verified","partially_completed"].includes(
        verification.state
      )
    ){
      const exception={
        completionVerificationExceptionId:
          runtime.createId("aba_completion_verification_exception"),
        actionCompletionVerificationId:
          verification.actionCompletionVerificationId,
        state:
          verification.state,
        evidenceSufficient:
          verification.evidenceSufficient,
        completionResults:
          verification.completionResults.map(runtime.clone),
        verificationResults:
          verification.verificationResults.map(runtime.clone),
        correlationId:
          verification.correlationId,
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.actionCompletionStore.put(
        "exceptions",
        exception
      );

      return runtime.failure(
        "ABA_ACTION_COMPLETION_NOT_VERIFIED",
        "Action completion could not be verified.",
        {
          verification,
          exception
        }
      );
    }

    const certificate={
      actionCompletionCertificateId:
        runtime.createId("aba_action_completion_certificate"),
      actionCompletionVerificationId:
        verification.actionCompletionVerificationId,
      actionInstanceId:
        verification.actionInstanceId,
      executionPlanId:
        verification.executionPlanId,
      executionEvidencePackageId:
        verification.executionEvidencePackageId,
      completionState:
        verification.state,
      evidenceSufficient:
        verification.evidenceSufficient,
      correlationId:
        verification.correlationId,
      issuedAt:
        new Date().toISOString(),
      status:
        "issued"
    };

    await global.INFINICUS.ABA.actionCompletionStore.put(
      "certificates",
      certificate
    );

    const outcomeHandoff={
      outcomeMonitoringHandoffId:
        runtime.createId("aba_outcome_monitoring_handoff"),
      targetBlock:"ABA-23",
      actionCompletionCertificateId:
        certificate.actionCompletionCertificateId,
      actionCompletionVerificationId:
        verification.actionCompletionVerificationId,
      executionEvidencePackageId:
        verification.executionEvidencePackageId,
      actionInstanceId:
        verification.actionInstanceId,
      executionPlanId:
        verification.executionPlanId,
      executionScheduleId:
        verification.executionScheduleId,
      completionState:
        verification.state,
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      completionResults:
        verification.completionResults.map(runtime.clone),
      verificationResults:
        verification.verificationResults.map(runtime.clone),
      correlationId:
        verification.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCompletionStore.put(
      "outcome_handoffs",
      outcomeHandoff
    );

    await runtime.emit(
      "aba.action_completion.verified",
      {
        verification,
        certificate,
        outcomeMonitoringHandoffId:
          outcomeHandoff.outcomeMonitoringHandoffId
      }
    );

    return runtime.success({
      actionCompletionVerification:verification,
      actionCompletionCertificate:certificate,
      outcomeMonitoringHandoff:outcomeHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    verifyCompletion,
    getCompletionVerification:({
      actionCompletionVerificationId
    }) =>
      global.INFINICUS.ABA.actionCompletionStore.get(
        "verifications",
        actionCompletionVerificationId
      ),
    getCompletionCertificate:({
      actionCompletionCertificateId
    }) =>
      global.INFINICUS.ABA.actionCompletionStore.get(
        "certificates",
        actionCompletionCertificateId
      ),
    getOutcomeMonitoringHandoff:({
      outcomeMonitoringHandoffId
    }) =>
      global.INFINICUS.ABA.actionCompletionStore.get(
        "outcome_handoffs",
        outcomeMonitoringHandoffId
      ),
    listExceptions:() =>
      global.INFINICUS.ABA.actionCompletionStore.list(
        "exceptions"
      )
  });

  runtime.registerService(
    "aba.action_completion_verification",
    api,
    {block:"ABA-22"}
  );

  runtime.registerRoute(
    "aba.action_completion_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.action_completion.verify",
    verifyCompletion
  );

  runtime.registerBlock("ABA-22",{
    name:"Action Completion and Verification Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionCompletionVerificationEngine=
    api;
})(window);

/* ===== INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-23.");
  }

  if(!ABA?.actionCompletionVerificationEngine){
    throw new Error("ABA-22 must be loaded before ABA-23.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine/src/model/metric-definition.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.valueType){
      return runtime.failure(
        "ABA_OUTCOME_METRIC_INVALID",
        "Metric name, code, and valueType are required."
      );
    }

    return runtime.success({
      outcomeMetricId:
        input.outcomeMetricId ||
        runtime.createId("aba_outcome_metric"),
      name:String(input.name),
      code:String(input.code),
      description:String(input.description || ""),
      valueType:String(input.valueType),
      unit:input.unit || null,
      aggregation:String(input.aggregation || "latest"),
      direction:String(input.direction || "increase"),
      sourceField:input.sourceField || null,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.outcomeMetricModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine/src/model/evidence-source.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.sourceType){
      return runtime.failure(
        "ABA_OUTCOME_SOURCE_INVALID",
        "Evidence source name and sourceType are required."
      );
    }

    return runtime.success({
      outcomeEvidenceSourceId:
        input.outcomeEvidenceSourceId ||
        runtime.createId("aba_outcome_evidence_source"),
      name:String(input.name),
      sourceType:String(input.sourceType),
      sourceReference:input.sourceReference || null,
      systemOfRecord:Boolean(input.systemOfRecord),
      observedStateOnly:input.observedStateOnly !== false,
      refreshCadenceMinutes:
        Math.max(1,Number(input.refreshCadenceMinutes || 60)),
      dataQualityMinimum:
        Math.max(0,Math.min(1,Number(input.dataQualityMinimum ?? 0.8))),
      credentialReference:input.credentialReference || null,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.outcomeEvidenceSourceModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine/src/model/outcome-definition.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(
      !input.name ||
      !input.outcomeMetricId ||
      !input.outcomeEvidenceSourceId
    ){
      return runtime.failure(
        "ABA_EXPECTED_OUTCOME_INVALID",
        "Outcome name, metric ID, and evidence source ID are required."
      );
    }

    return runtime.success({
      expectedOutcomeDefinitionId:
        input.expectedOutcomeDefinitionId ||
        runtime.createId("aba_expected_outcome"),
      name:String(input.name),
      description:String(input.description || ""),
      outcomeMetricId:String(input.outcomeMetricId),
      outcomeEvidenceSourceId:String(input.outcomeEvidenceSourceId),
      baselineValue:runtime.clone(input.baselineValue),
      targetValue:runtime.clone(input.targetValue),
      minimumAcceptableValue:runtime.clone(input.minimumAcceptableValue),
      maximumAcceptableValue:runtime.clone(input.maximumAcceptableValue),
      tolerance:
        input.tolerance == null
          ? null
          : Number(input.tolerance),
      observationWindow:{
        startsAt:input.observationWindow?.startsAt || new Date().toISOString(),
        endsAt:input.observationWindow?.endsAt || null
      },
      reviewCadenceMinutes:
        Math.max(1,Number(input.reviewCadenceMinutes || 1440)),
      alertThresholds:
        runtime.clone(input.alertThresholds || []),
      attributionRequirements:
        runtime.clone(input.attributionRequirements || []),
      causationRequired:
        Boolean(input.causationRequired),
      confidenceMinimum:
        Math.max(0,Math.min(1,Number(input.confidenceMinimum ?? 0.6))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.expectedOutcomeDefinitionModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine/src/validation/monitoring-contract-validator.js --- */
(function(global){
  "use strict";

  function validateOutcome({outcome,metric,source}){
    const issues=[];

    if(!metric || metric.status!=="active"){
      issues.push("Outcome metric is not active.");
    }

    if(!source || source.status!=="active"){
      issues.push("Outcome evidence source is not active.");
    }

    if(
      outcome.observationWindow?.endsAt &&
      new Date(outcome.observationWindow.endsAt).getTime() <=
      new Date(outcome.observationWindow.startsAt).getTime()
    ){
      issues.push("Observation window end must be after start.");
    }

    if(
      outcome.baselineValue===undefined ||
      outcome.targetValue===undefined
    ){
      issues.push("Baseline and target values are required.");
    }

    if(
      source?.observedStateOnly !== true
    ){
      issues.push("Outcome source must provide observed-state evidence.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  function validateContract(contract){
    const issues=[];

    if(!contract.actionInstanceId){
      issues.push("Action instance ID is required.");
    }

    if(!contract.actionCompletionCertificateId){
      issues.push("Completion certificate ID is required.");
    }

    if(!Array.isArray(contract.outcomes) || !contract.outcomes.length){
      issues.push("At least one expected outcome is required.");
    }

    if(
      contract.outcomes.some(item =>
        !item.metric ||
        !item.source ||
        !item.definition
      )
    ){
      issues.push("Each outcome requires definition, metric, and source.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.monitoringContractValidator=
    Object.freeze({
      validateOutcome,
      validateContract
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine/src/storage/monitoring-contract-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_MONITORING_CONTRACT";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["metrics","outcomeMetricId"],
          ["sources","outcomeEvidenceSourceId"],
          ["outcomes","expectedOutcomeDefinitionId"],
          ["contracts","outcomeMonitoringContractId"],
          ["versions","outcomeMonitoringContractVersionId"],
          ["publication_handoffs","outcomePublicationHandoffId"]
        ]){
          if(!db.objectStoreNames.contains(name)){
            const store=db.createObjectStore(name,{keyPath});

            if(name==="contracts"){
              store.createIndex(
                "actionInstanceId",
                "actionInstanceId",
                {unique:false}
              );
            }
          }
        }
      };

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_MONITORING_CONTRACT_STORAGE_ERROR",
        error?.message || "Monitoring-contract storage failed."
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
            "ABA_MONITORING_CONTRACT_RECORD_NOT_FOUND",
            "Monitoring-contract record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_MONITORING_CONTRACT_STORAGE_ERROR",
        error?.message || "Monitoring-contract retrieval failed."
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
        "ABA_MONITORING_CONTRACT_STORAGE_ERROR",
        error?.message || "Monitoring-contract listing failed."
      );
    }
  }

  global.INFINICUS.ABA.outcomeMonitoringContractStore=
    Object.freeze({open,put,get,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-23-Expected-Outcome-Monitoring-Contract-Engine/src/engine/expected-outcome-monitoring-contract-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;

  async function registerMetric(input={}){
    const built=
      global.INFINICUS.ABA.outcomeMetricModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "metrics",
      built.data
    );
  }

  async function registerEvidenceSource(input={}){
    const built=
      global.INFINICUS.ABA.outcomeEvidenceSourceModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "sources",
      built.data
    );
  }

  async function registerOutcome(input={}){
    const metric=
      await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "metrics",
        input.outcomeMetricId
      );

    if(!metric.ok) return metric;

    const source=
      await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "sources",
        input.outcomeEvidenceSourceId
      );

    if(!source.ok) return source;

    const built=
      global.INFINICUS.ABA.expectedOutcomeDefinitionModel.create(input);

    if(!built.ok) return built;

    const validation=
      global.INFINICUS.ABA.monitoringContractValidator.validateOutcome({
        outcome:built.data,
        metric:metric.data,
        source:source.data
      });

    if(!validation.valid){
      return runtime.failure(
        "ABA_EXPECTED_OUTCOME_INVALID",
        "Expected outcome failed monitoring validation.",
        validation
      );
    }

    return global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "outcomes",
      built.data
    );
  }

  async function createMonitoringContract({
    outcomeMonitoringHandoffId,
    expectedOutcomeDefinitionIds=[]
  }={}){
    const handoff=
      await global.INFINICUS.ABA.actionCompletionVerificationEngine
        .getOutcomeMonitoringHandoff({
          outcomeMonitoringHandoffId
        });

    if(!handoff.ok) return handoff;

    const outcomes=[];

    for(const id of expectedOutcomeDefinitionIds){
      const definition=
        await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
          "outcomes",
          id
        );

      if(!definition.ok) return definition;

      const metric=
        await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
          "metrics",
          definition.data.outcomeMetricId
        );

      if(!metric.ok) return metric;

      const source=
        await global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
          "sources",
          definition.data.outcomeEvidenceSourceId
        );

      if(!source.ok) return source;

      outcomes.push({
        definition:runtime.clone(definition.data),
        metric:runtime.clone(metric.data),
        source:runtime.clone(source.data)
      });
    }

    const contract={
      outcomeMonitoringContractId:
        runtime.createId("aba_outcome_monitoring_contract"),
      outcomeMonitoringHandoffId,
      actionCompletionCertificateId:
        handoff.data.actionCompletionCertificateId,
      actionCompletionVerificationId:
        handoff.data.actionCompletionVerificationId,
      executionEvidencePackageId:
        handoff.data.executionEvidencePackageId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      completionState:
        handoff.data.completionState,
      outcomes:
        outcomes.map(runtime.clone),
      contractVersion:1,
      state:"draft",
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    const validation=
      global.INFINICUS.ABA.monitoringContractValidator
        .validateContract(contract);

    if(!validation.valid){
      return runtime.failure(
        "ABA_MONITORING_CONTRACT_INVALID",
        "Outcome monitoring contract failed validation.",
        validation
      );
    }

    const issued={
      ...contract,
      state:"issued",
      issuedAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "contracts",
      issued
    );

    await global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "versions",
      {
        outcomeMonitoringContractVersionId:
          runtime.createId("aba_monitoring_contract_version"),
        outcomeMonitoringContractId:
          issued.outcomeMonitoringContractId,
        contractVersion:
          issued.contractVersion,
        snapshot:
          runtime.clone(issued),
        createdAt:
          new Date().toISOString()
      }
    );

    const publicationHandoff={
      outcomePublicationHandoffId:
        runtime.createId("aba_outcome_publication_handoff"),
      targetBlock:"ABA-24",
      outcomeMonitoringContractId:
        issued.outcomeMonitoringContractId,
      actionCompletionCertificateId:
        issued.actionCompletionCertificateId,
      actionInstanceId:
        issued.actionInstanceId,
      executionPlanId:
        issued.executionPlanId,
      executionScheduleId:
        issued.executionScheduleId,
      outcomes:
        issued.outcomes.map(runtime.clone),
      correlationId:
        issued.correlationId,
      lineage:
        issued.lineage.map(runtime.clone),
      confidence:
        issued.confidence,
      status:"ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomeMonitoringContractStore.put(
      "publication_handoffs",
      publicationHandoff
    );

    await runtime.emit(
      "aba.outcome_monitoring_contract.issued",
      {
        outcomeMonitoringContract:issued,
        outcomePublicationHandoffId:
          publicationHandoff.outcomePublicationHandoffId
      }
    );

    return runtime.success({
      outcomeMonitoringContract:issued,
      outcomePublicationHandoff:publicationHandoff
    });
  }

  const api=Object.freeze({
    registerMetric,
    registerEvidenceSource,
    registerOutcome,
    createMonitoringContract,
    getMonitoringContract:({outcomeMonitoringContractId}) =>
      global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "contracts",
        outcomeMonitoringContractId
      ),
    getOutcomePublicationHandoff:({outcomePublicationHandoffId}) =>
      global.INFINICUS.ABA.outcomeMonitoringContractStore.get(
        "publication_handoffs",
        outcomePublicationHandoffId
      ),
    listOutcomeDefinitions:() =>
      global.INFINICUS.ABA.outcomeMonitoringContractStore.list(
        "outcomes"
      )
  });

  runtime.registerService(
    "aba.expected_outcome_monitoring_contract",
    api,
    {block:"ABA-23"}
  );

  runtime.registerRoute(
    "aba.outcome_metric.register",
    registerMetric
  );

  runtime.registerRoute(
    "aba.outcome_evidence_source.register",
    registerEvidenceSource
  );

  runtime.registerRoute(
    "aba.expected_outcome.register",
    registerOutcome
  );

  runtime.registerRoute(
    "aba.outcome_monitoring_contract.create",
    createMonitoringContract
  );

  runtime.registerBlock("ABA-23",{
    name:"Expected Outcome and Monitoring Contract Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.expectedOutcomeMonitoringContractEngine=
    api;
})(window);

/* ===== INFINICUS-ABA-24-Outcome-Monitoring-Publication-Handoff-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-24-Outcome-Monitoring-Publication-Handoff-Engine/src/core/runtime-guard.js --- */
(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-24.");
  }

  if(!ABA?.expectedOutcomeMonitoringContractEngine){
    throw new Error("ABA-23 must be loaded before ABA-24.");
  }
})(window);

/* --- approved-business-action/INFINICUS-ABA-24-Outcome-Monitoring-Publication-Handoff-Engine/src/model/publication-policy.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_PUBLICATION_POLICY_INVALID",
        "Publication policy name and code are required."
      );
    }

    return runtime.success({
      outcomePublicationPolicyId:
        input.outcomePublicationPolicyId ||
        runtime.createId("aba_outcome_publication_policy"),
      name:String(input.name),
      code:String(input.code),
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      retryBackoffSeconds:
        Math.max(1,Number(input.retryBackoffSeconds || 60)),
      requireAcknowledgement:
        input.requireAcknowledgement !== false,
      publishRevocations:
        input.publishRevocations !== false,
      deadLetterOnFailure:
        input.deadLetterOnFailure !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.outcomePublicationPolicyModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-24-Outcome-Monitoring-Publication-Handoff-Engine/src/model/destination.js --- */
(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.destinationType){
      return runtime.failure(
        "ABA_MONITORING_DESTINATION_INVALID",
        "Destination name and destinationType are required."
      );
    }

    return runtime.success({
      monitoringDestinationId:
        input.monitoringDestinationId ||
        runtime.createId("aba_monitoring_destination"),
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

  global.INFINICUS.ABA.monitoringDestinationModel=
    Object.freeze({create});
})(window);

/* --- approved-business-action/INFINICUS-ABA-24-Outcome-Monitoring-Publication-Handoff-Engine/src/validation/publication-validator.js --- */
(function(global){
  "use strict";

  function validate({
    handoff,
    policy,
    destination
  }){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Publication policy is not active.");
    }

    if(destination.status!=="active"){
      issues.push("Monitoring destination is not active.");
    }

    if(
      !["healthy","degraded"].includes(
        destination.healthStatus
      )
    ){
      issues.push("Monitoring destination is not healthy.");
    }

    if(!handoff.outcomeMonitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }

    if(
      !Array.isArray(handoff.outcomes) ||
      !handoff.outcomes.length
    ){
      issues.push("Published monitoring contract requires outcomes.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.outcomePublicationValidator=
    Object.freeze({validate});
})(window);

/* --- approved-business-action/INFINICUS-ABA-24-Outcome-Monitoring-Publication-Handoff-Engine/src/storage/publication-store.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const DB_NAME="INFINICUS_ABA_OUTCOME_PUBLICATION";
  let dbPromise;

  const reqp=req=>new Promise((resolve,reject)=>{
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);

      req.onupgradeneeded=()=>{
        const db=req.result;

        for(const [name,keyPath] of [
          ["policies","outcomePublicationPolicyId"],
          ["destinations","monitoringDestinationId"],
          ["publications","outcomePublicationId"],
          ["receipts","outcomePublicationReceiptId"],
          ["dead_letters","outcomePublicationDeadLetterId"],
          ["monitoring_handoffs","outcomeMonitoringLayerHandoffId"],
          ["learning_handoffs","continuousLearningHandoffId"],
          ["manifests","approvedBusinessActionManifestId"]
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

      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
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
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication storage failed."
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
            "ABA_PUBLICATION_RECORD_NOT_FOUND",
            "Outcome-publication record was not found.",
            {storeName,id}
          );
    }catch(error){
      return runtime.failure(
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication retrieval failed."
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
            "ABA_PUBLICATION_NOT_FOUND",
            "Publication was not found.",
            {idempotencyKey}
          );
    }catch(error){
      return runtime.failure(
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication retrieval failed."
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
        "ABA_PUBLICATION_STORAGE_ERROR",
        error?.message || "Outcome-publication listing failed."
      );
    }
  }

  global.INFINICUS.ABA.outcomePublicationStore=
    Object.freeze({
      open,
      put,
      get,
      getByIdempotencyKey,
      list
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-24-Outcome-Monitoring-Publication-Handoff-Engine/src/engine/outcome-monitoring-publication-engine.js --- */
(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const publishers=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.outcomePublicationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomePublicationStore.put(
      "policies",
      built.data
    );
  }

  async function registerDestination(input={}){
    const built=
      global.INFINICUS.ABA.monitoringDestinationModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomePublicationStore.put(
      "destinations",
      built.data
    );
  }

  function registerPublisher(destinationType,publisher){
    if(!destinationType || typeof publisher!=="function"){
      return runtime.failure(
        "ABA_MONITORING_PUBLISHER_INVALID",
        "Destination type and publisher function are required."
      );
    }

    publishers.set(destinationType,publisher);

    return runtime.success({destinationType});
  }

  async function publish({
    outcomePublicationHandoffId,
    outcomePublicationPolicyId,
    monitoringDestinationId
  }={}){
    const handoff=
      await global.INFINICUS.ABA.expectedOutcomeMonitoringContractEngine
        .getOutcomePublicationHandoff({
          outcomePublicationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.ABA.outcomePublicationStore.get(
        "policies",
        outcomePublicationPolicyId
      );

    if(!policy.ok) return policy;

    const destination=
      await global.INFINICUS.ABA.outcomePublicationStore.get(
        "destinations",
        monitoringDestinationId
      );

    if(!destination.ok) return destination;

    const validation=
      global.INFINICUS.ABA.outcomePublicationValidator.validate({
        handoff:handoff.data,
        policy:policy.data,
        destination:destination.data
      });

    if(!validation.valid){
      return runtime.failure(
        "ABA_OUTCOME_PUBLICATION_INVALID",
        "Outcome monitoring publication failed validation.",
        validation
      );
    }

    const idempotencyKey=
      `aba_outcome_${handoff.data.outcomeMonitoringContractId}_${monitoringDestinationId}`;

    const existing=
      await global.INFINICUS.ABA.outcomePublicationStore
        .getByIdempotencyKey(idempotencyKey);

    if(existing.ok){
      return runtime.success({
        outcomePublication:existing.data,
        idempotentReplay:true
      });
    }

    const publisher=
      publishers.get(destination.data.destinationType);

    if(!publisher){
      return runtime.failure(
        "ABA_MONITORING_PUBLISHER_NOT_FOUND",
        `No publisher registered for destination type: ${destination.data.destinationType}`
      );
    }

    const monitoringEnvelope={
      schemaVersion:"1.0.0",
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      actionCompletionCertificateId:
        handoff.data.actionCompletionCertificateId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      outcomes:
        handoff.data.outcomes.map(runtime.clone),
      observationStateRules:{
        observed:
          "actual operational observations",
        calculated:
          "derived from observed values",
        inferred:
          "model-estimated with confidence",
        assumed:
          "must never be treated as actual",
        simulated:
          "must never be treated as actual"
      },
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      idempotencyKey,
      publishedAt:
        new Date().toISOString()
    };

    let response;

    try{
      response=
        await publisher(
          runtime.clone(monitoringEnvelope),
          {
            destination:
              runtime.clone(destination.data),
            requireAcknowledgement:
              policy.data.requireAcknowledgement
          }
        );
    }catch(error){
      const deadLetter={
        outcomePublicationDeadLetterId:
          runtime.createId("aba_outcome_dead_letter"),
        outcomeMonitoringContractId:
          handoff.data.outcomeMonitoringContractId,
        monitoringDestinationId,
        idempotencyKey,
        envelope:
          runtime.clone(monitoringEnvelope),
        errorMessage:
          error?.message || "Outcome publication failed.",
        attemptCount:1,
        correlationId:
          handoff.data.correlationId,
        createdAt:
          new Date().toISOString()
      };

      if(policy.data.deadLetterOnFailure){
        await global.INFINICUS.ABA.outcomePublicationStore.put(
          "dead_letters",
          deadLetter
        );
      }

      return runtime.failure(
        "ABA_OUTCOME_PUBLICATION_FAILED",
        "Outcome monitoring contract publication failed.",
        deadLetter
      );
    }

    const publication={
      outcomePublicationId:
        runtime.createId("aba_outcome_publication"),
      outcomePublicationHandoffId,
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      monitoringDestinationId,
      idempotencyKey,
      envelope:
        runtime.clone(monitoringEnvelope),
      response:
        runtime.clone(response),
      state:
        "published",
      correlationId:
        handoff.data.correlationId,
      publishedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "publications",
      publication
    );

    const receipt={
      outcomePublicationReceiptId:
        runtime.createId("aba_outcome_publication_receipt"),
      outcomePublicationId:
        publication.outcomePublicationId,
      acknowledgementReference:
        response?.acknowledgementReference || null,
      acknowledged:
        response?.acknowledged !== false,
      correlationId:
        publication.correlationId,
      receivedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "receipts",
      receipt
    );

    const monitoringHandoff={
      outcomeMonitoringLayerHandoffId:
        runtime.createId("aba_outcome_monitoring_layer_handoff"),
      targetLayer:"OUTCOME_MONITORING",
      outcomePublicationId:
        publication.outcomePublicationId,
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      outcomes:
        handoff.data.outcomes.map(runtime.clone),
      receipt:
        runtime.clone(receipt),
      correlationId:
        handoff.data.correlationId,
      status:"published",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "monitoring_handoffs",
      monitoringHandoff
    );

    const learningHandoff={
      continuousLearningHandoffId:
        runtime.createId("aba_continuous_learning_handoff"),
      targetLayer:"CONTINUOUS_LEARNING",
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      actionCompletionCertificateId:
        handoff.data.actionCompletionCertificateId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      expectedOutcomes:
        handoff.data.outcomes.map(item=>({
          expectedOutcomeDefinitionId:
            item.definition.expectedOutcomeDefinitionId,
          metricCode:
            item.metric.code,
          baselineValue:
            runtime.clone(item.definition.baselineValue),
          targetValue:
            runtime.clone(item.definition.targetValue),
          tolerance:
            item.definition.tolerance,
          confidenceMinimum:
            item.definition.confidenceMinimum,
          causationRequired:
            item.definition.causationRequired
        })),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      status:"ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "learning_handoffs",
      learningHandoff
    );

    const manifest={
      approvedBusinessActionManifestId:
        runtime.createId("aba_platform_manifest"),
      platformLayer:"APPROVED_BUSINESS_ACTION",
      blockRange:"ABA-01..ABA-24",
      terminalBlock:"ABA-24",
      outcomeMonitoringLayerHandoffId:
        monitoringHandoff.outcomeMonitoringLayerHandoffId,
      continuousLearningHandoffId:
        learningHandoff.continuousLearningHandoffId,
      status:"completed",
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "manifests",
      manifest
    );

    await runtime.emit(
      "aba.outcome_monitoring.published",
      {
        publication,
        receipt,
        monitoringHandoff,
        learningHandoff,
        manifest
      }
    );

    return runtime.success({
      outcomePublication:publication,
      publicationReceipt:receipt,
      outcomeMonitoringLayerHandoff:monitoringHandoff,
      continuousLearningHandoff:learningHandoff,
      approvedBusinessActionManifest:manifest
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerDestination,
    registerPublisher,
    publish,
    getPublication:({outcomePublicationId}) =>
      global.INFINICUS.ABA.outcomePublicationStore.get(
        "publications",
        outcomePublicationId
      ),
    getOutcomeMonitoringLayerHandoff:({
      outcomeMonitoringLayerHandoffId
    }) =>
      global.INFINICUS.ABA.outcomePublicationStore.get(
        "monitoring_handoffs",
        outcomeMonitoringLayerHandoffId
      ),
    getContinuousLearningHandoff:({
      continuousLearningHandoffId
    }) =>
      global.INFINICUS.ABA.outcomePublicationStore.get(
        "learning_handoffs",
        continuousLearningHandoffId
      ),
    listDeadLetters:() =>
      global.INFINICUS.ABA.outcomePublicationStore.list(
        "dead_letters"
      )
  });

  runtime.registerService(
    "aba.outcome_monitoring_publication",
    api,
    {block:"ABA-24"}
  );

  runtime.registerRoute(
    "aba.outcome_publication_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.monitoring_destination.register",
    registerDestination
  );

  runtime.registerRoute(
    "aba.outcome_monitoring.publish",
    publish
  );

  runtime.registerBlock("ABA-24",{
    name:"Outcome Monitoring Publication and Handoff Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.outcomeMonitoringPublicationEngine=
    api;
})(window);

/* ===== INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine ===== */

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/manifest/block-manifest.js --- */
(function(global){
  "use strict";

  const blocks = [
    ["ABA-01","Core Runtime and Registry","runtime"],
    ["ABA-02","Decision Package Intake and Validation Engine","decisionPackageIntakeEngine"],
    ["ABA-03","Action Definition and Business Action Ontology Engine","actionDefinitionOntologyEngine"],
    ["ABA-04","Action Instance and Lifecycle Registry","actionInstanceLifecycleRegistry"],
    ["ABA-05","Authority, Role and Decision-Rights Engine","authorityDecisionRightsEngine"],
    ["ABA-06","Approval Policy and Threshold Engine","approvalPolicyThresholdEngine"],
    ["ABA-07","Multi-Stage Approval Workflow Engine","multiStageApprovalWorkflowEngine"],
    ["ABA-08","Approval Evidence, Signature and Audit Engine","approvalEvidenceAuditEngine"],
    ["ABA-09","Approved Action Contract Generation Engine","approvedActionContractEngine"],
    ["ABA-10","Action Scope, Parameter and Boundary Engine","actionScopeBoundaryEngine"],
    ["ABA-11","Constraint and Dependency Revalidation Engine","constraintDependencyRevalidationEngine"],
    ["ABA-12","Conflict, Duplication and Action Collision Engine","actionCollisionEngine"],
    ["ABA-13","Action Decomposition and Execution Plan Engine","actionDecompositionExecutionPlanEngine"],
    ["ABA-14","Responsible Actor and Task Assignment Engine","responsibleActorTaskAssignmentEngine"],
    ["ABA-15","Resource Reservation and Availability Engine","resourceReservationAvailabilityEngine"],
    ["ABA-16","Execution Scheduling and Action Queue Engine","executionSchedulingQueueEngine"],
    ["ABA-17","Execution Adapter and Connector Registry","executionAdapterConnectorRegistry"],
    ["ABA-18","Pre-Execution Simulation and Dry-Run Engine","preExecutionDryRunEngine"],
    ["ABA-19","Controlled Action Execution Engine","controlledActionExecutionEngine"],
    ["ABA-20","Execution Failure, Compensation and Rollback Engine","executionFailureRollbackEngine"],
    ["ABA-21","Execution Evidence and Audit Trail Engine","executionEvidenceAuditEngine"],
    ["ABA-22","Action Completion and Verification Engine","actionCompletionVerificationEngine"],
    ["ABA-23","Expected Outcome and Monitoring Contract Engine","expectedOutcomeMonitoringContractEngine"],
    ["ABA-24","Outcome Monitoring Publication and Handoff Engine","outcomeMonitoringPublicationEngine"]
  ].map(([blockId,name,namespaceKey],index)=>Object.freeze({
    blockId,
    name,
    namespaceKey,
    sequence:index+1,
    required:true
  }));

  global.INFINICUS = global.INFINICUS || {};
  global.INFINICUS.ABA = global.INFINICUS.ABA || {};
  global.INFINICUS.ABA.masterBlockManifest = Object.freeze(blocks);
})(window);

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/validation/config-validator.js --- */
(function(global){
  "use strict";

  function validate(config={}){
    const issues=[];

    if(!["development","staging","production"].includes(config.environment)){
      issues.push("environment must be development, staging, or production.");
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

    if(config.execution?.requireDryRun!==true){
      issues.push("Controlled execution requires dry-run validation.");
    }

    if(config.execution?.requireIdempotency!==true){
      issues.push("Controlled execution requires idempotency.");
    }

    if(config.execution?.requireQueueLease!==true){
      issues.push("Controlled execution requires queue leasing.");
    }

    if(config.handoffs?.outcomeMonitoringEnabled!==true){
      issues.push("Outcome Monitoring handoff must be enabled.");
    }

    if(config.handoffs?.continuousLearningEnabled!==true){
      issues.push("Continuous Learning handoff must be enabled.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.masterConfigValidator =
    Object.freeze({validate});
})(window);

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/validation/dependency-validator.js --- */
(function(global){
  "use strict";

  function validate(manifest,abaNamespace){
    const checks = manifest.map(block=>{
      const available = Boolean(abaNamespace?.[block.namespaceKey]);

      return {
        blockId:block.blockId,
        name:block.name,
        namespaceKey:block.namespaceKey,
        available,
        sequence:block.sequence,
        required:block.required
      };
    });

    const missing = checks.filter(item=>item.required && !item.available);

    const ordered = checks.every(
      (item,index)=>item.sequence===index+1
    );

    return {
      ready:missing.length===0 && ordered,
      ordered,
      checks,
      missing
    };
  }

  global.INFINICUS.ABA.masterDependencyValidator =
    Object.freeze({validate});
})(window);

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/validation/handoff-validator.js --- */
(function(global){
  "use strict";

  const requiredTerminalFields = [
    "outcomePublication",
    "publicationReceipt",
    "outcomeMonitoringLayerHandoff",
    "continuousLearningHandoff",
    "approvedBusinessActionManifest"
  ];

  function validateTerminalResult(result={}){
    const issues=[];

    for(const field of requiredTerminalFields){
      if(!result[field]){
        issues.push(`Terminal result missing: ${field}`);
      }
    }

    if(
      result.outcomeMonitoringLayerHandoff &&
      result.outcomeMonitoringLayerHandoff.targetLayer!=="OUTCOME_MONITORING"
    ){
      issues.push("Outcome Monitoring handoff target is invalid.");
    }

    if(
      result.continuousLearningHandoff &&
      result.continuousLearningHandoff.targetLayer!=="CONTINUOUS_LEARNING"
    ){
      issues.push("Continuous Learning handoff target is invalid.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.masterHandoffValidator =
    Object.freeze({
      requiredTerminalFields,
      validateTerminalResult
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/storage/master-store.js --- */
(function(global){
  "use strict";

  const DB_NAME = "INFINICUS_ABA_MASTER_INTEGRATION";
  let dbPromise;

  function requestPromise(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  function open(){
    if(dbPromise) return dbPromise;

    dbPromise = new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);

      request.onupgradeneeded=()=>{
        const db=request.result;

        for(const [name,keyPath] of [
          ["diagnostics","diagnosticId"],
          ["readiness_reports","readinessReportId"],
          ["pipeline_runs","pipelineRunId"],
          ["deployment_manifests","deploymentManifestId"]
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
    const db=await open();
    const transaction=db.transaction(storeName,"readwrite");
    await requestPromise(
      transaction.objectStore(storeName).put(structuredClone(record))
    );
    return structuredClone(record);
  }

  async function get(storeName,id){
    const db=await open();
    const transaction=db.transaction(storeName,"readonly");
    return requestPromise(
      transaction.objectStore(storeName).get(id)
    );
  }

  async function list(storeName){
    const db=await open();
    const transaction=db.transaction(storeName,"readonly");
    return requestPromise(
      transaction.objectStore(storeName).getAll()
    );
  }

  global.INFINICUS.ABA.masterIntegrationStore =
    Object.freeze({open,put,get,list});
})(window);

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/diagnostics/readiness-engine.js --- */
(function(global){
  "use strict";

  function inspectRuntime(runtime){
    const issues=[];

    if(!runtime){
      issues.push("ABA-01 runtime is unavailable.");
      return {ready:false,issues};
    }

    const requiredMethods=[
      "registerService",
      "registerRoute",
      "registerBlock",
      "emit"
    ];

    for(const method of requiredMethods){
      if(typeof runtime[method]!=="function"){
        issues.push(`Runtime method missing: ${method}`);
      }
    }

    return {
      ready:issues.length===0,
      issues
    };
  }

  function assess({
    dependencyResult,
    configResult,
    runtimeResult
  }){
    const issues=[
      ...dependencyResult.missing.map(item=>
        `Missing block: ${item.blockId} ${item.name}`
      ),
      ...configResult.issues,
      ...runtimeResult.issues
    ];

    return {
      productionReady:issues.length===0,
      issueCount:issues.length,
      issues,
      dependencyReady:dependencyResult.ready,
      configurationReady:configResult.valid,
      runtimeReady:runtimeResult.ready
    };
  }

  global.INFINICUS.ABA.masterReadinessEngine =
    Object.freeze({
      inspectRuntime,
      assess
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/orchestration/pipeline-orchestrator.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS.ABA;

  const phaseDefinitions = Object.freeze([
    {phase:"intake",blockId:"ABA-02"},
    {phase:"definition",blockId:"ABA-03"},
    {phase:"lifecycle",blockId:"ABA-04"},
    {phase:"authority",blockId:"ABA-05"},
    {phase:"approval_policy",blockId:"ABA-06"},
    {phase:"approval_workflow",blockId:"ABA-07"},
    {phase:"approval_evidence",blockId:"ABA-08"},
    {phase:"action_contract",blockId:"ABA-09"},
    {phase:"boundaries",blockId:"ABA-10"},
    {phase:"revalidation",blockId:"ABA-11"},
    {phase:"collision_check",blockId:"ABA-12"},
    {phase:"decomposition",blockId:"ABA-13"},
    {phase:"assignment",blockId:"ABA-14"},
    {phase:"reservation",blockId:"ABA-15"},
    {phase:"scheduling",blockId:"ABA-16"},
    {phase:"adapter_selection",blockId:"ABA-17"},
    {phase:"dry_run",blockId:"ABA-18"},
    {phase:"execution",blockId:"ABA-19"},
    {phase:"rollback",blockId:"ABA-20"},
    {phase:"execution_evidence",blockId:"ABA-21"},
    {phase:"completion_verification",blockId:"ABA-22"},
    {phase:"monitoring_contract",blockId:"ABA-23"},
    {phase:"publication",blockId:"ABA-24"}
  ]);

  async function run({
    pipelineName="approved_business_action",
    correlationId=null,
    context={},
    handlers={}
  }={}){
    const runtime=ABA.runtime;
    const pipelineRunId=runtime.createId("aba_pipeline_run");
    const phases=[];
    let currentContext=runtime.clone(context);

    for(const definition of phaseDefinitions){
      const handler=handlers[definition.phase];

      if(typeof handler!=="function"){
        return runtime.failure(
          "ABA_PIPELINE_HANDLER_MISSING",
          `Pipeline handler missing for phase: ${definition.phase}`,
          {
            pipelineRunId,
            failedPhase:definition.phase,
            blockId:definition.blockId,
            phases
          }
        );
      }

      const startedAt=new Date().toISOString();

      try{
        const result=await handler(runtime.clone(currentContext));

        if(!result?.ok){
          return runtime.failure(
            "ABA_PIPELINE_PHASE_FAILED",
            `Pipeline phase failed: ${definition.phase}`,
            {
              pipelineRunId,
              failedPhase:definition.phase,
              blockId:definition.blockId,
              result,
              phases
            }
          );
        }

        currentContext={
          ...currentContext,
          [definition.phase]:runtime.clone(result.data)
        };

        phases.push({
          phase:definition.phase,
          blockId:definition.blockId,
          status:"completed",
          startedAt,
          completedAt:new Date().toISOString()
        });

        await runtime.emit(
          "aba.master.pipeline_phase_completed",
          {
            pipelineRunId,
            phase:definition.phase,
            blockId:definition.blockId,
            correlationId
          }
        );
      }catch(error){
        return runtime.failure(
          "ABA_PIPELINE_PHASE_EXCEPTION",
          error?.message || `Pipeline phase exception: ${definition.phase}`,
          {
            pipelineRunId,
            failedPhase:definition.phase,
            blockId:definition.blockId,
            phases
          }
        );
      }
    }

    const terminal =
      currentContext.publication?.outcomePublication ||
      currentContext.publication ||
      {};

    return runtime.success({
      pipelineRunId,
      pipelineName,
      correlationId,
      phases,
      context:currentContext,
      terminal,
      status:"completed",
      completedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.masterPipelineOrchestrator =
    Object.freeze({
      phaseDefinitions,
      run
    });
})(window);

/* --- approved-business-action/INFINICUS-ABA-25-Master-Integration-Production-Assembly-Deployment-Engine/src/engine/master-integration-engine.js --- */
(function(global){
  "use strict";

  const ABA = global.INFINICUS.ABA;
  const runtime = ABA.runtime;

  async function diagnose({config={}}={}){
    const dependencyResult =
      ABA.masterDependencyValidator.validate(
        ABA.masterBlockManifest,
        ABA
      );

    const configResult =
      ABA.masterConfigValidator.validate(config);

    const runtimeResult =
      ABA.masterReadinessEngine.inspectRuntime(runtime);

    const assessment =
      ABA.masterReadinessEngine.assess({
        dependencyResult,
        configResult,
        runtimeResult
      });

    const report={
      diagnosticId:
        runtime.createId("aba_master_diagnostic"),
      generatedAt:
        new Date().toISOString(),
      blockCount:
        ABA.masterBlockManifest.length,
      dependencyResult,
      configResult,
      runtimeResult,
      assessment
    };

    await ABA.masterIntegrationStore.put(
      "diagnostics",
      report
    );

    await runtime.emit(
      "aba.master.diagnostic_completed",
      {
        diagnosticId:report.diagnosticId,
        productionReady:assessment.productionReady,
        issueCount:assessment.issueCount
      }
    );

    return runtime.success(report);
  }

  async function assessDeploymentReadiness({
    config={}
  }={}){
    const diagnostic=await diagnose({config});

    if(!diagnostic.ok) return diagnostic;

    const report={
      readinessReportId:
        runtime.createId("aba_readiness_report"),
      productionReady:
        diagnostic.data.assessment.productionReady,
      issueCount:
        diagnostic.data.assessment.issueCount,
      issues:
        runtime.clone(diagnostic.data.assessment.issues),
      blockChecks:
        diagnostic.data.dependencyResult.checks.map(runtime.clone),
      generatedAt:
        new Date().toISOString()
    };

    await ABA.masterIntegrationStore.put(
      "readiness_reports",
      report
    );

    return runtime.success(report);
  }

  async function runPipeline(input={}){
    const result=
      await ABA.masterPipelineOrchestrator.run(input);

    if(result.ok){
      await ABA.masterIntegrationStore.put(
        "pipeline_runs",
        result.data
      );
    }

    return result;
  }

  async function validateTerminalHandoffs({
    terminalResult={}
  }={}){
    const validation=
      ABA.masterHandoffValidator
        .validateTerminalResult(terminalResult);

    if(!validation.valid){
      return runtime.failure(
        "ABA_TERMINAL_HANDOFF_INVALID",
        "Outcome Monitoring or Continuous Learning handoff is incomplete.",
        validation
      );
    }

    return runtime.success(validation);
  }

  async function createDeploymentManifest({
    config={},
    artifactVersion="1.0.0",
    commitReference=null
  }={}){
    const readiness=
      await assessDeploymentReadiness({config});

    if(!readiness.ok) return readiness;

    if(!readiness.data.productionReady){
      return runtime.failure(
        "ABA_DEPLOYMENT_NOT_READY",
        "Approved Business Action subsystem is not production-ready.",
        readiness.data
      );
    }

    const manifest={
      deploymentManifestId:
        runtime.createId("aba_deployment_manifest"),
      subsystem:
        "APPROVED_BUSINESS_ACTION",
      artifactVersion,
      commitReference,
      blockRange:
        "ABA-01..ABA-25",
      integratedBlockCount:
        ABA.masterBlockManifest.length + 1,
      environment:
        config.environment,
      readinessReportId:
        readiness.data.readinessReportId,
      status:
        "ready_for_deployment",
      createdAt:
        new Date().toISOString()
    };

    await ABA.masterIntegrationStore.put(
      "deployment_manifests",
      manifest
    );

    await runtime.emit(
      "aba.master.deployment_manifest_created",
      manifest
    );

    return runtime.success(manifest);
  }

  const api=Object.freeze({
    diagnose,
    assessDeploymentReadiness,
    runPipeline,
    validateTerminalHandoffs,
    createDeploymentManifest,
    getBlockManifest:() =>
      runtime.success(
        ABA.masterBlockManifest.map(runtime.clone)
      ),
    listDiagnostics:async() =>
      runtime.success(
        await ABA.masterIntegrationStore.list("diagnostics")
      ),
    listPipelineRuns:async() =>
      runtime.success(
        await ABA.masterIntegrationStore.list("pipeline_runs")
      )
  });

  runtime.registerService(
    "aba.master_integration",
    api,
    {block:"ABA-25"}
  );

  runtime.registerRoute(
    "aba.master.diagnose",
    diagnose
  );

  runtime.registerRoute(
    "aba.master.readiness",
    assessDeploymentReadiness
  );

  runtime.registerRoute(
    "aba.master.pipeline.run",
    runPipeline
  );

  runtime.registerRoute(
    "aba.master.terminal_handoffs.validate",
    validateTerminalHandoffs
  );

  runtime.registerRoute(
    "aba.master.deployment_manifest.create",
    createDeploymentManifest
  );

  runtime.registerBlock("ABA-25",{
    name:
      "Approved Business Action Master Integration, Production Assembly and Deployment Engine",
    version:"1.0.0",
    status:"active"
  });

  ABA.masterIntegrationEngine=api;
})(window);
