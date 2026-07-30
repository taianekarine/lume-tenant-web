const PUBLIC_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,79}$/;

export const AUTH_FALLBACK_ERROR_CODES = {
  validation: 'VALIDATION_ERROR',
  unexpected: 'UNEXPECTED_ERROR',
  sessionInitialization: 'SESSION_INITIALIZATION_FAILED',
  missingPasswordResetToken: 'INVALID_PASSWORD_CHANGE_TOKEN',
} as const;

export interface AuthFailureFeedback {
  readonly success: false;
  readonly message: string;
  readonly errorCode: string;
}

export function normalizePublicErrorCode(value: unknown, fallback: string): string {
  return typeof value === 'string' && PUBLIC_ERROR_CODE_PATTERN.test(value) ? value : fallback;
}
