(function(global){
  "use strict";

  function scoreObservation(observation,policy){
    const issues=[];
    let completeness=1;
    let freshness=1;
    let consistency=1;
    let evidence=1;
    let reliability=1;

    if(observation.value===undefined){
      issues.push("Observation value is missing.");
      completeness=0;
    }

    if(!observation.metricId){
      issues.push("Metric ID is missing.");
      completeness-=0.25;
    }

    if(!observation.observationSourceId){
      issues.push("Observation source ID is missing.");
      completeness-=0.25;
    }

    if(!observation.sourceTimestamp){
      issues.push("Source timestamp is missing.");
      completeness-=0.25;
      freshness=0;
    }

    if(
      policy.requireObservedClassification &&
      observation.classification!=="observed"
    ){
      issues.push("Observation classification is not observed.");
      consistency=0;
    }

    if(
      policy.requireRawEvidence &&
      observation.rawEvidence==null
    ){
      issues.push("Raw evidence is missing.");
      evidence=0;
    }

    if(observation.sourceTimestamp){
      const sourceTime=new Date(observation.sourceTimestamp).getTime();
      const collectedTime=new Date(observation.collectedAt).getTime();
      const skewMinutes=(sourceTime-collectedTime)/60000;

      if(
        policy.rejectFutureTimestamps &&
        skewMinutes > policy.maximumClockSkewMinutes
      ){
        issues.push("Source timestamp is unacceptably in the future.");
        freshness=0;
      }
    }

    if(!Array.isArray(observation.lineage) || !observation.lineage.length){
      issues.push("Observation lineage is missing.");
      reliability-=0.4;
    }

    if(Number(observation.confidence ?? 0)<0.5){
      issues.push("Observation confidence is low.");
      reliability-=0.3;
    }

    completeness=Math.max(0,Math.min(1,completeness));
    reliability=Math.max(0,Math.min(1,reliability));

    const qualityScore=
      (
        completeness * 0.25 +
        freshness * 0.20 +
        consistency * 0.20 +
        evidence * 0.20 +
        reliability * 0.15
      );

    return {
      valid:
        issues.length===0 &&
        qualityScore>=policy.minimumQualityScore &&
        reliability>=policy.minimumReliabilityScore,
      qualityScore:Number(qualityScore.toFixed(4)),
      reliabilityScore:Number(reliability.toFixed(4)),
      components:{
        completeness,
        freshness,
        consistency,
        evidence,
        reliability
      },
      issues
    };
  }

  global.INFINICUS.OM.observationEvidenceValidator=
    Object.freeze({scoreObservation});
})(window);
