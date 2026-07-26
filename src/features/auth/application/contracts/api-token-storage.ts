import type { ApiAuthenticationTokens } from './authentication-gateway';

export interface ApiTokenStorage {
  save(tokens: ApiAuthenticationTokens): Promise<void>;
  get(): Promise<ApiAuthenticationTokens | null>;
  remove(): Promise<void>;
}
