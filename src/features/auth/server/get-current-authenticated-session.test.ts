/** @jest-environment node */

import type { SessionStorage } from '../application';
import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '../domain';
import { createCookieSessionStorage } from '../infrastructure';
import { getCurrentAuthenticatedSession } from './get-current-authenticated-session';

jest.mock('../infrastructure', () => ({
  createCookieSessionStorage: jest.fn(),
}));

const mockedCreateCookieSessionStorage = jest.mocked(createCookieSessionStorage);

function createValidSession(): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-employee-001',
    user: {
      id: 'employee-001',
      name: 'Usuário de demonstração',
      type: 'employee',
      departments: [],
      roles: [],
      permissions: ['dashboard:view'],
      clientCategory: null,
      isActive: true,
    },
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    rememberDevice: false,
  };
}

function createSessionStorageMock(session: AuthenticatedSession | null): SessionStorage {
  return {
    save: jest
      .fn<ReturnType<SessionStorage['save']>, Parameters<SessionStorage['save']>>()
      .mockResolvedValue(undefined),
    get: jest
      .fn<ReturnType<SessionStorage['get']>, Parameters<SessionStorage['get']>>()
      .mockResolvedValue(session),
    remove: jest
      .fn<ReturnType<SessionStorage['remove']>, Parameters<SessionStorage['remove']>>()
      .mockResolvedValue(undefined),
  };
}

describe('getCurrentAuthenticatedSession', () => {
  afterEach(() => {
    mockedCreateCookieSessionStorage.mockReset();
  });

  it('returns the current valid session', async () => {
    const session = createValidSession();

    mockedCreateCookieSessionStorage.mockResolvedValue(createSessionStorageMock(session));

    await expect(getCurrentAuthenticatedSession()).resolves.toEqual(session);
  });

  it('returns null for an expired session', async () => {
    const expiredSession: AuthenticatedSession = {
      ...createValidSession(),
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    };

    mockedCreateCookieSessionStorage.mockResolvedValue(createSessionStorageMock(expiredSession));

    await expect(getCurrentAuthenticatedSession()).resolves.toBeNull();
  });

  it('returns null when the storage adapter is unavailable', async () => {
    mockedCreateCookieSessionStorage.mockRejectedValue(new Error('Missing session configuration'));

    await expect(getCurrentAuthenticatedSession()).resolves.toBeNull();
  });
});
