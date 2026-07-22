// @infinicus/database — public API
export {
  createPool,
  getPool,
  getDatabasePool,
  query,
  closePool,
  closeDatabasePool,
  withTransaction,
  withTenantTransaction,
} from './client.js';
export type { DbConfig, TenantContext } from './client.js';
export { runMigrations } from './migrate.js';

// ── Data Acquisition repositories ─────────────────────────────────────────────
export {
  DataSourceRepository,
  ConnectorRepository,
  CollectionRunRepository,
  ValidationResultRepository,
  DataQualityScoreRepository,
  ProvenanceRepository,
  PublicationPackageRepository,
  NotFoundError,
} from './repositories/da/index.js';
export type {
  DataSource,
  CreateDataSourceInput,
  Connector,
  CreateConnectorInput,
  CollectionRun,
  CreateCollectionRunInput,
  CompleteCollectionRunInput,
  ValidationResult,
  ValidationIssue,
  CreateValidationResultInput,
  CreateValidationIssueInput,
  DataQualityScore,
  CreateDataQualityScoreInput,
  ProvenanceRecord,
  TransformationRecord,
  CreateProvenanceRecordInput,
  CreateTransformationRecordInput,
  PublicationPackage,
  CreatePublicationPackageInput,
} from './repositories/da/index.js';

// ── Business Operations repositories ──────────────────────────────────────────
export {
  LeadRepository,
  OpportunityRepository,
  PurchaseOrderRepository,
  SupportCaseRepository,
  IncidentRepository,
  TaskRepository,
  InventoryBalanceRepository,
} from './repositories/bo/index.js';
export type {
  Lead, CreateLeadInput,
  Opportunity, CreateOpportunityInput,
  PurchaseOrder, CreatePurchaseOrderInput,
  SupportCase, CreateSupportCaseInput,
  Incident, CreateIncidentInput,
  Task, CreateTaskInput,
  InventoryBalance, CreateInventoryBalanceInput,
} from './repositories/bo/index.js';

// ── Business Intelligence repositories (Stage 2D) ───────────────────────────────
export {
  IntelligenceIntakeRepository,
  MetricDefinitionRepository,
  MetricCalculationRepository,
  AnalysisRunRepository,
  AnalysisResultRepository,
  ForecastRepository,
  AnomalyRepository,
  RiskAssessmentRepository,
  InsightPackageRepository,
  BIPublicationPackageRepository,
} from './repositories/bi/index.js';
export type {
  IntakePackage, CreateIntakePackageInput, AnalyticalDataset, DatasetVersion,
  MetricDefinition, MetricDefinitionVersion, CreateMetricDefinitionInput,
  MetricCalculatedValue, RecordCalculationInput, TimeSeriesPoint,
  AnalysisRequest, AnalysisRun, CreateAnalysisRequestInput,
  Finding, FindingVersion, Trend, TrendObservation, CreateFindingInput,
  ForecastModel, ForecastRun, ForecastPoint, ForecastAccuracyRecord,
  AnomalyRule, AnomalyRuleVersion, AnomalyDetection,
  RiskModel, RiskAssessment, BenchmarkDefinition, ComparisonResult,
  InsightPackage, InsightPackageVersion, CreateInsightPackageVersionInput,
  BIPublicationPackage, ComponentDeployment, TargetLayer,
} from './repositories/bi/index.js';

// ── Business Digital Twin repositories (Stage 2E) ────────────────────────────────
export {
  DTIntakeRepository,
  DigitalTwinDefinitionRepository,
  DigitalTwinInstanceRepository,
  DigitalTwinSnapshotRepository,
  StateVariableRepository,
  TwinEntityRepository,
  TwinAssumptionConstraintRepository,
  TwinCalibrationRepository,
  TwinValidationRepository,
  ScenarioBaselineRepository,
  DTPublicationPackageRepository,
  DTComponentRegistryRepository,
} from './repositories/dt/index.js';
export type {
  DTIntakePackage, ReceivePackageInput,
  DigitalTwinDefinition, DigitalTwinDefinitionVersion,
  DigitalTwinInstance,
  DigitalTwinSnapshot, DigitalTwinSnapshotVersion,
  StateVariableDefinition, StateVariableValue,
  TwinEntity, TwinRelationship,
  TwinAssumption, TwinConstraint, TwinConstraintEvaluation,
  TwinCalibrationRun,
  TwinValidationRun,
  ScenarioBaseline, ScenarioBaselineVersion,
  DTPublicationPackage,
  DTComponentRegistryEntry, DTDeployment,
} from './repositories/dt/index.js';
