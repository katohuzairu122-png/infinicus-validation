(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function score({
    dimensions,
    limitationCount=0,
    restrictionCount=0,
    unclassified=false,
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

    const penalties={
      limitations:
        Math.min(
          1,
          Number(limitationCount || 0) *
          policy.limitationPenalty
        ),
      restrictions:
        Math.min(
          1,
          Number(restrictionCount || 0) *
          policy.restrictionPenalty
        ),
      unclassified:
        unclassified ? policy.unclassifiedPenalty : 0
    };

    const totalPenalty=
      Math.min(
        1,
        penalties.limitations +
        penalties.restrictions +
        penalties.unclassified
      );

    const confidence=
      Math.max(
        0,
        Math.min(1,baseConfidence-totalPenalty)
      );

    const reliability=
      Math.max(
        0,
        Math.min(
          1,
          bounded(dimensions.evidenceReliability)*0.4 +
          bounded(dimensions.provenanceCompleteness)*0.25 +
          bounded(dimensions.lineageCompleteness)*0.2 +
          bounded(dimensions.applicabilityConfidence)*0.15 -
          penalties.restrictions*0.5
        )
      );

    let eligibility="ineligible";

    if(
      confidence>=policy.eligibleThreshold &&
      reliability>=policy.eligibleThreshold
    ){
      eligibility="eligible";
    }else if(
      confidence>=policy.reviewThreshold &&
      reliability>=policy.reviewThreshold
    ){
      eligibility="review_required";
    }

    return {
      baseConfidence:Number(baseConfidence.toFixed(4)),
      penalties,
      totalPenalty:Number(totalPenalty.toFixed(4)),
      confidenceScore:Number(confidence.toFixed(4)),
      reliabilityScore:Number(reliability.toFixed(4)),
      confidenceBand:
        confidence>=0.8
          ? "high"
          : confidence>=0.6
            ? "medium"
            : "low",
      reliabilityBand:
        reliability>=0.8
          ? "high"
          : reliability>=0.6
            ? "medium"
            : "low",
      eligibility
    };
  }

  global.INFINICUS.CL.learningConfidenceScorer=
    Object.freeze({score});
})(window);
