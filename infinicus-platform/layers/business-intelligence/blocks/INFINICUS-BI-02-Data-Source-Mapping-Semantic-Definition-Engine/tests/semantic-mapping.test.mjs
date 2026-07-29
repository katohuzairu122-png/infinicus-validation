import assert from "node:assert/strict";

const compatibility = {
  string: ["string"],
  integer: ["integer", "number", "string"],
  number: ["integer", "number", "string"],
  date: ["date", "datetime", "string"]
};

function compatible(sourceType, targetType, conversionRule = null) {
  return (compatibility[targetType] || [targetType])
    .includes(sourceType) || Boolean(conversionRule);
}

assert.equal(
  compatible("integer", "number"),
  true
);

assert.equal(
  compatible("boolean", "date"),
  false
);

assert.equal(
  compatible("boolean", "date", "boolean_to_date"),
  true
);

const requiredFields = ["transaction_id", "amount"];
const mappedFields = new Set(["transaction_id", "amount"]);

assert.equal(
  requiredFields.every(field => mappedFields.has(field)),
  true
);

console.log("BI-02 semantic mapping tests passed.");
