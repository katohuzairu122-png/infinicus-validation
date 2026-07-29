(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function registerPolicy(input = {}) {
    const built =
      global.INFINICUS.DT
        .intakePolicyModel
        .create(input);

    if (!built.ok) return built;

    return global.INFINICUS.DT
      .intakeStore
      .put("policies", built.data);
  }

  async function intake({
    intakeHandoffId,
    digitalTwinHandoff,
    intakePolicyId
  } = {}) {
    const intakeContext =
      await global.INFINICUS.DT
        .schemaOntologyEngine
        .getIntakeHandoff({
          intakeHandoffId
        });

    if (!intakeContext.ok) {
      return intakeContext;
    }

    const policy =
      await global.INFINICUS.DT
        .intakeStore
        .get("policies", intakePolicyId);

    if (!policy.ok) return policy;

    const validation =
      global.INFINICUS.DT
        .intelligencePackageValidator
        .validate({
          handoff:
            digitalTwinHandoff,
          intakeContext:
            intakeContext.data,
          policy:
            policy.data
        });

    const sourceValidation =
      global.INFINICUS.DT
        .stateSourceClassifier
        .validate(
          [
            ...(digitalTwinHandoff.domainStates || []),
            ...(digitalTwinHandoff.metricStates || []),
            ...(digitalTwinHandoff.signalStates || [])
          ],
          policy.data.allowedStateSources
        );

    const ontologyMapping =
      global.INFINICUS.DT
        .intelligenceOntologyMapper
        .mapPackage(
          digitalTwinHandoff,
          intakeContext.data.ontology
        );

    const issues = [
      ...validation.issues,
      ...(
        sourceValidation.valid
          ? []
          : sourceValidation.disallowed.map(
              item =>
                `Disallowed state source: ${item.sourceType}`
            )
      )
    ];

    if (ontologyMapping.mappingRate < 0.5) {
      issues.push(
        "Less than 50% of intelligence states map to ontology entity types."
      );
    }

    const accepted =
      issues.length === 0;

    const intakeRun = {
      intakeRunId:
        runtime.createId("dt_intake_run"),
      intakeHandoffId,
      digitalTwinHandoffId:
        digitalTwinHandoff.digitalTwinHandoffId || null,
      publicationId:
        digitalTwinHandoff.publicationId || null,
      intelligencePackageId:
        digitalTwinHandoff.intelligencePackageId || null,
      businessId:
        digitalTwinHandoff.businessId || null,
      twinId:
        intakeContext.data.twin.twinId,
      ontologyId:
        intakeContext.data.ontology.ontologyId,
      intakePolicyId,
      validation: {
        package:
          runtime.clone(validation),
        stateSources:
          runtime.clone(sourceValidation),
        ontologyMapping:
          runtime.clone(ontologyMapping)
      },
      status:
        accepted ? "accepted" : "quarantined",
      issues,
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .intakeStore
      .put("intake_runs", intakeRun);

    if (!accepted) {
      const quarantine = {
        quarantineRecordId:
          runtime.createId("dt_quarantine"),
        intakeRunId:
          intakeRun.intakeRunId,
        digitalTwinHandoff:
          runtime.clone(digitalTwinHandoff),
        issues,
        status:
          "awaiting_review",
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.DT
        .intakeStore
        .put("quarantine", quarantine);

      await runtime.emit(
        "dt.intelligence_package.quarantined",
        quarantine
      );

      return runtime.failure(
        "INTELLIGENCE_PACKAGE_QUARANTINED",
        "The intelligence package failed intake validation.",
        {
          intakeRun,
          quarantine
        }
      );
    }

    const acceptedPackage = {
      acceptedPackageId:
        runtime.createId("dt_accepted_package"),
      intakeRunId:
        intakeRun.intakeRunId,
      digitalTwinHandoffId:
        digitalTwinHandoff.digitalTwinHandoffId,
      publicationId:
        digitalTwinHandoff.publicationId,
      intelligencePackageId:
        digitalTwinHandoff.intelligencePackageId,
      businessId:
        digitalTwinHandoff.businessId,
      twinId:
        intakeContext.data.twin.twinId,
      ontologyId:
        intakeContext.data.ontology.ontologyId,
      package:
        runtime.clone(digitalTwinHandoff),
      classifiedStates:
        sourceValidation.classified.map(runtime.clone),
      mappedStates:
        ontologyMapping.mapped.map(runtime.clone),
      unmappedStates:
        ontologyMapping.unmapped.map(runtime.clone),
      acceptedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .intakeStore
      .put(
        "accepted_packages",
        acceptedPackage
      );

    const entityGraphHandoff = {
      entityGraphHandoffId:
        runtime.createId("dt_entity_graph_handoff"),
      targetBlock: "DT-05",
      intakeRunId:
        intakeRun.intakeRunId,
      acceptedPackageId:
        acceptedPackage.acceptedPackageId,
      businessId:
        acceptedPackage.businessId,
      twinId:
        acceptedPackage.twinId,
      ontologyId:
        acceptedPackage.ontologyId,
      ontology:
        runtime.clone(intakeContext.data.ontology),
      businessState:
        runtime.clone(digitalTwinHandoff.businessState),
      domainStates:
        digitalTwinHandoff.domainStates.map(runtime.clone),
      metricStates:
        digitalTwinHandoff.metricStates.map(runtime.clone),
      signalStates:
        digitalTwinHandoff.signalStates.map(runtime.clone),
      lineage:
        digitalTwinHandoff.lineage.map(runtime.clone),
      confidence:
        runtime.clone(digitalTwinHandoff.confidence),
      freshness:
        runtime.clone(digitalTwinHandoff.freshness),
      correlationId:
        digitalTwinHandoff.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .intakeStore
      .put(
        "entity_graph_handoffs",
        entityGraphHandoff
      );

    await runtime.emit(
      "dt.intelligence_package.accepted",
      {
        intakeRun,
        entityGraphHandoffId:
          entityGraphHandoff.entityGraphHandoffId
      }
    );

    return runtime.success({
      intakeRun,
      acceptedPackage,
      entityGraphHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    intake,
    getIntakeRun: ({ intakeRunId }) =>
      global.INFINICUS.DT
        .intakeStore
        .get("intake_runs", intakeRunId),
    getAcceptedPackage: ({ acceptedPackageId }) =>
      global.INFINICUS.DT
        .intakeStore
        .get(
          "accepted_packages",
          acceptedPackageId
        ),
    getEntityGraphHandoff: ({ entityGraphHandoffId }) =>
      global.INFINICUS.DT
        .intakeStore
        .get(
          "entity_graph_handoffs",
          entityGraphHandoffId
        ),
    listQuarantine: () =>
      global.INFINICUS.DT
        .intakeStore
        .list("quarantine")
  });

  runtime.registerService(
    "dt.intelligence_intake",
    api,
    { block: "DT-04" }
  );

  runtime.registerRoute(
    "dt.intake_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "dt.intelligence_package.intake",
    intake
  );

  global.INFINICUS.DT.intelligenceIntakeEngine = api;
})(window);
