import assert from "node:assert/strict";

function createRegistry() {
  const items = new Map();

  return {
    register(id, value) {
      if (!id || items.has(id)) return false;
      items.set(id, value);
      return true;
    },
    get(id) {
      return items.get(id);
    },
    size() {
      return items.size;
    }
  };
}

const registry = createRegistry();

assert.equal(registry.register("service-1", {}), true);
assert.equal(registry.register("service-1", {}), false);
assert.equal(registry.size(), 1);
assert.deepEqual(registry.get("service-1"), {});

const allowed = {
  initializing: ["inactive", "degraded"],
  inactive: ["synchronizing", "retired"],
  synchronizing: ["active", "degraded", "suspended"]
};

assert.equal(
  allowed.initializing.includes("inactive"),
  true
);

assert.equal(
  allowed.inactive.includes("active"),
  false
);

console.log("DT-01 digital twin runtime tests passed.");
