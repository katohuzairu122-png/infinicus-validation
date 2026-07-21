import assert from "node:assert/strict";

function createRegistry() {
  const records = new Map();

  return {
    register(key, value) {
      if (!key) return { ok: false };
      if (records.has(key)) return { ok: false };
      records.set(key, value);
      return { ok: true };
    },
    get(key) {
      return records.has(key)
        ? { ok: true, data: records.get(key) }
        : { ok: false };
    },
    size() {
      return records.size;
    }
  };
}

const registry = createRegistry();

assert.equal(registry.register("sales", { type: "dataset" }).ok, true);
assert.equal(registry.register("sales", { type: "dataset" }).ok, false);
assert.equal(registry.get("sales").ok, true);
assert.equal(registry.size(), 1);

console.log("BI-01 runtime tests passed.");
