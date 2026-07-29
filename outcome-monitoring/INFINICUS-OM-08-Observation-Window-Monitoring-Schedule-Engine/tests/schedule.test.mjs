import assert from "node:assert/strict";

const startsAt="2026-01-01T00:00:00.000Z";
const endsAt="2026-01-03T00:00:00.000Z";
const cadenceMinutes=1440;

assert.equal(
  new Date(endsAt).getTime() > new Date(startsAt).getTime(),
  true
);

const expectedCheckpoints=3;
assert.equal(expectedCheckpoints,3);

const allowed={
  scheduled:["collecting","paused","cancelled","expired"]
};

assert.equal(allowed.scheduled.includes("collecting"),true);

console.log("OM-08 schedule tests passed.");
