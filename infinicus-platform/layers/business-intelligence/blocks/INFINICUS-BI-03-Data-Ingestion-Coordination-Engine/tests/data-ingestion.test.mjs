import assert from "node:assert/strict";

function reserve(registry, key) {
  if (!key || registry.has(key)) return false;
  registry.add(key);
  return true;
}

function mapRecord(record, mappings) {
  const output = {};
  const errors = [];

  for (const mapping of mappings) {
    const value = record[mapping.sourceField];

    if (
      mapping.required &&
      (value == null || value === "")
    ) {
      errors.push(mapping.sourceField);
      continue;
    }

    output[mapping.targetField] =
      mapping.targetDataType === "number"
        ? Number(value)
        : value;
  }

  return {
    valid: errors.length === 0,
    output,
    errors
  };
}

const registry = new Set();

assert.equal(reserve(registry, "job-1"), true);
assert.equal(reserve(registry, "job-1"), false);

const mapped = mapRecord(
  { amount: "200" },
  [{
    sourceField: "amount",
    targetField: "revenue_amount",
    targetDataType: "number",
    required: true
  }]
);

assert.equal(mapped.valid, true);
assert.equal(mapped.output.revenue_amount, 200);

console.log("BI-03 data ingestion tests passed.");
