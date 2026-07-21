(function(global){
  "use strict";

  const requiredTerminalFields = [
    "outcomePublication",
    "publicationReceipt",
    "outcomeMonitoringLayerHandoff",
    "continuousLearningHandoff",
    "approvedBusinessActionManifest"
  ];

  function validateTerminalResult(result={}){
    const issues=[];

    for(const field of requiredTerminalFields){
      if(!result[field]){
        issues.push(`Terminal result missing: ${field}`);
      }
    }

    if(
      result.outcomeMonitoringLayerHandoff &&
      result.outcomeMonitoringLayerHandoff.targetLayer!=="OUTCOME_MONITORING"
    ){
      issues.push("Outcome Monitoring handoff target is invalid.");
    }

    if(
      result.continuousLearningHandoff &&
      result.continuousLearningHandoff.targetLayer!=="CONTINUOUS_LEARNING"
    ){
      issues.push("Continuous Learning handoff target is invalid.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.masterHandoffValidator =
    Object.freeze({
      requiredTerminalFields,
      validateTerminalResult
    });
})(window);
