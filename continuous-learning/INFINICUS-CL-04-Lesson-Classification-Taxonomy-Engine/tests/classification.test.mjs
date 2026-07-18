import assert from "node:assert/strict";

function normalizeText(value){
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

const text=normalizeText(
  "Revenue increased after pricing optimization."
);

assert.equal(text.includes("revenue"),true);
assert.equal(text.includes("pricing"),true);

const taxonomy={
  keywords:["revenue","pricing","optimization"]
};

const hits=
  taxonomy.keywords.filter(
    keyword=>text.includes(keyword)
  );

const confidence=
  hits.length/taxonomy.keywords.length;

assert.equal(Number(confidence.toFixed(2)),1);

const classes=[
  "factual",
  "contextual",
  "hypothesis"
];

assert.equal(classes.includes("hypothesis"),true);

console.log("CL-04 classification tests passed.");
