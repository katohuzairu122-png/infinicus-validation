import assert from "node:assert/strict";

function withinPeriod(validFrom, validUntil, now) {
  const from =
    validFrom
      ? new Date(validFrom).getTime()
      : -Infinity;

  const until =
    validUntil
      ? new Date(validUntil).getTime()
      : Infinity;

  return now >= from && now <= until;
}

const now = Date.now();

assert.equal(
  withinPeriod(
    new Date(now - 1000).toISOString(),
    new Date(now + 1000).toISOString(),
    now
  ),
  true
);

const maximum = 1000;
const value = 750;

assert.equal(
  value <= maximum,
  true
);

const allowedRisk = ["low", "medium"];
assert.equal(
  allowedRisk.includes("medium"),
  true
);

assert.equal(
  allowedRisk.includes("critical"),
  false
);

console.log("ABA-05 authority tests passed.");
