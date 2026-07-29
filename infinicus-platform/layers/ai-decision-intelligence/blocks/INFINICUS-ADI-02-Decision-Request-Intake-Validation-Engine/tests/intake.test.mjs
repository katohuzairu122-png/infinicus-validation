import test from "node:test";
import assert from "node:assert/strict";
import { createDecisionRequestIntakeEngine } from "../src/index.js";

const valid = {
  tenantId:"tenant_001", businessId:"business_001", requesterId:"user_001",
  requestSource:"human", decisionType:"problem", title:"Reduce customer churn",
  statement:"Customer churn has exceeded the approved threshold for three consecutive periods.",
  desiredOutcome:"Reduce churn while remaining within the approved operating budget.",
  decisionDeadline:"2027-01-01T00:00:00.000Z", urgency:"high", scope:"business",
  idempotencyKey:"churn_review_001", evidenceRefs:["bi_report_001"]
};

test("accepts a valid request and creates a DecisionCase", async () => {
  const engine = createDecisionRequestIntakeEngine({ authorize:async () => ({allowed:true}), now:() => new Date("2026-07-18T00:00:00Z") });
  const result = await engine.submit(valid);
  assert.equal(result.ok, true);
  assert.equal(result.data.status, "received");
  assert.equal(result.data.processingLane, "priority");
  assert.match(result.data.decisionId, /^decision_/);
});

test("returns the original case for an idempotent duplicate", async () => {
  const engine = createDecisionRequestIntakeEngine({ authorize:async () => ({allowed:true}), now:() => new Date("2026-07-18T00:00:00Z") });
  const first = await engine.submit(valid);
  const second = await engine.submit(valid);
  assert.equal(second.ok, true);
  assert.equal(second.meta.validationStatus, "duplicate");
  assert.equal(second.data.decisionId, first.data.decisionId);
});

test("rejects unauthorized requests before acceptance", async () => {
  const engine = createDecisionRequestIntakeEngine({ authorize:async () => ({ allowed:false }) });
  const result = await engine.submit(valid);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "ADI_REQUEST_UNAUTHORIZED");
});

test("reports missing information without creating a case", async () => {
  const engine = createDecisionRequestIntakeEngine({ authorize:async () => ({allowed:true}), now:() => new Date("2026-07-18T00:00:00Z") });
  const result = await engine.submit({ ...valid, statement:"Too short" });
  assert.equal(result.ok, false);
  assert.equal(result.meta.validationStatus, "needs_information");
});

test("isolates duplicate keys by tenant and business", async () => {
  const engine = createDecisionRequestIntakeEngine({ authorize:async () => ({allowed:true}), now:() => new Date("2026-07-18T00:00:00Z") });
  const first = await engine.submit(valid);
  const second = await engine.submit({ ...valid, businessId:"business_002" });
  assert.notEqual(first.data.decisionId, second.data.decisionId);
});

test("fails closed when no authorization adapter is configured", async () => {
  const engine = createDecisionRequestIntakeEngine();
  const result = await engine.submit(valid);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "ADI_REQUEST_UNAUTHORIZED");
});
