(function (global) {
  "use strict";

  const BLOCKS = Object.freeze([
    { number: 1, code: "BI-01", name: "Business Intelligence Core Runtime and Registry" },
    { number: 2, code: "BI-02", name: "Data Source Mapping and Semantic Definition" },
    { number: 3, code: "BI-03", name: "Data Ingestion Coordination" },
    { number: 4, code: "BI-04", name: "Data Validation and Quality Control" },
    { number: 5, code: "BI-05", name: "Data Cleaning and Standardization" },
    { number: 6, code: "BI-06", name: "Entity Resolution and Record Matching" },
    { number: 7, code: "BI-07", name: "Data Transformation and Enrichment" },
    { number: 8, code: "BI-08", name: "Business Data Warehouse and Analytical Storage" },
    { number: 9, code: "BI-09", name: "Business Metric and KPI Registry" },
    { number: 10, code: "BI-10", name: "Metric Calculation and Aggregation" },
    { number: 11, code: "BI-11", name: "Financial Intelligence" },
    { number: 12, code: "BI-12", name: "Sales and Revenue Intelligence" },
    { number: 13, code: "BI-13", name: "Customer Intelligence" },
    { number: 14, code: "BI-14", name: "Marketing Intelligence" },
    { number: 15, code: "BI-15", name: "Operations and Productivity Intelligence" },
    { number: 16, code: "BI-16", name: "Inventory and Supply Intelligence" },
    { number: 17, code: "BI-17", name: "Workforce and Organizational Intelligence" },
    { number: 18, code: "BI-18", name: "Market and Competitive Intelligence" },
    { number: 19, code: "BI-19", name: "Trend, Variance and Benchmark Analysis" },
    { number: 20, code: "BI-20", name: "Anomaly and Business Signal Detection" },
    { number: 21, code: "BI-21", name: "Root-Cause and Driver Analysis" },
    { number: 22, code: "BI-22", name: "Dashboard, Reporting and Data Exploration" },
    { number: 23, code: "BI-23", name: "Alerts, Scheduled Intelligence and Distribution" },
    { number: 24, code: "BI-24", name: "Intelligence Dataset Publication and Digital Twin Handoff" }
  ]);

  global.INFINICUS.BI.layerManifest = Object.freeze({
    layer: "Business Intelligence",
    version: "1.0.0",
    blockCount: BLOCKS.length,
    blocks: BLOCKS
  });
})(window);
