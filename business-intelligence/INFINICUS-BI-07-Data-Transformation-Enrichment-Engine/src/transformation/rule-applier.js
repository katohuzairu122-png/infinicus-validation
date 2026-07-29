(function (global) {
  "use strict";

  function apply(record, rule, context = {}) {
    const output = structuredClone(record);
    const config = rule.configuration || {};

    switch (rule.ruleType) {
      case "rename_field": {
        const source = rule.sourceFields[0];
        output[rule.targetField] = output[source];
        delete output[source];
        break;
      }

      case "copy_field": {
        const source = rule.sourceFields[0];
        output[rule.targetField] = output[source];
        break;
      }

      case "constant":
        output[rule.targetField] = config.value ?? null;
        break;

      case "formula":
        output[rule.targetField] =
          global.INFINICUS.BI.formulaEngine.evaluate(
            output,
            config
          );
        break;

      case "classification": {
        const source = rule.sourceFields[0];
        const value = output[source];
        const matched = (config.conditions || []).find(condition => {
          if (condition.operator === "gte") return value >= condition.value;
          if (condition.operator === "gt") return value > condition.value;
          if (condition.operator === "lte") return value <= condition.value;
          if (condition.operator === "lt") return value < condition.value;
          if (condition.operator === "eq") return value === condition.value;
          if (condition.operator === "in") return (condition.value || []).includes(value);
          return false;
        });

        output[rule.targetField] =
          matched?.label ?? config.defaultLabel ?? null;
        break;
      }

      case "lookup": {
        const source = rule.sourceFields[0];
        const table = context.lookups?.[config.lookupName] || {};
        output[rule.targetField] =
          table[output[source]] ?? config.defaultValue ?? null;
        break;
      }

      case "date_parts": {
        const source = rule.sourceFields[0];
        const date = new Date(output[source]);

        if (Number.isNaN(date.getTime())) {
          throw new Error(`Invalid date value: ${output[source]}`);
        }

        const prefix = rule.targetField || source;
        output[`${prefix}_year`] = date.getUTCFullYear();
        output[`${prefix}_month`] = date.getUTCMonth() + 1;
        output[`${prefix}_day`] = date.getUTCDate();
        output[`${prefix}_weekday`] = date.getUTCDay();
        break;
      }

      case "project_fields": {
        const projected = {};
        for (const field of config.fields || []) {
          projected[field] = output[field];
        }
        return projected;
      }

      case "drop_field":
        for (const field of rule.sourceFields) {
          delete output[field];
        }
        break;

      default:
        throw new Error(`Unsupported transformation rule: ${rule.ruleType}`);
    }

    return output;
  }

  global.INFINICUS.BI.transformationRuleApplier =
    Object.freeze({ apply });
})(window);
