(function (global) {
  "use strict";

  const WIDGET_TYPES = Object.freeze([
    "metric_card",
    "line_chart",
    "bar_chart",
    "area_chart",
    "table",
    "ranking",
    "signal_list",
    "root_cause_graph",
    "text_summary"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.name || !Array.isArray(input.widgets)) {
      return runtime.failure(
        "DASHBOARD_DEFINITION_INVALID",
        "name and widgets are required."
      );
    }

    const widgets = input.widgets.map(widget => ({
      widgetId:
        widget.widgetId ||
        runtime.createId("bi_widget"),
      title:
        String(widget.title || ""),
      type:
        WIDGET_TYPES.includes(widget.type)
          ? widget.type
          : "table",
      dataSource:
        runtime.clone(widget.dataSource || {}),
      configuration:
        runtime.clone(widget.configuration || {}),
      position:
        runtime.clone(widget.position || {})
    }));

    return runtime.success({
      dashboardId:
        input.dashboardId ||
        runtime.createId("bi_dashboard"),
      name:
        String(input.name),
      description:
        String(input.description || ""),
      audience:
        String(input.audience || "general"),
      filters:
        runtime.clone(input.filters || []),
      drillPaths:
        runtime.clone(input.drillPaths || []),
      widgets,
      refreshPolicy:
        runtime.clone(input.refreshPolicy || {}),
      status:
        String(input.status || "draft"),
      version:
        Math.max(1, Number(input.version || 1)),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.dashboardDefinitionModel =
    Object.freeze({
      WIDGET_TYPES,
      create
    });
})(window);
