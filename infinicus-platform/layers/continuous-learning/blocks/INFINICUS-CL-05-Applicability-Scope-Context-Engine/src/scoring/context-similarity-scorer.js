(function(global){
  "use strict";

  function normalize(value){
    if(value==null) return null;

    if(Array.isArray(value)){
      return value.map(item=>String(item).toLowerCase().trim());
    }

    return String(value).toLowerCase().trim();
  }

  function dimensionScore(source,target){
    const a=normalize(source);
    const b=normalize(target);

    if(a==null || b==null){
      return 0;
    }

    if(Array.isArray(a) || Array.isArray(b)){
      const aa=Array.isArray(a) ? a : [a];
      const bb=Array.isArray(b) ? b : [b];
      const intersection=aa.filter(item=>bb.includes(item));

      return intersection.length /
        Math.max(1,new Set([...aa,...bb]).size);
    }

    return a===b ? 1 : 0;
  }

  function score({
    sourceContext,
    targetContext,
    dimensions
  }={}){
    const components={};

    for(const dimension of dimensions){
      components[dimension]=
        dimensionScore(
          sourceContext?.[dimension],
          targetContext?.[dimension]
        );
    }

    const values=Object.values(components);

    const similarity=
      values.length
        ? values.reduce((sum,value)=>sum+value,0)/values.length
        : 0;

    return {
      similarity:Number(similarity.toFixed(4)),
      components
    };
  }

  global.INFINICUS.CL.contextSimilarityScorer=
    Object.freeze({normalize,dimensionScore,score});
})(window);
