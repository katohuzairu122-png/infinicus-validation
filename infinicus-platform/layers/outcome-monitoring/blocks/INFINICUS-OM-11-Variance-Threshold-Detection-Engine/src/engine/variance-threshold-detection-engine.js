(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const latestBreachByMetric=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.varianceThresholdPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.varianceThresholdStore.put(
      "policies",
      built.data
    );
  }

  function shouldSuppress(metricId,severity,minutes){
    const key=`${metricId}:${severity}`;
    const previous=latestBreachByMetric.get(key);

    if(!previous){
      return false;
    }

    return (
      Date.now() -
      new Date(previous).getTime()
    ) < minutes*60000;
  }

  async function detectVariances({
    varianceThresholdHandoffId,
    varianceThresholdPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeProgressCalculationEngine
        .getVarianceThresholdHandoff({
          varianceThresholdHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.varianceThresholdStore.get(
        "policies",
        varianceThresholdPolicyId
      );

    if(!policy.ok) return policy;

    const variances=[];
    const breaches=[];
    const suppressions=[];

    for(const progress of handoff.data.progressRecords){
      const target=
        handoff.data.targets.find(
          item=>item.metricId===progress.metricId
        );

      if(!target){
        return runtime.failure(
          "OM_VARIANCE_TARGET_MISSING",
          `Target missing for metric: ${progress.metricId}`
        );
      }

      const detected=
        global.INFINICUS.OM.varianceDetector.detect({
          progress,
          target,
          policy:policy.data
        });

      if(!detected.valid){
        return runtime.failure(
          "OM_VARIANCE_DETECTION_FAILED",
          "Variance detection failed.",
          {
            metricId:progress.metricId,
            issues:detected.issues
          }
        );
      }

      const variance={
        varianceDetectionId:
          runtime.createId("om_variance_detection"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:progress.metricId,
        outcomeProgressId:
          progress.outcomeProgressId,
        baselineDefinitionId:
          progress.baselineDefinitionId,
        targetDefinitionId:
          progress.targetDefinitionId,
        metricAggregateId:
          progress.metricAggregateId,
        baselineVariance:
          detected.baselineVariance,
        targetVariance:
          detected.targetVariance,
        baselineVariancePercent:
          detected.baselineVariancePercent,
        targetVariancePercent:
          detected.targetVariancePercent,
        rangeBreach:
          detected.rangeBreach,
        toleranceBreach:
          detected.toleranceBreach,
        severity:
          detected.severity,
        breached:
          detected.breached,
        classification:"calculated",
        confidence:
          Math.min(
            progress.confidence,
            handoff.data.confidence
          ),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...progress.lineage.map(runtime.clone),
          {
            sourceType:"outcome_progress",
            sourceId:progress.outcomeProgressId
          }
        ],
        detectedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.varianceThresholdStore.put(
        "variance_records",
        variance
      );

      variances.push(variance);

      if(!variance.breached){
        continue;
      }

      if(
        variance.confidence <
        policy.data.minimumConfidence
      ){
        const suppression={
          thresholdSuppressionId:
            runtime.createId("om_threshold_suppression"),
          metricId:variance.metricId,
          varianceDetectionId:
            variance.varianceDetectionId,
          reason:"low_confidence",
          confidence:variance.confidence,
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.varianceThresholdStore.put(
          "suppressions",
          suppression
        );

        suppressions.push(suppression);
        continue;
      }

      if(
        shouldSuppress(
          variance.metricId,
          variance.severity,
          policy.data.suppressDuplicateMinutes
        )
      ){
        const suppression={
          thresholdSuppressionId:
            runtime.createId("om_threshold_suppression"),
          metricId:variance.metricId,
          varianceDetectionId:
            variance.varianceDetectionId,
          reason:"duplicate_window",
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.varianceThresholdStore.put(
          "suppressions",
          suppression
        );

        suppressions.push(suppression);
        continue;
      }

      const breach={
        thresholdBreachId:
          runtime.createId("om_threshold_breach"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:variance.metricId,
        varianceDetectionId:
          variance.varianceDetectionId,
        outcomeProgressId:
          variance.outcomeProgressId,
        severity:variance.severity,
        breachTypes:[
          variance.rangeBreach ? "acceptable_range" : null,
          variance.toleranceBreach ? "tolerance" : null,
          progress.progressRatio <
            policy.data.progressWarningBelow
              ? "progress"
              : null,
          (
            variance.targetVariancePercent!==null &&
            Math.abs(variance.targetVariancePercent) >=
              policy.data.warningVariancePercent
          )
            ? "target_variance"
            : null
        ].filter(Boolean),
        evidence:runtime.clone(variance),
        confidence:variance.confidence,
        correlationId:variance.correlationId,
        lineage:variance.lineage.map(runtime.clone),
        status:"open",
        detectedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.varianceThresholdStore.put(
        "breaches",
        breach
      );

      latestBreachByMetric.set(
        `${breach.metricId}:${breach.severity}`,
        breach.detectedAt
      );

      breaches.push(breach);
    }

    const alertHandoff={
      alertEscalationHandoffId:
        runtime.createId("om_alert_escalation_handoff"),
      targetBlock:"OM-12",
      monitoringContractId:
        handoff.data.monitoringContractId,
      variances:variances.map(runtime.clone),
      thresholdBreaches:
        breaches.map(runtime.clone),
      suppressions:
        suppressions.map(runtime.clone),
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        breaches.length
          ? Number(
              (
                breaches.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / breaches.length
              ).toFixed(4)
            )
          : handoff.data.confidence,
      status:
        breaches.length ? "alert_required" : "normal",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.varianceThresholdStore.put(
      "alert_handoffs",
      alertHandoff
    );

    await runtime.emit(
      "om.variance_thresholds.detected",
      {
        varianceCount:variances.length,
        breachCount:breaches.length,
        suppressionCount:suppressions.length,
        alertEscalationHandoffId:
          alertHandoff.alertEscalationHandoffId
      }
    );

    return runtime.success({
      variances,
      thresholdBreaches:breaches,
      suppressions,
      alertEscalationHandoff:alertHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    detectVariances,
    getAlertEscalationHandoff:({
      alertEscalationHandoffId
    }) =>
      global.INFINICUS.OM.varianceThresholdStore.get(
        "alert_handoffs",
        alertEscalationHandoffId
      ),
    listVariances:() =>
      global.INFINICUS.OM.varianceThresholdStore.list(
        "variance_records"
      ),
    listBreaches:() =>
      global.INFINICUS.OM.varianceThresholdStore.list(
        "breaches"
      ),
    listSuppressions:() =>
      global.INFINICUS.OM.varianceThresholdStore.list(
        "suppressions"
      )
  });

  runtime.registerService(
    "om.variance_threshold_detection",
    api,
    {block:"OM-11"}
  );

  runtime.registerRoute(
    "om.variance_threshold_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.variance_thresholds.detect",
    detectVariances
  );

  global.INFINICUS.OM.varianceThresholdDetectionEngine=api;
})(window);
