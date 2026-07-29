import assert from "node:assert/strict";

function normalizeEmail(value) {
  return String(value).trim().toLowerCase();
}

function normalizePhone(value, country) {
  const digits = String(value).replace(/\D/g, "");
  return `+${country}${digits.replace(/^0+/, "")}`;
}

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

assert.equal(
  normalizeEmail("  USER@EXAMPLE.COM "),
  "user@example.com"
);

assert.equal(
  normalizePhone("0772 123 456", "256"),
  "+256772123456"
);

assert.equal(
  titleCase("prince empire tours"),
  "Prince Empire Tours"
);

console.log("BI-05 data cleaning tests passed.");
