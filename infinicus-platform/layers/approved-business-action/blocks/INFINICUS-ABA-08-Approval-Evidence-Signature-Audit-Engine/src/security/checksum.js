(function(global){
  "use strict";
  function stable(value){
    if(value==null || typeof value!=="object") return JSON.stringify(value);
    if(Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    return `{${Object.keys(value).sort()
      .map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  function hash(value){
    const input=stable(value);
    let result=2166136261;
    for(let i=0;i<input.length;i+=1){
      result^=input.charCodeAt(i);
      result=Math.imul(result,16777619);
    }
    return `aba_approval_${(result>>>0).toString(16).padStart(8,"0")}`;
  }
  global.INFINICUS.ABA.approvalEvidenceChecksum=Object.freeze({stable,hash});
})(window);
