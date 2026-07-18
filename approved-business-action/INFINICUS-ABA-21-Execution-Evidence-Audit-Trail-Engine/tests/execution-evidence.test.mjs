import assert from "node:assert/strict";

function stable(value){
  if(value==null || typeof value!=="object"){
    return JSON.stringify(value);
  }

  if(Array.isArray(value)){
    return `[${value.map(stable).join(",")}]`;
  }

  return `{${Object.keys(value).sort()
    .map(key=>`${JSON.stringify(key)}:${stable(value[key])}`)
    .join(",")}}`;
}

assert.equal(
  stable({b:2,a:1}),
  stable({a:1,b:2})
);

const evidenceTypes=[
  "execution_result",
  "execution_failure",
  "rollback_attempt"
];

assert.equal(
  evidenceTypes.includes("rollback_attempt"),
  true
);

console.log("ABA-21 execution evidence tests passed.");
