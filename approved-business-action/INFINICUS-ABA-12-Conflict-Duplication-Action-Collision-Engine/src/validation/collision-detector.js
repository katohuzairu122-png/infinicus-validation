(function(global){
  "use strict";

  function windowsOverlap(left={},right={}){
    const leftStart = left.startsAt
      ? new Date(left.startsAt).getTime()
      : -Infinity;

    const leftEnd = left.endsAt
      ? new Date(left.endsAt).getTime()
      : Infinity;

    const rightStart = right.startsAt
      ? new Date(right.startsAt).getTime()
      : -Infinity;

    const rightEnd = right.endsAt
      ? new Date(right.endsAt).getTime()
      : Infinity;

    return leftStart <= rightEnd && rightStart <= leftEnd;
  }

  function sameTarget(left,right){
    return (
      left?.targetId &&
      right?.targetId &&
      left.targetId === right.targetId
    );
  }

  function parameterContradictions(left={},right={}){
    const contradictions=[];

    for(const key of Object.keys(left)){
      if(
        Object.prototype.hasOwnProperty.call(right,key) &&
        JSON.stringify(left[key]) !== JSON.stringify(right[key])
      ){
        contradictions.push(key);
      }
    }

    return contradictions;
  }

  function allocationCollisions(left={},right={}){
    const collisions=[];

    for(const resourceType of [
      "budget",
      "workforceHours",
      "inventoryUnits",
      "capacityUnits"
    ]){
      const leftValue = Number(left[resourceType] || 0);
      const rightValue = Number(right[resourceType] || 0);

      if(leftValue > 0 && rightValue > 0){
        collisions.push({
          resourceType,
          combined:leftValue+rightValue
        });
      }
    }

    return collisions;
  }

  function detect(candidate,activeActions){
    const conflicts=[];

    for(const active of activeActions){
      if(active.state==="cancelled" || active.state==="completed"){
        continue;
      }

      const overlap = windowsOverlap(
        candidate.executionWindow,
        active.executionWindow
      );

      if(!overlap) continue;

      const duplicate = (
        candidate.actionTypeId === active.actionTypeId &&
        sameTarget(candidate.target,active.target) &&
        JSON.stringify(candidate.parameters) === JSON.stringify(active.parameters)
      );

      if(duplicate){
        conflicts.push({
          type:"duplicate",
          severity:"high",
          conflictingActionInstanceId:active.actionInstanceId,
          message:"An equivalent action already exists in an overlapping window."
        });
      }

      if(
        sameTarget(candidate.target,active.target) &&
        candidate.actionTypeId !== active.actionTypeId
      ){
        conflicts.push({
          type:"target_collision",
          severity:"high",
          conflictingActionInstanceId:active.actionInstanceId,
          message:"Different actions target the same entity in an overlapping window."
        });
      }

      const contradictions = parameterContradictions(
        candidate.parameters,
        active.parameters
      );

      if(
        sameTarget(candidate.target,active.target) &&
        contradictions.length
      ){
        conflicts.push({
          type:"parameter_contradiction",
          severity:"high",
          conflictingActionInstanceId:active.actionInstanceId,
          parameters:contradictions,
          message:"Action parameters contradict an overlapping action."
        });
      }

      const allocations = allocationCollisions(
        candidate.allocations,
        active.allocations
      );

      for(const collision of allocations){
        conflicts.push({
          type:"allocation_collision",
          severity:"medium",
          conflictingActionInstanceId:active.actionInstanceId,
          ...collision,
          message:`Potential ${collision.resourceType} allocation collision.`
        });
      }

      const incompatible = (candidate.operations || [])
        .filter(operation =>
          (active.operations || []).includes(`not:${operation}`) ||
          (candidate.operations || []).includes(`not:${operation}`)
        );

      if(incompatible.length){
        conflicts.push({
          type:"operation_collision",
          severity:"critical",
          conflictingActionInstanceId:active.actionInstanceId,
          operations:incompatible,
          message:"Mutually exclusive operations overlap."
        });
      }
    }

    return {
      conflictFree:
        conflicts.length===0,
      conflicts
    };
  }

  global.INFINICUS.ABA.actionCollisionDetector =
    Object.freeze({
      windowsOverlap,
      sameTarget,
      parameterContradictions,
      allocationCollisions,
      detect
    });
})(window);
