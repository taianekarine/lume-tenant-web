/** @jest-environment node */

import type { ApiAuthenticationTokens } from '../../application';
import type { SessionCookieStore } from '../session-storage/cookie-session-storage';
import { CookieApiTokenStorage } from './cookie-api-token-storage';

const SESSION_SECRET = 'test-session-secret-with-more-than-thirty-two-bytes';

const tokens: ApiAuthenticationTokens = {
  accessToken: 'signed-access-token',
  refreshToken: 'refresh-token-with-at-least-forty-characters-123456',
  accessTokenExpiresAt: '2099-07-23T10:15:00.000Z',
  refreshTokenExpiresAt: '2099-08-22T10:00:00.000Z',
};

function createCookieStore(): SessionCookieStore & {
  readonly values: Map<string, string>;
  readonly set: jest.Mock;
  readonly delete: jest.Mock;
} {
  const values = new Map<string, string>();

  return {
    values,
    get: (name) => {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set: jest.fn((name: string, value: string) => {
      values.set(name, value);
    }),
    delete: jest.fn((name: string) => {
      values.delete(name);
    }),
  };
}

describe('CookieApiTokenStorage', () => {
  it('encrypts API credentials in a dedicated HTTP-only cookie', async () => {
    const cookieStore = createCookieStore();
    const storage = new CookieApiTokenStorage(cookieStore, SESSION_SECRET, {
      secure: false,
    });

    await storage.save(tokens);

    const encryptedValue = cookieStore.values.get('lume_tenant_api_tokens');

    expect(encryptedValue).toBeDefined();
    expect(encryptedValue).not.toContain(tokens.accessToken);
    expect(encryptedValue).not.toContain(tokens.refreshToken);
    expect(cookieStore.set).toHaveBeenCalledWith('lume_tenant_api_tokens', expect.any(String), {
      expires: new Date(tokens.refreshTokenExpiresAt),
      httpOnly: true,
      path: '/',
      priority: 'high',
      sameSite: 'lax',
      secure: false,
    });
    await expect(storage.get()).resolves.toEqual(tokens);
  });

  it('supports an isolated cookie name and path for the platform administration', async () => {
    const cookieStore = createCookieStore();
    const storage = new CookieApiTokenStorage(cookieStore, SESSION_SECRET, {
      cookieName: 'milenium_platform_api_tokens',
      path: '/platform',
      secure: true,
    });

    await storage.save(tokens);

    expect(cookieStore.set).toHaveBeenCalledWith(
      'milenium_platform_api_tokens',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        path: '/platform',
        secure: true,
      }),
    );
    await expect(storage.get()).resolves.toEqual(tokens);
  });

  it('returns null for an absent or corrupted token cookie', async () => {
    const cookieStore = createCookieStore();
    const storage = new CookieApiTokenStorage(cookieStore, SESSION_SECRET);

    await expect(storage.get()).resolves.toBeNull();

    cookieStore.values.set('lume_tenant_api_tokens', 'corrupted-token');

    await expect(storage.get()).resolves.toBeNull();
  });

  it('removes the token cookie', async () => {
    const cookieStore = createCookieStore();
    const storage = new CookieApiTokenStorage(cookieStore, SESSION_SECRET);

    await storage.save(tokens);
    await storage.remove();

    expect(cookieStore.delete).toHaveBeenCalledWith('lume_tenant_api_tokens');
    expect(cookieStore.values.has('lume_tenant_api_tokens')).toBe(false);
  });
});
