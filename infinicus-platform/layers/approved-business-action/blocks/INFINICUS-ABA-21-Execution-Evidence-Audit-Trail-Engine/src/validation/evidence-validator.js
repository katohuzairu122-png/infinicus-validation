(function(global){
  "use strict";

  function validateHandoff(handoff){
    const issues=[];

    if(!handoff.executionEvidenceHandoffId){
      issues.push("Execution evidence handoff ID is required.");
    }

    if(!handoff.executionPlanId){
      issues.push("Execution plan ID is required.");
    }

    if(!Array.isArray(handoff.completedResults)){
      issues.push("Completed execution results must be an array.");
    }

    if(!Array.isArray(handoff.classifiedFailures)){
      issues.push("Classified failures must be an array.");
    }

    if(!Array.isArray(handoff.rollbackAttempts)){
      issues.push("Rollback attempts must be an array.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  function verify(record,expectedChecksum,checksum){
    const calculatedChecksum=checksum.hash(record);

    return {
      valid:calculatedChecksum===expectedChecksum,
      expectedChecksum,
      calculatedChecksum
    };
  }

  global.INFINICUS.ABA.executionEvidenceValidator=
    Object.freeze({validateHandoff,verify});
})(window);
