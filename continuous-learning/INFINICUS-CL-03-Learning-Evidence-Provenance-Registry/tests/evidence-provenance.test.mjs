import assert from "node:assert/strict";

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

const evidence={
  sourceReference:"om_21_audit_1",
  itemType:"lesson",
  evidenceType:"contextual"
};

const canonical=canonicalize(evidence);

assert.equal(
  canonical,
  '{"evidenceType":"contextual","itemType":"lesson","sourceReference":"om_21_audit_1"}'
);

const accepted=[
  "observed",
  "calculated",
  "contextual",
  "documentary",
  "expert_review",
  "hypothesis"
];

assert.equal(accepted.includes("contextual"),true);
assert.equal(Boolean(evidence.sourceReference),true);

console.log("CL-03 evidence and provenance tests passed.");
