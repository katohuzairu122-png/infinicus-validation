(function(global){
  "use strict";

  function topologicalSort(tasks){
    const byId=new Map(tasks.map(task=>[task.executionTaskId,task]));
    const indegree=new Map(tasks.map(task=>[task.executionTaskId,0]));
    const outgoing=new Map(tasks.map(task=>[task.executionTaskId,[]]));

    for(const task of tasks){
      for(const dependencyId of task.dependencies || []){
        if(!byId.has(dependencyId)) continue;
        indegree.set(task.executionTaskId,indegree.get(task.executionTaskId)+1);
        outgoing.get(dependencyId).push(task.executionTaskId);
      }
    }

    const queue=[...indegree.entries()]
      .filter(([,count])=>count===0)
      .map(([id])=>id);

    const ordered=[];

    while(queue.length){
      const id=queue.shift();
      ordered.push(byId.get(id));

      for(const next of outgoing.get(id) || []){
        indegree.set(next,indegree.get(next)-1);
        if(indegree.get(next)===0) queue.push(next);
      }
    }

    return {
      valid:ordered.length===tasks.length,
      ordered
    };
  }

  function validateWindow(start,end,approvedWindow,reservationExpiry){
    const issues=[];
    const startMs=new Date(start).getTime();
    const endMs=new Date(end).getTime();

    if(!(startMs<endMs)){
      issues.push("Scheduled end must be after start.");
    }

    if(
      approvedWindow?.startsAt &&
      startMs < new Date(approvedWindow.startsAt).getTime()
    ){
      issues.push("Scheduled start is before approved execution window.");
    }

    if(
      approvedWindow?.endsAt &&
      endMs > new Date(approvedWindow.endsAt).getTime()
    ){
      issues.push("Scheduled end exceeds approved execution window.");
    }

    if(
      reservationExpiry &&
      endMs > new Date(reservationExpiry).getTime()
    ){
      issues.push("Scheduled execution exceeds resource reservation expiry.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.executionScheduleValidator=
    Object.freeze({topologicalSort,validateWindow});
})(window);
