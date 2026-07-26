import type { ApiAuthenticationTokens } from '../contracts';

export const ACCESS_TOKEN_REFRESH_WINDOW_MS = 30_000;

export function shouldRefreshApiToken(tokens: ApiAuthenticationTokens, now = new Date()): boolean {
  const expiresAt = Date.parse(tokens.accessTokenExpiresAt);

  return !Number.isFinite(expiresAt) || expiresAt - now.getTime() <= ACCESS_TOKEN_REFRESH_WINDOW_MS;
}
