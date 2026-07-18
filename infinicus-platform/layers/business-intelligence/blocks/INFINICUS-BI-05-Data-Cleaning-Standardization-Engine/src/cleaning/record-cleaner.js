(function (global) {
  "use strict";

  function clean(record, rules = []) {
    const output = structuredClone(record);
    const changes = [];
    const errors = [];

    const orderedRules =
      [...rules].sort(
        (a, b) => a.sequence - b.sequence
      );

    for (const rule of orderedRules) {
      if (rule.status !== "active") continue;

      if (rule.mode !== "automatic") {
        continue;
      }

      const before = output[rule.field];

      try {
        const after =
          global.INFINICUS.BI
            .valueCleaner
            .apply(before, rule);

        output[rule.field] = after;

        if (!Object.is(before, after)) {
          changes.push({
            cleaningRuleId:
              rule.cleaningRuleId,
            field:
              rule.field,
            ruleType:
              rule.ruleType,
            before,
            after
          });
        }
      } catch (error) {
        errors.push({
          cleaningRuleId:
            rule.cleaningRuleId,
          field:
            rule.field,
          ruleType:
            rule.ruleType,
          message:
            error?.message ||
            "Cleaning rule failed."
        });
      }
    }

    return {
      valid: errors.length === 0,
      record: output,
      changes,
      errors
    };
  }

  global.INFINICUS.BI.recordCleaner =
    Object.freeze({ clean });
})(window);
