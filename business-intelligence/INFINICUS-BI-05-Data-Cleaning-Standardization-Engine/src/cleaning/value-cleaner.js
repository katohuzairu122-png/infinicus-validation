(function (global) {
  "use strict";

  function titleCase(value) {
    return String(value)
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function normalizePhone(value, defaultCountryCode = "") {
    const original = String(value || "").trim();
    const hasPlus = original.startsWith("+");
    const digits = original.replace(/\D/g, "");

    if (!digits) return "";

    if (hasPlus) return `+${digits}`;

    const country = String(defaultCountryCode || "")
      .replace(/\D/g, "");

    return country
      ? `+${country}${digits.replace(/^0+/, "")}`
      : digits;
  }

  function apply(value, rule) {
    const config = rule.configuration || {};

    switch (rule.ruleType) {
      case "trim":
        return value == null ? value : String(value).trim();

      case "lowercase":
        return value == null ? value : String(value).toLowerCase();

      case "uppercase":
        return value == null ? value : String(value).toUpperCase();

      case "title_case":
        return value == null ? value : titleCase(value);

      case "collapse_whitespace":
        return value == null
          ? value
          : String(value).replace(/\s+/g, " ").trim();

      case "replace_null":
        return value == null || value === ""
          ? config.defaultValue ?? null
          : value;

      case "to_number": {
        if (value == null || value === "") return value;

        const cleaned =
          String(value)
            .replace(/[^\d.-]/g, "");

        const parsed = Number(cleaned);

        if (!Number.isFinite(parsed)) {
          throw new Error(`Cannot normalize number: ${value}`);
        }

        return parsed;
      }

      case "round_number": {
        if (value == null || value === "") return value;

        const decimals =
          Math.max(0, Number(config.decimals || 0));

        const parsed = Number(value);

        if (!Number.isFinite(parsed)) {
          throw new Error(`Cannot round number: ${value}`);
        }

        return Number(parsed.toFixed(decimals));
      }

      case "standardize_date": {
        if (value == null || value === "") return value;

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot standardize date: ${value}`);
        }

        return date.toISOString().slice(0, 10);
      }

      case "standardize_datetime": {
        if (value == null || value === "") return value;

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
          throw new Error(`Cannot standardize datetime: ${value}`);
        }

        return date.toISOString();
      }

      case "normalize_email":
        return value == null
          ? value
          : String(value).trim().toLowerCase();

      case "normalize_phone":
        return value == null
          ? value
          : normalizePhone(
              value,
              config.defaultCountryCode
            );

      case "normalize_identifier":
        return value == null
          ? value
          : String(value)
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9_-]/g, "");

      case "replace_pattern":
        return value == null
          ? value
          : String(value).replace(
              new RegExp(
                config.pattern || "",
                config.flags || "g"
              ),
              config.replacement || ""
            );

      default:
        throw new Error(
          `Unsupported cleaning rule: ${rule.ruleType}`
        );
    }
  }

  global.INFINICUS.BI.valueCleaner =
    Object.freeze({
      titleCase,
      normalizePhone,
      apply
    });
})(window);
