(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function registerBusiness(input = {}) {
    const built =
      global.INFINICUS.DT
        .businessIdentityModel
        .create(input);

    if (!built.ok) return built;

    const existing =
      await global.INFINICUS.DT
        .twinRegistryStore
        .getByIndex(
          "businesses",
          "businessKey",
          built.data.businessKey
        );

    if (existing.ok) {
      return runtime.failure(
        "BUSINESS_KEY_DUPLICATE",
        `Business key already exists: ${built.data.businessKey}`
      );
    }

    const stored =
      await global.INFINICUS.DT
        .twinRegistryStore
        .put("businesses", built.data);

    if (stored.ok) {
      await runtime.emit(
        "dt.business_identity.registered",
        stored.data
      );
    }

    return stored;
  }

  async function createTwin(input = {}) {
    const business =
      await global.INFINICUS.DT
        .twinRegistryStore
        .get("businesses", input.businessId);

    if (!business.ok) return business;

    const built =
      global.INFINICUS.DT
        .twinInstanceModel
        .create({
          ...input,
          ownerId:
            input.ownerId || business.data.ownerId,
          tenantId:
            input.tenantId || business.data.tenantId
        });

    if (!built.ok) return built;

    let parent = null;

    if (built.data.parentTwinId) {
      const found =
        await global.INFINICUS.DT
          .twinRegistryStore
          .get(
            "twins",
            built.data.parentTwinId
          );

      if (!found.ok) return found;
      parent = found.data;
    }

    const hierarchy =
      global.INFINICUS.DT
        .twinHierarchyValidator
        .validate(parent, built.data);

    if (!hierarchy.valid) {
      return runtime.failure(
        "TWIN_HIERARCHY_INVALID",
        "Twin hierarchy validation failed.",
        hierarchy
      );
    }

    const duplicate =
      await global.INFINICUS.DT
        .twinRegistryStore
        .getByIndex(
          "twins",
          "twinKey",
          built.data.twinKey
        );

    if (duplicate.ok) {
      return runtime.failure(
        "TWIN_KEY_DUPLICATE",
        `Twin key already exists: ${built.data.twinKey}`
      );
    }

    const stored =
      await global.INFINICUS.DT
        .twinRegistryStore
        .put("twins", built.data);

    if (!stored.ok) return stored;

    runtime.registerTwin(
      built.data.twinId,
      built.data,
      {
        businessId:
          built.data.businessId,
        twinType:
          built.data.twinType
      }
    );

    await runtime.emit(
      "dt.twin_instance.created",
      stored.data
    );

    return stored;
  }

  async function transitionTwin({
    twinId,
    to,
    reason = ""
  } = {}) {
    const found =
      await global.INFINICUS.DT
        .twinRegistryStore
        .get("twins", twinId);

    if (!found.ok) return found;

    const from =
      found.data.lifecycleState;

    if (!runtime.lifecycle.mayTransition(from, to)) {
      return runtime.failure(
        "TWIN_LIFECYCLE_TRANSITION_INVALID",
        `Twin cannot transition from ${from} to ${to}.`
      );
    }

    const updated = {
      ...found.data,
      lifecycleState:
        String(to),
      lifecycleHistory: [
        ...found.data.lifecycleHistory,
        {
          from,
          to:
            String(to),
          reason:
            String(reason || ""),
          changedAt:
            new Date().toISOString()
        }
      ],
      updatedAt:
        new Date().toISOString()
    };

    const stored =
      await global.INFINICUS.DT
        .twinRegistryStore
        .put("twins", updated);

    if (stored.ok) {
      await runtime.emit(
        "dt.twin_instance.transitioned",
        {
          twinId,
          from,
          to,
          reason
        }
      );
    }

    return stored;
  }

  async function prepareSchemaHandoff({
    twinId
  } = {}) {
    const twin =
      await global.INFINICUS.DT
        .twinRegistryStore
        .get("twins", twinId);

    if (!twin.ok) return twin;

    const business =
      await global.INFINICUS.DT
        .twinRegistryStore
        .get(
          "businesses",
          twin.data.businessId
        );

    if (!business.ok) return business;

    const children =
      await global.INFINICUS.DT
        .twinRegistryStore
        .listByIndex(
          "twins",
          "parentTwinId",
          twinId
        );

    if (!children.ok) return children;

    const handoff = {
      schemaHandoffId:
        runtime.createId("dt_schema_handoff"),
      targetBlock: "DT-03",
      business:
        runtime.clone(business.data),
      twin:
        runtime.clone(twin.data),
      childTwins:
        children.data.map(runtime.clone),
      requestedSchemaVersion:
        "1.0.0",
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    const stored =
      await global.INFINICUS.DT
        .twinRegistryStore
        .put("schema_handoffs", handoff);

    if (stored.ok) {
      await runtime.emit(
        "dt.schema_handoff.prepared",
        stored.data
      );
    }

    return stored;
  }

  const api = Object.freeze({
    registerBusiness,
    createTwin,
    transitionTwin,
    prepareSchemaHandoff,
    getBusiness: ({ businessId }) =>
      global.INFINICUS.DT
        .twinRegistryStore
        .get("businesses", businessId),
    getBusinessByKey: ({ businessKey }) =>
      global.INFINICUS.DT
        .twinRegistryStore
        .getByIndex(
          "businesses",
          "businessKey",
          global.INFINICUS.DT
            .businessIdentityModel
            .normalizeKey(businessKey)
        ),
    getTwin: ({ twinId }) =>
      global.INFINICUS.DT
        .twinRegistryStore
        .get("twins", twinId),
    getTwinByKey: ({ twinKey }) =>
      global.INFINICUS.DT
        .twinRegistryStore
        .getByIndex(
          "twins",
          "twinKey",
          global.INFINICUS.DT
            .businessIdentityModel
            .normalizeKey(twinKey)
        ),
    listBusinessTwins: ({ businessId }) =>
      global.INFINICUS.DT
        .twinRegistryStore
        .listByIndex(
          "twins",
          "businessId",
          businessId
        ),
    getSchemaHandoff: ({ schemaHandoffId }) =>
      global.INFINICUS.DT
        .twinRegistryStore
        .get(
          "schema_handoffs",
          schemaHandoffId
        )
  });

  runtime.registerService(
    "dt.twin_instance_registry",
    api,
    { block: "DT-02" }
  );

  runtime.registerRoute(
    "dt.business_identity.register",
    registerBusiness
  );

  runtime.registerRoute(
    "dt.twin_instance.create",
    createTwin
  );

  runtime.registerRoute(
    "dt.twin_instance.transition",
    transitionTwin
  );

  runtime.registerRoute(
    "dt.schema_handoff.prepare",
    prepareSchemaHandoff
  );

  global.INFINICUS.DT.twinInstanceRegistry = api;
})(window);
