(function (global) {
  "use strict";

  function evaluate(rule, context) {
    const config = rule.configuration || {};

    if (rule.method === "z_score") {
      const result =
        global.INFINICUS.BI
          .statisticalAnomalyDetector
          .zScore(context.value, context.baseline || []);

      const threshold =
        Number(config.threshold || 3);

      return {
        detected:
          result.valid &&
          Math.abs(result.score) >= threshold,
        confidence:
          result.valid
            ? Math.min(1, Math.abs(result.score) / Math.max(threshold, 1))
            : 0,
        evidence:
          result
      };
    }

    if (rule.method === "sudden_change") {
      const change =
        Number(context.changePercent);

      const threshold =
        Number(config.changePercent || 20);

      return {
        detected:
          Number.isFinite(change) &&
          Math.abs(change) >= threshold,
        confidence:
          Number.isFinite(change)
            ? Math.min(1, Math.abs(change) / Math.max(threshold, 1))
            : 0,
        evidence: {
          changePercent:
            change,
          threshold
        }
      };
    }

    if (rule.method === "variance_severity") {
      const severities = ["low", "moderate", "high", "critical"];
      const minimum =
        severities.indexOf(config.minimumSeverity || "high");

      const current =
        severities.indexOf(context.severity);

      return {
        detected:
          current >= minimum &&
          current >= 0,
        confidence:
          current >= 0
            ? (current + 1) / severities.length
            : 0,
        evidence: {
          severity:
            context.severity,
          minimumSeverity:
            config.minimumSeverity || "high"
        }
      };
    }

    if (rule.method === "benchmark_breach") {
      return {
        detected:
          context.position === "below_benchmark",
        confidence:
          Math.min(
            1,
            Math.abs(Number(context.variancePercent || 0)) /
            Number(config.fullConfidenceAtPercent || 25)
          ),
        evidence: {
          position:
            context.position,
          variancePercent:
            context.variancePercent
        }
      };
    }

    if (rule.method === "domain_contradiction") {
      const left =
        Number(context.leftValue);
      const right =
        Number(context.rightValue);

      const detected =
        Number.isFinite(left) &&
        Number.isFinite(right) &&
        (
          config.relationship === "same_direction"
            ? Math.sign(left) !== Math.sign(right)
            : Math.sign(left) === Math.sign(right)
        );

      return {
        detected,
        confidence:
          detected ? 0.8 : 0,
        evidence: {
          leftValue: left,
          rightValue: right,
          relationship:
            config.relationship
        }
      };
    }

    return {
      detected: false,
      confidence: 0,
      evidence: {}
    };
  }

  global.INFINICUS.BI.detectionRuleEvaluator =
    Object.freeze({ evaluate });
})(window);
