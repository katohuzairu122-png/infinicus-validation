(function(global){
  "use strict";

  function extract({
    handoff,
    policy,
    context={}
  }={}){
    const lessons=[];
    const successFactors=[];
    const failureFactors=[];
    const hypotheses=[];
    const limitations=[];

    const highConfidence=
      Number(handoff.confidence ?? 0) >=
      policy.minimumConfidence;

    const highReliability=
      Number(handoff.reliability ?? 0) >=
      policy.minimumReliability;

    for(const comparison of handoff.comparisons || []){
      if(comparison.outcomeStatus==="achieved"){
        successFactors.push({
          metricId:comparison.metricId,
          type:"target_achievement",
          evidenceReference:
            comparison.expectedActualComparisonId,
          confidence:
            comparison.adjustedConfidence
        });
      }

      if(
        ["underperforming","failed"].includes(
          comparison.outcomeStatus
        )
      ){
        failureFactors.push({
          metricId:comparison.metricId,
          type:"target_underperformance",
          evidenceReference:
            comparison.expectedActualComparisonId,
          confidence:
            comparison.adjustedConfidence
        });
      }
    }

    for(const benefit of handoff.benefitAssessments || []){
      lessons.push({
        learningItemId:
          `benefit_${benefit.benefitRealizationAssessmentId}`,
        category:"benefit_realization",
        metricId:benefit.metricId,
        statement:
          benefit.status==="realized"
            ? "The monitored action produced a realized benefit."
            : benefit.status==="partially_realized"
              ? "The monitored action produced only part of the expected benefit."
              : "The expected benefit was not demonstrated.",
        evidenceReference:
          benefit.benefitRealizationAssessmentId,
        evidenceType:"factual",
        confidence:
          Math.min(
            Number(benefit.confidenceScore ?? 0),
            Number(benefit.reliabilityScore ?? 0)
          )
      });
    }

    for(const adverse of handoff.adverseOutcomes || []){
      lessons.push({
        learningItemId:
          `adverse_${adverse.adverseOutcomeDetectionId}`,
        category:"adverse_outcome",
        metricId:adverse.metricId,
        statement:
          "The action was associated with a material adverse outcome that must influence future decisions.",
        evidenceReference:
          adverse.adverseOutcomeDetectionId,
        evidenceType:
          adverse.causationClassification==="strong_causal_support"
            ? "factual"
            : "contextual",
        confidence:
          adverse.confidence
      });
    }

    for(const exception of handoff.monitoringExceptions || []){
      if(!["resolved","waived"].includes(exception.state)){
        limitations.push(
          `Unresolved monitoring exception: ${exception.exceptionType}`
        );
      }
    }

    if(!highConfidence){
      limitations.push(
        "Outcome confidence is below the preferred learning threshold."
      );
    }

    if(!highReliability){
      limitations.push(
        "Outcome reliability is below the preferred learning threshold."
      );
    }

    if(
      policy.allowHypotheses &&
      handoff.verdict==="inconclusive"
    ){
      hypotheses.push({
        hypothesisId:"hypothesis_inconclusive_outcome",
        statement:
          "Additional observations may resolve the inconclusive outcome.",
        evidenceScope:"current_monitoring_contract",
        confidence:
          Math.min(
            Number(handoff.confidence ?? 0),
            Number(handoff.reliability ?? 0)
          )
      });
    }

    return {
      lessons,
      successFactors,
      failureFactors,
      hypotheses,
      limitations,
      applicabilityScope:
        context.applicabilityScope ||
        "same business, same action class, comparable operating conditions"
    };
  }

  global.INFINICUS.OM.lessonExtractor=
    Object.freeze({extract});
})(window);
