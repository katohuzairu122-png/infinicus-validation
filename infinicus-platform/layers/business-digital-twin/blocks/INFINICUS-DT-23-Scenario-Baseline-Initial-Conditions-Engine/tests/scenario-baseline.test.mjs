import assert from "node:assert/strict";

const baseline = [
  {
    stateKey:
      "financial.cash",
    value:
      100,
    sourceClass:
      "actual"
  }
];

const condition = {
  stateKey:
    "financial.cash",
  conditionType:
    "fixed",
  value:
    120,
  sourceClass:
    "assumed"
};

const effective =
  baseline.map(item =>
    item.stateKey === condition.stateKey
      ? {
          ...item,
          value:
            condition.value,
          sourceClass:
            condition.sourceClass
        }
      : item
  );

assert.equal(
  baseline[0].value,
  100
);

assert.equal(
  effective[0].value,
  120
);

assert.equal(
  baseline[0].sourceClass,
  "actual"
);

assert.equal(
  effective[0].sourceClass,
  "assumed"
);

console.log("DT-23 scenario baseline tests passed.");
