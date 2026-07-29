(function(global){
  "use strict";

  function canonicalize(value){
    if(value===null || typeof value!=="object"){
      return JSON.stringify(value);
    }

    if(Array.isArray(value)){
      return `[${value.map(canonicalize).join(",")}]`;
    }

    const keys=Object.keys(value).sort();

    return `{${keys.map(
      key=>`${JSON.stringify(key)}:${canonicalize(value[key])}`
    ).join(",")}}`;
  }

  function simpleHash(value){
    const text=canonicalize(value);
    let hash=2166136261;

    for(let index=0;index<text.length;index++){
      hash^=text.charCodeAt(index);
      hash=Math.imul(hash,16777619);
    }

    return `fnv1a_${(hash>>>0).toString(16).padStart(8,"0")}`;
  }

  global.INFINICUS.CL.learningEvidenceFingerprint=
    Object.freeze({canonicalize,simpleHash});
})(window);
