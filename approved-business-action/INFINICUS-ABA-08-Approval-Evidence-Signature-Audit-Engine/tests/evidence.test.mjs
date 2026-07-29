import assert from "node:assert/strict";

function stable(value){
  if(value==null || typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
}

const a={b:2,a:1};
const b={a:1,b:2};
assert.equal(stable(a),stable(b));

const validDecisions=["approved","approved_with_conditions","rejected"];
assert.equal(validDecisions.includes("approved"),true);
assert.equal(validDecisions.includes("pending"),false);

console.log("ABA-08 evidence tests passed.");
