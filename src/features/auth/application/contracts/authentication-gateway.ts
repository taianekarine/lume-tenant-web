import type { AuthenticatedSession } from '../../domain';

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

export type AuthenticationGatewayErrorCode =
  'invalid-credentials' | 'invalid-refresh-token' | 'invalid-response' | 'service-unavailable';

export class AuthenticationGatewayError extends Error {
  constructor(
    readonly code: AuthenticationGatewayErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthenticationGatewayError';
  }
}

export interface AuthenticationGateway {
  authenticate(credentials: AuthenticationCredentials): Promise<ApiAuthentication>;
  refresh(refreshToken: string): Promise<ApiAuthentication>;
  logout(refreshToken: string): Promise<void>;
}
