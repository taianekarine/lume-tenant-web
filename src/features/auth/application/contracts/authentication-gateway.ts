import type { AuthenticatedSession, User } from '../../domain';

export interface AuthenticationCredentials {
  readonly identifier: string;
  readonly password: string;
  readonly remember: boolean;
}

export interface ApiAuthenticationTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshTokenExpiresAt: string;
}

export interface ApiAuthentication {
  readonly session: AuthenticatedSession;
  readonly tokens: ApiAuthenticationTokens;
}

export type AuthenticationResult = ApiAuthentication;

export type AuthenticationGatewayErrorCode =
  | 'invalid-credentials'
  | 'invalid-access-token'
  | 'invalid-password-change-token'
  | 'invalid-refresh-token'
  | 'invalid-response'
  | 'validation-error'
  | 'account-password-setup-required'
  | 'account-inactive'
  | 'account-suspended'
  | 'account-unavailable'
  | 'request-timeout'
  | 'service-unavailable';

export interface PasswordSetupChallenge {
  readonly token: string;
  readonly expiresAt: string;
  readonly reason: 'first-access';
}

const defaultPublicCodeByGatewayError: Readonly<Record<AuthenticationGatewayErrorCode, string>> = {
  'invalid-credentials': 'INVALID_CREDENTIALS',
  'invalid-access-token': 'INVALID_ACCESS_TOKEN',
  'invalid-password-change-token': 'INVALID_PASSWORD_CHANGE_TOKEN',
  'invalid-refresh-token': 'INVALID_REFRESH_TOKEN',
  'invalid-response': 'INVALID_RESPONSE',
  'validation-error': 'VALIDATION_ERROR',
  'account-password-setup-required': 'ACCOUNT_PASSWORD_SETUP_REQUIRED',
  'account-inactive': 'ACCOUNT_INACTIVE',
  'account-suspended': 'ACCOUNT_SUSPENDED',
  'account-unavailable': 'ACCOUNT_UNAVAILABLE',
  'request-timeout': 'REQUEST_TIMEOUT',
  'service-unavailable': 'SERVICE_UNAVAILABLE',
};

export class AuthenticationGatewayError extends Error {
  constructor(
    readonly code: AuthenticationGatewayErrorCode,
    message: string,
    readonly publicCode = defaultPublicCodeByGatewayError[code],
    readonly passwordSetupChallenge?: PasswordSetupChallenge,
  ) {
    super(message);
    this.name = 'AuthenticationGatewayError';
  }
}

export interface AuthenticationGateway {
  authenticate(credentials: AuthenticationCredentials): Promise<AuthenticationResult>;
  getCurrentIdentity(accessToken: string): Promise<User>;
  requestPasswordReset(identifier: string): Promise<void>;
  refresh(refreshToken: string): Promise<ApiAuthentication>;
  logout(refreshToken: string): Promise<void>;
  completePasswordChange(token: string, newPassword: string): Promise<void>;
}
