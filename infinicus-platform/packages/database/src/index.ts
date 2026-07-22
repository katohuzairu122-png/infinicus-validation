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

// ── Outcome Monitoring repositories (Stage 2I) ──────────────────────────────────
export {
  OMIntakeRepository,
  MonitoringPlanRepository,
  MonitoredActionRepository,
  OutcomeObservationRepository,
  OutcomeTargetRepository,
  OutcomeVarianceRepository,
  MonitoringAlertRepository,
  MonitoringIncidentRepository,
  OutcomeAttributionRepository,
  OutcomeReviewRepository,
  LearningFeedbackPackageRepository,
  OMPublicationRepository,
  OMComponentRegistryRepository,
} from './repositories/om/index.js';
export type {
  OMIntakePackage, ReceiveOMPackageInput,
  MonitoringPlan,
  MonitoredAction,
  OutcomeObservation, OutcomeObservationVersion,
  OutcomeTarget,
  OutcomeVarianceRun,
  MonitoringAlertRule, MonitoringAlert,
  MonitoringIncident,
  OutcomeAttributionRun,
  OutcomeReview,
  LearningFeedbackPackage,
  OMPublicationPackage,
  OMComponentRegistryEntry, OMDeployment,
} from './repositories/om/index.js';

// ── Continuous Learning repositories (Stage 2J) ─────────────────────────────────
export {
  CLIntakeRepository,
  LearningCaseRepository,
  LearningFeedbackRepository,
  LearnedLessonRepository,
  LearningPatternRepository,
  ModelEvaluationRepository,
  PolicyEvaluationRepository,
  ImprovementProposalRepository,
  LearningChangeReviewRepository,
  KnowledgeArtifactRepository,
  CLFeedbackPublicationRepository,
  CLComponentRegistryRepository,
} from './repositories/cl/index.js';
export type {
  CLIntakePackage, ReceiveCLPackageInput,
  LearningCase,
  LearningFeedbackRecord,
  LearnedLesson,
  LearningPattern,
  ModelEvaluationRun,
  PolicyEvaluationRun, PolicyChangeProposal,
  ImprovementProposal, ImprovementProposalVersion,
  LearningChangeReview, LearningChangeRelease,
  KnowledgeArtifact,
  CLFeedbackPackage,
  CLComponentRegistryEntry, CLDeployment,
} from './repositories/cl/index.js';

// ── Authentication and Authorization repositories (BUILD-18) ────────────────────
export {
  UserNotFoundError, UserAlreadyExistsError,
  SessionNotFoundError,
  ServiceAccountNotFoundError,
  ApiKeyNotFoundError,
  RoleNotFoundError,
  PermissionNotFoundError,
  MembershipNotFoundError, MembershipAlreadyExistsError,
  InvitationNotFoundError, InvitationStateConflictError,
} from './repositories/auth/errors.js';
export {
  UserRepository,
  SessionRepository,
  ServiceAccountRepository,
  ApiKeyRepository,
  RoleRepository,
  PermissionRepository,
  MembershipRepository,
  InvitationRepository,
  AccessEventRepository,
} from './repositories/auth/index.js';
export type {
  User, CreateUserInput,
  Session,
  ServiceAccount,
  ApiKeyReference,
  Role,
  Permission,
  Membership,
  Invitation,
  AccessEvent, AccessEventType,
} from './repositories/auth/index.js';
