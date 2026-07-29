(function(global){
  "use strict";

  const blocks=[
    ["BI-01","Business Intelligence Core Runtime and Registry","runtime"],
    ["BI-02","Business Data Intake and Validation Engine","dataIntakeEngine"],
    ["BI-03","Business Entity and Master Data Registry","masterDataRegistry"],
    ["BI-04","Data Source, Connector and Integration Registry","connectorRegistry"],
    ["BI-05","Data Mapping and Schema Harmonization Engine","schemaHarmonizationEngine"],
    ["BI-06","Data Quality, Completeness and Reliability Engine","dataQualityEngine"],
    ["BI-07","Business Metric and KPI Definition Engine","metricKPIEngine"],
    ["BI-08","Financial Intelligence Engine","financialIntelligenceEngine"],
    ["BI-09","Revenue, Sales and Growth Intelligence Engine","revenueGrowthIntelligenceEngine"],
    ["BI-10","Cost, Expense and Profitability Intelligence Engine","profitabilityIntelligenceEngine"],
    ["BI-11","Customer and Market Intelligence Engine","customerMarketIntelligenceEngine"],
    ["BI-12","Product and Service Performance Intelligence Engine","productServiceIntelligenceEngine"],
    ["BI-13","Operations and Process Performance Intelligence Engine","operationsIntelligenceEngine"],
    ["BI-14","Workforce and Productivity Intelligence Engine","workforceIntelligenceEngine"],
    ["BI-15","Inventory, Supply and Capacity Intelligence Engine","inventoryCapacityIntelligenceEngine"],
    ["BI-16","Cash Flow, Liquidity and Financial Health Engine","liquidityIntelligenceEngine"],
    ["BI-17","Trend, Pattern and Anomaly Detection Engine","trendAnomalyEngine"],
    ["BI-18","Benchmarking and Comparative Performance Engine","benchmarkingEngine"],
    ["BI-19","Risk, Exposure and Early Warning Intelligence Engine","riskEarlyWarningEngine"],
    ["BI-20","Forecast Input and Assumption Preparation Engine","forecastInputEngine"],
    ["BI-21","Root Cause and Driver Analysis Engine","rootCauseDriverAnalysisEngine"],
    ["BI-22","Dashboard, Reporting and Data Exploration Engine","reportingExplorationEngine"],
    ["BI-23","Alert, Notification and Report Distribution Engine","alertNotificationDistributionEngine"],
    ["BI-24","Business Digital Twin Publication and Handoff Engine","digitalTwinPublicationEngine"]
  ].map(([blockId,name,namespaceKey],index)=>Object.freeze({
    blockId,
    name,
    namespaceKey,
    sequence:index+1,
    required:true
  }));

  global.INFINICUS=global.INFINICUS || {};
  global.INFINICUS.BI=global.INFINICUS.BI || {};
  global.INFINICUS.BI.masterBlockManifest=Object.freeze(blocks);
})(window);
