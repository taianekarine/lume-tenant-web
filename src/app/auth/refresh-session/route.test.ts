/** @jest-environment node */

import { NextRequest } from 'next/server';

import type { ApiAuthentication, AuthenticationGateway } from '@/features/auth/application';
import { AUTHENTICATED_SESSION_VERSION } from '@/features/auth/domain';
import {
  API_TOKEN_COOKIE_NAME,
  decryptApiAuthenticationTokens,
  encryptApiAuthenticationTokens,
} from '@/features/auth/infrastructure/api-token-storage';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAMES,
} from '@/features/auth/infrastructure/session-storage';
import { createTenantApiAuthenticationGateway } from '@/features/auth/infrastructure/tenant-api';

import { GET } from './route';

jest.mock('@/features/auth/infrastructure/tenant-api', () => ({
  createTenantApiAuthenticationGateway: jest.fn(),
}));

const SESSION_SECRET = 'test-session-secret-with-at-least-32-bytes';
const mockedCreateAuthenticationGateway = jest.mocked(createTenantApiAuthenticationGateway);

function authentication(): ApiAuthentication {
  return {
    session: {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-001',
      user: {
        id: 'user-001',
        name: 'Ana Souza',
        type: 'employee',
        departments: ['commercial'],
        roles: ['manager'],
        permissions: ['dashboard:view'],
        clientCategory: null,
        isActive: true,
      },
      issuedAt: '2026-07-25T12:00:00.000Z',
      expiresAt: '2027-07-25T12:00:00.000Z',
      rememberDevice: true,
    },
    tokens: {
      accessToken: 'new-access-token',
      refreshToken: 'n'.repeat(40),
      accessTokenExpiresAt: '2026-07-25T12:15:00.000Z',
      refreshTokenExpiresAt: '2027-07-25T12:00:00.000Z',
    },
  };
}

async function refreshRequest(returnTo = '/users?page=2'): Promise<NextRequest> {
  const currentTokens = {
    accessToken: 'old-access-token',
    refreshToken: 'o'.repeat(40),
    accessTokenExpiresAt: '2026-07-25T12:00:10.000Z',
    refreshTokenExpiresAt: '2027-07-25T12:00:00.000Z',
  };
  const encryptedTokens = await encryptApiAuthenticationTokens(currentTokens, SESSION_SECRET);
  const url = new URL('http://localhost:3000/auth/refresh-session');
  url.searchParams.set('returnTo', returnTo);

  return new NextRequest(url, {
    headers: {
      Cookie: `${API_TOKEN_COOKIE_NAME}=${encryptedTokens}`,
    },
  });
}

describe('GET /auth/refresh-session', () => {
  const originalSessionSecret = process.env.SESSION_SECRET;
  let gateway: jest.Mocked<AuthenticationGateway>;

  beforeEach(() => {
    process.env.SESSION_SECRET = SESSION_SECRET;
    gateway = {
      authenticate: jest.fn(),
      refresh: jest.fn().mockResolvedValue(authentication()),
      logout: jest.fn(),
    };
    mockedCreateAuthenticationGateway.mockReturnValue(gateway);
  });

  afterEach(() => {
    mockedCreateAuthenticationGateway.mockReset();
  });

  afterAll(() => {
    if (originalSessionSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSessionSecret;
    }
  });

  it('rotates the API tokens, updates the session and returns to the local page', async () => {
    const response = await GET(await refreshRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/users?page=2');
    expect(gateway.refresh).toHaveBeenCalledWith('o'.repeat(40));
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBeTruthy();

    const encryptedTokens = response.cookies.get(API_TOKEN_COOKIE_NAME)?.value;
    expect(encryptedTokens).toBeTruthy();
    await expect(
      decryptApiAuthenticationTokens(encryptedTokens ?? '', SESSION_SECRET),
    ).resolves.toEqual(authentication().tokens);
  });

  it('clears local cookies and redirects to login when refresh is rejected', async () => {
    gateway.refresh.mockRejectedValue(new Error('invalid refresh token'));

    const response = await GET(await refreshRequest());

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    SESSION_COOKIE_NAMES.forEach((cookieName) => {
      expect(response.cookies.get(cookieName)?.value).toBe('');
    });
    expect(response.cookies.get(API_TOKEN_COOKIE_NAME)?.value).toBe('');
  });

  it('rejects an external return destination', async () => {
    const response = await GET(await refreshRequest('//attacker.example/collect'));

    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });
});
