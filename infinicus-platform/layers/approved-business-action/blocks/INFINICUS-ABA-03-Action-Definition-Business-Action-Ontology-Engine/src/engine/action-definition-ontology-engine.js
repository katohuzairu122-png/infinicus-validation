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
