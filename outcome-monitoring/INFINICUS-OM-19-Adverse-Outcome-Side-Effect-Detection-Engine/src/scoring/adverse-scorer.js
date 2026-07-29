(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function score({
    magnitude,
    scope,
    persistence,
    irreversibility,
    confidence
  }={}){
    const materiality=
      bounded(magnitude)*0.35 +
      bounded(scope)*0.2 +
      bounded(persistence)*0.2 +
      bounded(irreversibility)*0.15 +
      bounded(confidence)*0.1;

    return {
      materiality:Number(materiality.toFixed(4))
    };
  }

  global.INFINICUS.OM.adverseOutcomeScorer=
    Object.freeze({score});
})(window);
