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
