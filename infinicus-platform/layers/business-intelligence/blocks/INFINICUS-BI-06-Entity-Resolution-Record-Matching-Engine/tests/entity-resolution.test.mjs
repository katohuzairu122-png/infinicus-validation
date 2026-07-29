import assert from "node:assert/strict";

function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function classify(score, automatic = 0.9, review = 0.7) {
  return score >= automatic
    ? "automatic_match"
    : score >= review
      ? "manual_review"
      : "no_match";
}

assert.equal(
  normalize("Prince Empire Ltd."),
  "princeempireltd"
);

assert.equal(
  normalize(" PRINCE-EMPIRE LTD "),
  "princeempireltd"
);

assert.equal(
  classify(0.95),
  "automatic_match"
);

assert.equal(
  classify(0.8),
  "manual_review"
);

assert.equal(
  classify(0.4),
  "no_match"
);

console.log("BI-06 entity resolution tests passed.");
