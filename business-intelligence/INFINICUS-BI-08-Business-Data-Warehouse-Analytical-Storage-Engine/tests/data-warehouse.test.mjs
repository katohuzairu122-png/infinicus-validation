import assert from "node:assert/strict";

function buildKey(record, fields) {
  return fields.map(field => String(record[field] ?? "")).join("|");
}

function validate(records, fields) {
  const seen = new Set();
  const duplicates = [];

  for (const record of records) {
    const key = buildKey(record, fields);
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }

  return duplicates;
}

const rows = [
  { id: 1, date: "2026-01-01" },
  { id: 2, date: "2026-01-01" }
];

assert.equal(
  validate(rows, ["id"]).length,
  0
);

const duplicateRows = [
  { id: 1 },
  { id: 1 }
];

assert.equal(
  validate(duplicateRows, ["id"]).length,
  1
);

assert.equal(
  buildKey({ id: 7, date: "2026-01-01" }, ["id", "date"]),
  "7|2026-01-01"
);

console.log("BI-08 data warehouse tests passed.");
