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

// ── Simulation repositories (Stage 2F) ────────────────────────────────────────────
export {
  SimulationIntakeRepository,
  SimulationModelRepository,
  SimulationScenarioRepository,
  SimulationRunRepository,
  SimulationResultRepository,
  SimulationRiskRepository,
  SimulationSensitivityRepository,
  ScenarioComparisonRepository,
  SimulationValidationRepository,
  SimulationPublicationRepository,
  SimulationComponentRegistryRepository,
} from './repositories/simulation/index.js';
export type {
  SimulationIntakePackage, ReceiveSimulationPackageInput,
  SimulationModel, SimulationModelVersion,
  SimulationScenario, SimulationScenarioVersion,
  SimulationRequest, SimulationRun,
  SimulationResult, SimulationResultVersion,
  SimulationRiskResult, SimulationFailureMode,
  SimulationSensitivityRun, SimulationSensitivityResult,
  ScenarioComparisonRun,
  SimulationValidationRun, SimulationCalibrationRun,
  SimulationPublicationPackage,
  SimulationComponentRegistryEntry, SimulationDeployment,
} from './repositories/simulation/index.js';

// ── AI Decision Intelligence repositories (Stage 2G) ──────────────────────────────
export {
  ADIIntakeRepository,
  DecisionQuestionRepository,
  DecisionCaseRepository,
  ReasoningRunRepository,
  DecisionEvidenceRepository,
  DecisionAlternativeRepository,
  DecisionRecommendationRepository,
  DecisionConfidenceRepository,
  DecisionPolicyRepository,
  DecisionMonitoringRequirementRepository,
  ADIPublicationRepository,
  ADIComponentRegistryRepository,
} from './repositories/adi/index.js';
export type {
  ADIIntakePackage, ReceiveADIPackageInput,
  DecisionQuestion,
  DecisionCase,
  ReasoningRequest, ReasoningRun,
  DecisionEvidence,
  DecisionAlternative,
  DecisionRecommendation, DecisionRecommendationVersion,
  DecisionConfidenceScore,
  DecisionPolicy,
  DecisionMonitoringRequirement, DecisionReviewSchedule,
  ADIPublicationPackage,
  ADIComponentRegistryEntry, ADIDeployment,
} from './repositories/adi/index.js';

// ── Approved Business Action repositories (Stage 2H) ───────────────────────────────
export {
  ABAIntakeRepository,
  ActionReviewRepository,
  ApprovalPolicyRepository,
  ApproverAuthorityRepository,
  ApprovalDecisionRepository,
  ApprovedActionRepository,
  ActionExecutionPlanRepository,
  ActionControlGateRepository,
  ApprovalExceptionRepository,
  ApprovalAppealRepository,
  ABAAuditRepository,
  ABAPublicationRepository,
  ABAComponentRegistryRepository,
} from './repositories/approved_action/index.js';
export type {
  ABAIntakePackage, ReceiveABAPackageInput,
  ActionReviewPackage,
  ApprovalPolicy,
  ApproverAssignment, ApprovalDelegation,
  ApprovalDecision, ApprovalDecisionVersion,
  ApprovedAction,
  ActionExecutionPlan,
  ActionControlGate, ActionHold, ActionRelease,
  ApprovalException,
  ApprovalAppeal, ApprovalAppealDecision,
  ApprovalAttestation, ApprovalSignature,
  ABAPublicationPackage,
  ABAComponentRegistryEntry, ABADeployment,
} from './repositories/approved_action/index.js';
