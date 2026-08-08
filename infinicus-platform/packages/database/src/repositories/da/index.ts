export { DataSourceRepository, NotFoundError } from './DataSourceRepository.js';
export type { DataSource, CreateDataSourceInput } from './DataSourceRepository.js';

export { ConnectorRepository } from './ConnectorRepository.js';
export type { Connector, CreateConnectorInput } from './ConnectorRepository.js';

export { CollectionRunRepository } from './CollectionRunRepository.js';
export type {
  CollectionRun,
  CreateCollectionRunInput,
  CompleteCollectionRunInput,
} from './CollectionRunRepository.js';

export { ValidationResultRepository } from './ValidationResultRepository.js';
export type {
  ValidationResult,
  ValidationIssue,
  CreateValidationResultInput,
  CreateValidationIssueInput,
} from './ValidationResultRepository.js';

export { DataQualityScoreRepository } from './DataQualityScoreRepository.js';
export type {
  DataQualityScore,
  CreateDataQualityScoreInput,
} from './DataQualityScoreRepository.js';

export { ProvenanceRepository } from './ProvenanceRepository.js';
export type {
  ProvenanceRecord,
  TransformationRecord,
  CreateProvenanceRecordInput,
  CreateTransformationRecordInput,
} from './ProvenanceRepository.js';

export { PublicationPackageRepository } from './PublicationPackageRepository.js';
export type {
  PublicationPackage,
  CreatePublicationPackageInput,
} from './PublicationPackageRepository.js';

export {
  InvalidStateTransitionError,
  DuplicateSourceCodeError,
  ProvenanceError,
  ValidationError,
  UnsupportedConnectorError,
} from './errors.js';

export { runGuardedTransition, statesAllowing } from './guards.js';
export type { GuardedTransitionSpec } from './guards.js';

export { boundedPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './pagination.js';
export type { PageOptions, BoundedPage } from './pagination.js';

export {
  emitSourceRegistered,
  emitConnectorRegistered,
  emitCollectionStarted,
  emitCollectionCompleted,
  emitCollectionFailed,
  emitValidationCompleted,
  emitDataQuarantined,
  emitDataQualityScored,
  emitDataPublished,
} from './outbox.js';
export type {
  OutboxEventId,
  SourceRegisteredEvent,
  ConnectorRegisteredEvent,
  CollectionStartedEvent,
  CollectionCompletedEvent,
  CollectionFailedEvent,
  ValidationCompletedEvent,
  DataQuarantinedEvent,
  DataQualityScoredEvent,
  DataPublishedEvent,
} from './outbox.js';
