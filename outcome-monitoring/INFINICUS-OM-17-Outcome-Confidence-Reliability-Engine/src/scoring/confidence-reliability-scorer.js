(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function band(value,high,medium){
    if(value>=high) return "high";
    if(value>=medium) return "medium";
    return "low";
  }

  function score({
    dimensions,
    residualConfoundingScore,
    missingEvidenceCount,
    policy
  }={}){
    const totalWeight=
      Object.values(policy.weights).reduce(
        (sum,value)=>sum+Number(value || 0),
        0
      ) || 1;

    const baseConfidence=
      Object.entries(policy.weights).reduce(
        (sum,[key,weight])=>
          sum+bounded(dimensions[key])*Number(weight || 0),
        0
      ) / totalWeight;

    const confounderPenalty=
      bounded(residualConfoundingScore) *
      policy.confounderPenaltyWeight;

    const missingPenalty=
      Math.min(
        1,
        Number(missingEvidenceCount || 0) *
        policy.missingEvidencePenalty
      );

    const confidence=
      Math.max(
        0,
        Math.min(
          1,
          baseConfidence-confounderPenalty-missingPenalty
        )
      );

    const reliability=
      Math.max(
        0,
        Math.min(
          1,
          (
            bounded(dimensions.sourceReliability)*0.35 +
            bounded(dimensions.sampleSufficiency)*0.25 +
            bounded(dimensions.temporalCoverage)*0.2 +
            bounded(dimensions.evidenceCompleteness)*0.2
          ) -
          confounderPenalty*0.5
        )
      );

    return {
      baseConfidence:Number(baseConfidence.toFixed(4)),
      confounderPenalty:Number(confounderPenalty.toFixed(4)),
      missingPenalty:Number(missingPenalty.toFixed(4)),
      confidenceScore:Number(confidence.toFixed(4)),
      reliabilityScore:Number(reliability.toFixed(4)),
      confidenceBand:
        band(
          confidence,
          policy.highThreshold,
          policy.mediumThreshold
        ),
      reliabilityBand:
        band(
          reliability,
          policy.reliabilityHighThreshold,
          policy.reliabilityMediumThreshold
        )
    };
  }

  global.INFINICUS.OM.confidenceReliabilityScorer=
    Object.freeze({score});
})(window);
