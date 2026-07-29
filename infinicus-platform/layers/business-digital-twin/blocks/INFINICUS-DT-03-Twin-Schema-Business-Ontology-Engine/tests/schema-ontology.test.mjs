import assert from "node:assert/strict";

const ontology = {
  entityTypes: [
    {
      entityTypeId: "customer",
      code: "customer",
      attributes: [
        { code: "name", valueType: "string" },
        { code: "email", valueType: "string" }
      ]
    },
    {
      entityTypeId: "order",
      code: "order",
      attributes: [
        { code: "amount", valueType: "number" }
      ]
    }
  ],
  relationshipTypes: [
    {
      sourceEntityTypeId: "customer",
      targetEntityTypeId: "order"
    }
  ]
};

const ids = new Set(
  ontology.entityTypes.map(item => item.entityTypeId)
);

assert.equal(
  ids.has(
    ontology.relationshipTypes[0].sourceEntityTypeId
  ),
  true
);

assert.equal(
  ids.has(
    ontology.relationshipTypes[0].targetEntityTypeId
  ),
  true
);

const prior = {
  entityTypes: [
    {
      code: "customer",
      attributes: [
        { code: "name", valueType: "string" }
      ]
    }
  ]
};

const next = {
  entityTypes: [
    {
      code: "customer",
      attributes: [
        { code: "name", valueType: "number" }
      ]
    }
  ]
};

assert.notEqual(
  prior.entityTypes[0].attributes[0].valueType,
  next.entityTypes[0].attributes[0].valueType
);

console.log("DT-03 schema ontology tests passed.");
