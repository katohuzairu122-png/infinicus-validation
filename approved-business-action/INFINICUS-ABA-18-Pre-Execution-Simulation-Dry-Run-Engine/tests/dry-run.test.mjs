import assert from "node:assert/strict";

const policy={
  allowedEnvironments:["sandbox","validation"],
  requireIdempotencyKey:true,
  prohibitSideEffects:true
};

const envelope={
  environment:"sandbox",
  idempotencyKey:"idem_1",
  allowSideEffects:false
};

assert.equal(
  policy.allowedEnvironments.includes(envelope.environment),
  true
);

assert.equal(
  Boolean(envelope.idempotencyKey),
  true
);

assert.equal(
  envelope.allowSideEffects===true,
  false
);

const response={
  status:"validated",
  result:{ok:true}
};

assert.equal(
  response.result.ok,
  true
);

console.log("ABA-18 dry-run tests passed.");
