(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function overlapScore({
    factorStartsAt,
    factorEndsAt,
    outcomeStartsAt,
    outcomeEndsAt
  }={}){
    if(!factorStartsAt || !outcomeStartsAt){
      return 0;
    }

    const fs=new Date(factorStartsAt).getTime();
    const fe=new Date(factorEndsAt || factorStartsAt).getTime();
    const os=new Date(outcomeStartsAt).getTime();
    const oe=new Date(outcomeEndsAt || outcomeStartsAt).getTime();

    const overlap=Math.max(0,Math.min(fe,oe)-Math.max(fs,os));
    const outcomeDuration=Math.max(1,oe-os);

    return bounded(overlap/outcomeDuration);
  }

  function score({
    factor,
    overlap,
    scopeAlignment=0,
    mechanismStrength=0
  }={}){
    const magnitude=bounded(factor.magnitude);
    const confidence=bounded(factor.confidence);
    const scope=bounded(scopeAlignment);
    const mechanism=bounded(mechanismStrength);

    const materiality=
      magnitude*0.35 +
      confidence*0.25 +
      bounded(overlap)*0.25 +
      scope*0.1 +
      mechanism*0.05;

    let classification="immaterial";

    if(materiality>=0.75){
      classification="major_confounder";
    }else if(materiality>=0.5){
      classification="material_confounder";
    }else if(materiality>=0.25){
      classification="minor_confounder";
    }

    return {
      materiality:Number(materiality.toFixed(4)),
      classification
    };
  }

  global.INFINICUS.OM.confounderScorer=
    Object.freeze({overlapScore,score});
})(window);
