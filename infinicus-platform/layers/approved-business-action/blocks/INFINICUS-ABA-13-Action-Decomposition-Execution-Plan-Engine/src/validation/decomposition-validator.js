(function(global){
  "use strict";

  function detectCycles(tasks){
    const byId = new Map(tasks.map(task=>[task.executionTaskId,task]));
    const visiting = new Set();
    const visited = new Set();

    function visit(id){
      if(visiting.has(id)) return true;
      if(visited.has(id)) return false;

      visiting.add(id);

      const task = byId.get(id);

      for(const dependencyId of task?.dependencies || []){
        if(!byId.has(dependencyId)) continue;
        if(visit(dependencyId)) return true;
      }

      visiting.delete(id);
      visited.add(id);
      return false;
    }

    return tasks.some(task=>visit(task.executionTaskId));
  }

  function validate(tasks){
    const issues=[];
    const ids = new Set(tasks.map(task=>task.executionTaskId));

    if(!tasks.length){
      issues.push("Execution plan must contain at least one task.");
    }

    for(const task of tasks){
      if(!task.name || !task.code){
        issues.push(`Task identity is incomplete: ${task.executionTaskId}`);
      }

      for(const dependencyId of task.dependencies || []){
        if(!ids.has(dependencyId)){
          issues.push(
            `Unknown dependency ${dependencyId} for task ${task.executionTaskId}`
          );
        }
      }

      if(!task.completionCriteria.length){
        issues.push(
          `Task lacks completion criteria: ${task.executionTaskId}`
        );
      }
    }

    if(detectCycles(tasks)){
      issues.push("Execution plan contains a circular dependency.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  function calculateCriticalPath(tasks){
    const byId = new Map(tasks.map(task=>[task.executionTaskId,task]));
    const memo = new Map();

    function durationTo(id){
      if(memo.has(id)) return memo.get(id);

      const task = byId.get(id);

      if(!task) return 0;

      const dependencyDuration =
        Math.max(
          0,
          ...(task.dependencies || []).map(durationTo)
        );

      const total =
        dependencyDuration +
        Number(task.durationMinutes || 0);

      memo.set(id,total);
      return total;
    }

    const durations = tasks.map(task=>({
      executionTaskId:task.executionTaskId,
      totalMinutes:durationTo(task.executionTaskId)
    }));

    const maximum =
      Math.max(0,...durations.map(item=>item.totalMinutes));

    return {
      totalDurationMinutes:maximum,
      terminalTasks:
        durations
          .filter(item=>item.totalMinutes===maximum)
          .map(item=>item.executionTaskId)
    };
  }

  global.INFINICUS.ABA.decompositionValidator =
    Object.freeze({
      detectCycles,
      validate,
      calculateCriticalPath
    });
})(window);
