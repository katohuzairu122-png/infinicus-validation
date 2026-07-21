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

  async function sha256(value){
    const input=
      new TextEncoder().encode(canonicalize(value));

    const digest=
      await crypto.subtle.digest("SHA-256",input);

    return [...new Uint8Array(digest)]
      .map(byte=>byte.toString(16).padStart(2,"0"))
      .join("");
  }

  global.INFINICUS.OM.auditCanonicalizer=
    Object.freeze({canonicalize,sha256});
})(window);
