(function(global){
  "use strict";

  function validateDefinition({baseline,target,policy}){
    const issues=[];
    const startsAt=target.effectiveFrom || baseline.effectiveFrom;
    const endsAt=target.effectiveTo || baseline.effectiveTo;
    const cadence=Number(target.reviewCadenceMinutes || 1440);

    if(!startsAt) issues.push("Monitoring start is required.");
    if(!endsAt) issues.push("Monitoring end is required.");

    if(
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ){
      issues.push("Monitoring end must be after start.");
    }

    if(
      cadence < policy.minimumCadenceMinutes ||
      cadence > policy.maximumCadenceMinutes
    ){
      issues.push("Monitoring cadence is outside policy limits.");
    }

    return {
      valid:issues.length===0,
      issues,
      startsAt,
      endsAt,
      cadence
    };
  }

  global.INFINICUS.OM.monitoringScheduleValidator=
    Object.freeze({validateDefinition});
})(window);
