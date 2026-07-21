(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function buildOrganization({
    organizationHandoffId,
    unitInputs = [],
    roleInputs = [],
    positionInputs = []
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .entityRelationshipGraphEngine
        .getOrganizationHandoff({
          organizationHandoffId
        });

    if (!handoff.ok) return handoff;

    const units = [];

    for (const input of unitInputs) {
      const built =
        global.INFINICUS.DT
          .organizationUnitModel
          .create({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      units.push(built.data);

      await global.INFINICUS.DT
        .organizationStore
        .put("units", built.data);
    }

    const roles = [];

    for (const input of roleInputs) {
      const built =
        global.INFINICUS.DT
          .rolePositionModel
          .createRole({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      roles.push(built.data);

      await global.INFINICUS.DT
        .organizationStore
        .put("roles", built.data);
    }

    const positions = [];

    for (const input of positionInputs) {
      const built =
        global.INFINICUS.DT
          .rolePositionModel
          .createPosition({
            ...input,
            twinId:
              handoff.data.twinId
          });

      if (!built.ok) return built;

      positions.push(built.data);
    }

    const reportingValidation =
      global.INFINICUS.DT
        .reportingLineValidator
        .validate(positions);

    if (!reportingValidation.valid) {
      return runtime.failure(
        "REPORTING_STRUCTURE_INVALID",
        "Reporting-line validation failed.",
        reportingValidation
      );
    }

    const unitIds =
      new Set(
        units.map(unit =>
          unit.organizationUnitId
        )
      );

    const roleIds =
      new Set(
        roles.map(role =>
          role.roleId
        )
      );

    const referenceIssues = [];

    for (const position of positions) {
      if (!unitIds.has(position.organizationUnitId)) {
        referenceIssues.push(
          `Unknown organization unit: ${position.organizationUnitId}`
        );
      }

      if (!roleIds.has(position.roleId)) {
        referenceIssues.push(
          `Unknown role: ${position.roleId}`
        );
      }
    }

    if (referenceIssues.length) {
      return runtime.failure(
        "ORGANIZATION_REFERENCE_INVALID",
        "Organization references are invalid.",
        { issues: referenceIssues }
      );
    }

    for (const position of positions) {
      await global.INFINICUS.DT
        .organizationStore
        .put("positions", position);
    }

    const analysis =
      global.INFINICUS.DT
        .organizationAnalyzer
        .analyze(
          units,
          positions
        );

    const organizationChart =
      global.INFINICUS.DT
        .organizationChartBuilder
        .build(
          units,
          positions,
          roles
        );

    const organizationBuild = {
      organizationBuildId:
        runtime.createId("dt_organization_build"),
      organizationHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      unitCount:
        units.length,
      roleCount:
        roles.length,
      positionCount:
        positions.length,
      analysis:
        runtime.clone(analysis),
      organizationChart:
        runtime.clone(organizationChart),
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .organizationStore
      .put(
        "organization_builds",
        organizationBuild
      );

    const financialHandoff = {
      financialHandoffId:
        runtime.createId("dt_financial_handoff"),
      targetBlock: "DT-07",
      organizationBuildId:
        organizationBuild.organizationBuildId,
      businessId:
        organizationBuild.businessId,
      twinId:
        organizationBuild.twinId,
      organizationUnits:
        units.map(runtime.clone),
      roles:
        roles.map(runtime.clone),
      positions:
        positions.map(runtime.clone),
      organizationAnalysis:
        runtime.clone(analysis),
      organizationChart:
        runtime.clone(organizationChart),
      sourceEntities:
        handoff.data.entities.map(runtime.clone),
      sourceRelationships:
        handoff.data.relationships.map(runtime.clone),
      sourceContext:
        runtime.clone(handoff.data.sourceContext),
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .organizationStore
      .put(
        "financial_handoffs",
        financialHandoff
      );

    await runtime.emit(
      "dt.organizational_structure.completed",
      {
        organizationBuild,
        financialHandoffId:
          financialHandoff.financialHandoffId
      }
    );

    return runtime.success({
      organizationBuild,
      units,
      roles,
      positions,
      financialHandoff
    });
  }

  const api = Object.freeze({
    buildOrganization,
    getOrganizationBuild: ({ organizationBuildId }) =>
      global.INFINICUS.DT
        .organizationStore
        .get(
          "organization_builds",
          organizationBuildId
        ),
    getFinancialHandoff: ({ financialHandoffId }) =>
      global.INFINICUS.DT
        .organizationStore
        .get(
          "financial_handoffs",
          financialHandoffId
        ),
    listTwinUnits: ({ twinId }) =>
      global.INFINICUS.DT
        .organizationStore
        .listByTwin("units", twinId),
    listTwinRoles: ({ twinId }) =>
      global.INFINICUS.DT
        .organizationStore
        .listByTwin("roles", twinId),
    listTwinPositions: ({ twinId }) =>
      global.INFINICUS.DT
        .organizationStore
        .listByTwin("positions", twinId)
  });

  runtime.registerService(
    "dt.organizational_structure",
    api,
    { block: "DT-06" }
  );

  runtime.registerRoute(
    "dt.organizational_structure.build",
    buildOrganization
  );

  global.INFINICUS.DT.organizationalStructureEngine = api;
})(window);
