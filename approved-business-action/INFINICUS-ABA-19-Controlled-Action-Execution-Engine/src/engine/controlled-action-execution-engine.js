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
