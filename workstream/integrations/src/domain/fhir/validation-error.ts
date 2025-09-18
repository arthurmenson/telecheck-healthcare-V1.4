export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  static fromValidationResult(result: ValidationResult): ValidationError | null {
    if (result.isValid) {
      return null;
    }
    return new ValidationError(result.errors);
  }
}