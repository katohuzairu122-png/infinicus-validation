/**
 * Compatibility adapter template.
 *
 * Replace placeholder types only after inspecting the repository.
 * Do not use this template to bypass validation or authority boundaries.
 */
export interface CompatibilityAdapter<From, To> {
  readonly fromVersion: string;
  readonly toVersion: string;
  validate(input: unknown): input is From;
  adapt(input: From): To;
}

export class CompatibilityAdapterError extends Error {
  readonly code = 'compatibility_adapter_failed';

  constructor(message: string, readonly reasons: readonly string[] = []) {
    super(message);
    this.name = 'CompatibilityAdapterError';
  }
}
