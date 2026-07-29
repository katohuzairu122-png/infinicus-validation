import assert from "node:assert/strict";

function classify(item = {}) {
  if (item.sourceType) return item.sourceType;
  if (item.simulated === true) return "simulated";
  if (item.confidence != null) return "inferred";
  if (item.formula != null) return "calculated";
  return "observed";
}

assert.equal(
  classify({}),
  "observed"
);

assert.equal(
  classify({ formula: "a+b" }),
  "calculated"
);

assert.equal(
  classify({ confidence: 0.7 }),
  "inferred"
);

assert.equal(
  classify({ simulated: true }),
  "simulated"
);

const required = [
  "businessState",
  "domainStates",
  "metricStates",
  "signalStates",
  "lineage"
];

const packageRecord = {
  businessState: {},
  domainStates: [],
  metricStates: [],
  signalStates: [],
  lineage: [{}]
};

assert.deepEqual(
  required.filter(key => packageRecord[key] == null),
  []
);

console.log("DT-04 intelligence intake tests passed.");
