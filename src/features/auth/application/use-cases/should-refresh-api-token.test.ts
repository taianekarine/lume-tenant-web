import type { ApiAuthenticationTokens } from '../contracts';
import { ACCESS_TOKEN_REFRESH_WINDOW_MS, shouldRefreshApiToken } from './should-refresh-api-token';

function tokens(accessTokenExpiresAt: string): ApiAuthenticationTokens {
  return {
    accessToken: 'access-token',
    refreshToken: 'r'.repeat(40),
    accessTokenExpiresAt,
    refreshTokenExpiresAt: '2027-07-25T00:00:00.000Z',
  };
}

describe('shouldRefreshApiToken', () => {
  const now = new Date('2026-07-25T12:00:00.000Z');

  it('keeps an access token outside the refresh window', () => {
    const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_REFRESH_WINDOW_MS + 1).toISOString();

    expect(shouldRefreshApiToken(tokens(expiresAt), now)).toBe(false);
  });

  it('refreshes an access token inside the refresh window', () => {
    const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_REFRESH_WINDOW_MS).toISOString();

    expect(shouldRefreshApiToken(tokens(expiresAt), now)).toBe(true);
  });

  it('refreshes an access token with an invalid expiration', () => {
    expect(shouldRefreshApiToken(tokens('invalid-date'), now)).toBe(true);
  });
});
