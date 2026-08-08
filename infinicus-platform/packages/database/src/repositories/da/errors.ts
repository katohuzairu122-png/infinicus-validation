/**
 * Controlled error types for the Data Acquisition persistence layer.
 *
 * NotFoundError previously lived in DataSourceRepository.ts. It is moved here
 * so BUILD-31 transition errors can share a dedicated module without circular
 * imports. DataSourceRepository.ts must re-export NotFoundError to preserve the
 * existing public import path.
 */

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(entity + ' not found: ' + id);
    this.name = 'NotFoundError';
  }
}

export class InvalidStateTransitionError extends Error {
  readonly entity: string;
  readonly id: string;
  readonly expected: readonly string[];
  readonly actual: string;
  readonly requested: string;

  constructor(
    entity: string,
    id: string,
    expected: readonly string[],
    actual: string,
    requested: string,
  ) {
    const allowed = expected.join(', ');

    super(
      'Cannot transition ' +
        entity +
        ' ' +
        id +
        ' to "' +
        requested +
        '": expected current state one of [' +
        allowed +
        '], found "' +
        actual +
        '"',
    );

    this.name = 'InvalidStateTransitionError';
    this.entity = entity;
    this.id = id;
    this.expected = expected;
    this.actual = actual;
    this.requested = requested;
  }
}

export class DuplicateSourceCodeError extends Error {
  readonly sourceCode: string;

  constructor(sourceCode: string) {
    super(
      'A data source with code "' +
        sourceCode +
        '" already exists in this workspace',
    );

    this.name = 'DuplicateSourceCodeError';
    this.sourceCode = sourceCode;
  }
}

export class ProvenanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvenanceError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnsupportedConnectorError extends Error {
  readonly connectorType: string;

  constructor(connectorType: string) {
    super('Unsupported connector type: "' + connectorType + '"');

    this.name = 'UnsupportedConnectorError';
    this.connectorType = connectorType;
  }
}
