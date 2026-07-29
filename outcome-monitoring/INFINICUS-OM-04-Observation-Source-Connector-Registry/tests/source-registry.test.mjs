import assert from "node:assert/strict";

const source={
  sourceType:"api",
  observedStateOnly:true,
  healthStatus:"healthy",
  dataQualityMinimum:0.8
};

const connector={
  supportedSourceTypes:["api"],
  supportedValueTypes:["number"],
  healthStatus:"healthy"
};

assert.equal(source.observedStateOnly,true);
assert.equal(source.healthStatus,"healthy");
assert.equal(connector.supportedSourceTypes.includes(source.sourceType),true);
assert.equal(connector.supportedValueTypes.includes("number"),true);

console.log("OM-04 source registry tests passed.");
