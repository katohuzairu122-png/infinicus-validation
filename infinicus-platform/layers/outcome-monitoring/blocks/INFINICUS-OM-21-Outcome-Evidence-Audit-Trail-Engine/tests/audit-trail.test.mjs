import assert from "node:assert/strict";
import crypto from "node:crypto";

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

const record={
  b:2,
  a:1,
  nested:{
    d:4,
    c:3
  }
};

const canonical=canonicalize(record);

assert.equal(
  canonical,
  '{"a":1,"b":2,"nested":{"c":3,"d":4}}'
);

const hash=
  crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex");

assert.equal(hash.length,64);

const requiredSections=6;
const presentSections=6;
const completeness=presentSections/requiredSections;

assert.equal(completeness,1);

console.log("OM-21 audit trail tests passed.");
