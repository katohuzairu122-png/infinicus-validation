(function(global){
  "use strict";

  function validate({
    actor,
    task,
    currentAssignments,
    unavailablePeriods=[],
    separationRules=[],
    relatedAssignments=[]
  }){
    const issues=[];

    if(!actor || actor.status!=="active"){
      issues.push("Actor is not active.");
    }

    const actorCapabilities =
      new Set(actor?.capabilityCodes || []);

    for(const capability of task.requiredCapabilities || []){
      if(!actorCapabilities.has(capability)){
        issues.push(`Actor lacks required capability: ${capability}`);
      }
    }

    const activeCount =
      currentAssignments.filter(item =>
        !["completed","cancelled","rejected"].includes(item.state)
      ).length;

    if(
      actor &&
      activeCount >= actor.maximumConcurrentTasks
    ){
      issues.push("Actor workload limit has been reached.");
    }

    const now = Date.now();

    for(const period of unavailablePeriods){
      const start =
        new Date(period.startsAt).getTime();

      const end =
        new Date(period.endsAt).getTime();

      if(now >= start && now <= end){
        issues.push("Actor is currently unavailable.");
      }
    }

    for(const rule of separationRules){
      if(
        rule.taskCode === task.code &&
        relatedAssignments.some(item =>
          item.actorId === actor.actorId &&
          rule.incompatibleTaskCodes.includes(item.taskCode)
        )
      ){
        issues.push("Separation-of-duties rule prevents assignment.");
      }
    }

    return {
      eligible:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.assignmentValidator =
    Object.freeze({validate});
})(window);
