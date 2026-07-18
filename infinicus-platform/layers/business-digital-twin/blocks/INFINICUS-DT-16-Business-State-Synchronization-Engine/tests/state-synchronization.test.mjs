import assert from "node:assert/strict";

function sourceRank(
  sourceType,
  priority
) {
  const index =
    priority.indexOf(sourceType);

  return index === -1
    ? Number.MAX_SAFE_INTEGER
    : index;
}

const priority = [
  "observed",
  "calculated",
  "inferred",
  "assumed"
];

assert.equal(
  sourceRank(
    "observed",
    priority
  ),
  0
);

assert.equal(
  sourceRank(
    "inferred",
    priority
  ),
  2
);

function equivalent(
  left,
  right,
  tolerance
) {
  return Math.abs(
    Number(left) -
    Number(right)
  ) <= tolerance;
}

assert.equal(
  equivalent(
    100,
    101,
    2
  ),
  true
);

assert.equal(
  equivalent(
    100,
    105,
    2
  ),
  false
);

const current = {
  sourceType: "inferred",
  confidence: 0.7
};

const incoming = {
  sourceType: "observed",
  confidence: 0.6
};

assert.equal(
  sourceRank(
    incoming.sourceType,
    priority
  ) <
  sourceRank(
    current.sourceType,
    priority
  ),
  true
);

console.log("DT-16 state synchronization tests passed.");
