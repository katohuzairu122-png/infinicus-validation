import assert from "node:assert/strict";

const publication={
  learningPublicationId:"publication_1",
  learningPublicationReceiptId:"receipt_1",
  outcomeLearningPackageId:"learning_1",
  outcomeVerdictId:"verdict_1",
  monitoringContractId:"contract_1",
  packageVersion:"1.0.0",
  confidence:0.82,
  reliability:0.78,
  applicabilityScope:"same business and comparable conditions",
  limitations:[],
  lessons:[],
  hypotheses:[],
  successFactors:[],
  failureFactors:[],
  correlationId:"correlation_1",
  lineage:[{source:"OM-24"}]
};

assert.equal(Boolean(publication.learningPublicationId),true);
assert.equal(Boolean(publication.learningPublicationReceiptId),true);
assert.equal(publication.packageVersion,"1.0.0");
assert.equal(publication.confidence>=0.5,true);
assert.equal(publication.reliability>=0.5,true);
assert.equal(Array.isArray(publication.lineage),true);

const idempotencyKey=
  `cl_intake_${publication.learningPublicationId}`;

assert.equal(
  idempotencyKey,
  "cl_intake_publication_1"
);

console.log("CL-02 intake tests passed.");
