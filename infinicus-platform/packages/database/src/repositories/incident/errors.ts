export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class PlatformIncidentNotFoundError extends NotFoundError {}

export class PlatformIncidentAlreadyResolvedError extends Error {
  constructor(incidentId: string) {
    super(`Incident ${incidentId} is already resolved`);
    this.name = 'PlatformIncidentAlreadyResolvedError';
  }
}
