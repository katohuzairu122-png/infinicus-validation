(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerFactor(input={}){
    const built=
      global.INFINICUS.OM.externalFactorModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.externalFactorStore.put(
      "factors",
      built.data
    );
  }

  async function evaluate({
    externalFactorHandoffId,
    factorContextsByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.causationAssessmentEngine
        .getExternalFactorHandoff({
          externalFactorHandoffId
        });

    if(!handoff.ok) return handoff;

    const factors=
      await global.INFINICUS.OM.externalFactorStore.list(
        "factors"
      );

    if(!factors.ok) return factors;

    const factorAssessments=[];
    const confounders=[];

    for(const causation of handoff.data.causationAssessments){
      const context=
        factorContextsByMetric[causation.metricId] || {};

      for(const factor of factors.data){
        if(
          factor.affectedMetricIds.length &&
          !factor.affectedMetricIds.includes(causation.metricId)
        ){
          continue;
        }

        const overlap=
          global.INFINICUS.OM.confounderScorer.overlapScore({
            factorStartsAt:factor.startsAt,
            factorEndsAt:factor.endsAt,
            outcomeStartsAt:context.outcomeStartsAt,
            outcomeEndsAt:context.outcomeEndsAt
          });

        const scored=
          global.INFINICUS.OM.confounderScorer.score({
            factor,
            overlap,
            scopeAlignment:
              context.scopeAlignmentByFactor?.[factor.externalFactorId] ?? 0,
            mechanismStrength:
              context.mechanismStrengthByFactor?.[factor.externalFactorId] ?? 0
          });

        const assessment={
          externalFactorAssessmentId:
            runtime.createId("om_external_factor_assessment"),
          monitoringContractId:
            handoff.data.monitoringContractId,
          metricId:
            causation.metricId,
          causationAssessmentId:
            causation.causationAssessmentId,
          externalFactorId:
            factor.externalFactorId,
          overlapScore:
            Number(overlap.toFixed(4)),
          materiality:
            scored.materiality,
          classification:
            scored.classification,
          direction:
            factor.direction,
          confidence:
            Math.min(
              factor.confidence,
              causation.confidence,
              handoff.data.confidence
            ),
          evidence:
            factor.evidence.map(runtime.clone),
          correlationId:
            handoff.data.correlationId,
          lineage:[
            ...handoff.data.lineage.map(runtime.clone),
            ...factor.lineage.map(runtime.clone)
          ],
          assessedAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.externalFactorStore.put(
          "assessments",
          assessment
        );

        factorAssessments.push(assessment);

        if(
          ["material_confounder","major_confounder"].includes(
            scored.classification
          )
        ){
          const confounder={
            confounderAssessmentId:
              runtime.createId("om_confounder"),
            monitoringContractId:
              handoff.data.monitoringContractId,
            metricId:
              causation.metricId,
            causationAssessmentId:
              causation.causationAssessmentId,
            externalFactorAssessmentId:
              assessment.externalFactorAssessmentId,
            externalFactorId:
              factor.externalFactorId,
            materiality:
              assessment.materiality,
            classification:
              assessment.classification,
            direction:
              assessment.direction,
            recommendedAdjustment:
              Number(
                (
                  assessment.materiality *
                  (
                    assessment.direction==="positive"
                      ? -1
                      : assessment.direction==="negative"
                        ? 1
                        : 0
                  )
                ).toFixed(4)
              ),
            confidence:
              assessment.confidence,
            status:"active",
            createdAt:new Date().toISOString()
          };

          await global.INFINICUS.OM.externalFactorStore.put(
            "confounders",
            confounder
          );

          confounders.push(confounder);
        }
      }
    }

    const residualConfoundingScore=
      confounders.length
        ? Number(
            (
              confounders.reduce(
                (sum,item)=>sum+item.materiality*item.confidence,
                0
              ) / confounders.length
            ).toFixed(4)
          )
        : 0;

    const comparisonHandoff={
      expectedActualComparisonHandoffId:
        runtime.createId("om_expected_actual_handoff"),
      targetBlock:"OM-16",
      monitoringContractId:
        handoff.data.monitoringContractId,
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      externalFactorAssessments:
        factorAssessments.map(runtime.clone),
      confounders:
        confounders.map(runtime.clone),
      residualConfoundingScore,
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      alerts:
        handoff.data.alerts.map(runtime.clone),
      thresholdBreaches:
        handoff.data.thresholdBreaches.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        Math.max(
          0,
          Number(
            (
              handoff.data.confidence *
              (1-Math.min(1,residualConfoundingScore))
            ).toFixed(4)
          )
        ),
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.externalFactorStore.put(
      "comparison_handoffs",
      comparisonHandoff
    );

    await runtime.emit(
      "om.external_factors.evaluated",
      {
        factorAssessmentCount:
          factorAssessments.length,
        confounderCount:
          confounders.length,
        expectedActualComparisonHandoffId:
          comparisonHandoff.expectedActualComparisonHandoffId
      }
    );

    return runtime.success({
      externalFactorAssessments:factorAssessments,
      confounders,
      residualConfoundingScore,
      expectedActualComparisonHandoff:comparisonHandoff
    });
  }

  const api=Object.freeze({
    registerFactor,
    evaluate,
    getFactor:({externalFactorId}) =>
      global.INFINICUS.OM.externalFactorStore.get(
        "factors",
        externalFactorId
      ),
    getExpectedActualComparisonHandoff:({
      expectedActualComparisonHandoffId
    }) =>
      global.INFINICUS.OM.externalFactorStore.get(
        "comparison_handoffs",
        expectedActualComparisonHandoffId
      ),
    listFactors:() =>
      global.INFINICUS.OM.externalFactorStore.list("factors"),
    listConfounders:() =>
      global.INFINICUS.OM.externalFactorStore.list("confounders")
  });

  runtime.registerService(
    "om.external_factor_confounder",
    api,
    {block:"OM-15"}
  );

  runtime.registerRoute(
    "om.external_factor.register",
    registerFactor
  );

  runtime.registerRoute(
    "om.external_factors.evaluate",
    evaluate
  );

  global.INFINICUS.OM.externalFactorConfounderEngine=api;
})(window);
