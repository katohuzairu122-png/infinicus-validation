(function (global) {
  "use strict";

  function resolve(widget, context = {}) {
    const source =
      widget.dataSource || {};

    if (source.path) {
      return String(source.path)
        .split(".")
        .reduce(
          (value, key) => value?.[key],
          context
        );
    }

    if (source.value !== undefined) {
      return source.value;
    }

    return null;
  }

  function render(widget, context = {}) {
    return {
      widgetId:
        widget.widgetId,
      title:
        widget.title,
      type:
        widget.type,
      data:
        structuredClone(resolve(widget, context)),
      configuration:
        structuredClone(widget.configuration),
      renderedAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.reportingWidgetRenderer =
    Object.freeze({
      resolve,
      render
    });
})(window);
