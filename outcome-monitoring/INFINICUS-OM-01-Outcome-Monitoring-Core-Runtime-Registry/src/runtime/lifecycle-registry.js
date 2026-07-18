(function(global){
  "use strict";

  const states=Object.freeze([
    "draft",
    "pending_validation",
    "validated",
    "scheduled",
    "collecting",
    "partially_observed",
    "observed",
    "evaluating",
    "alerted",
    "completed",
    "inconclusive",
    "failed",
    "paused",
    "cancelled",
    "expired"
  ]);

  const transitions=Object.freeze({
    draft:["pending_validation","cancelled"],
    pending_validation:["validated","failed","cancelled"],
    validated:["scheduled","collecting","cancelled"],
    scheduled:["collecting","paused","cancelled","expired"],
    collecting:[
      "partially_observed",
      "observed",
      "alerted",
      "paused",
      "failed",
      "expired"
    ],
    partially_observed:[
      "collecting",
      "observed",
      "evaluating",
      "alerted",
      "failed",
      "expired"
    ],
    observed:["evaluating","completed","inconclusive"],
    evaluating:["completed","inconclusive","alerted","failed"],
    alerted:["collecting","evaluating","paused","completed","failed"],
    paused:["scheduled","collecting","cancelled","expired"],
    completed:[],
    inconclusive:[],
    failed:[],
    cancelled:[],
    expired:[]
  });

  function canTransition(from,to){
    return Boolean(transitions[from]?.includes(to));
  }

  function validateState(state){
    return states.includes(state);
  }

  global.INFINICUS.OM.lifecycleRegistry=
    Object.freeze({
      states,
      transitions,
      canTransition,
      validateState
    });
})(window);
