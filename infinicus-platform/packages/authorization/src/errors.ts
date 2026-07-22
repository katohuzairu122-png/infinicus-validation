export class PermissionDeniedError extends Error {
  constructor(permissionCode: string) {
    super(`Permission denied: ${permissionCode}`);
    this.name = 'PermissionDeniedError';
  }
}

export class MembershipNotActiveError extends Error {
  constructor(status: string) {
    super(`Membership is not active (status: ${status})`);
    this.name = 'MembershipNotActiveError';
  }
}

export class InvitationTokenInvalidError extends Error {
  constructor() {
    super('Invitation token is invalid or malformed');
    this.name = 'InvitationTokenInvalidError';
  }
}

export class InvitationExpiredError extends Error {
  constructor() {
    super('Invitation has expired');
    this.name = 'InvitationExpiredError';
  }
}
