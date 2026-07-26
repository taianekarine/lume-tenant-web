/** @jest-environment node */

import { redirect } from 'next/navigation';

import type {
  ApiAuthenticationTokens,
  ApiTokenStorage,
  AuthenticationGateway,
  SessionStorage,
} from '../application';
import {
  createCookieApiTokenStorage,
  createCookieSessionStorage,
  createTenantApiAuthenticationGateway,
} from '../infrastructure';
import { logoutAction } from './logout-action';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('../infrastructure', () => ({
  createCookieApiTokenStorage: jest.fn(),
  createCookieSessionStorage: jest.fn(),
  createTenantApiAuthenticationGateway: jest.fn(),
}));

const mockedCreateCookieApiTokenStorage = jest.mocked(createCookieApiTokenStorage);
const mockedCreateCookieSessionStorage = jest.mocked(createCookieSessionStorage);
const mockedCreateTenantApiAuthenticationGateway = jest.mocked(
  createTenantApiAuthenticationGateway,
);
const mockedRedirect = jest.mocked(redirect);

const apiTokens: ApiAuthenticationTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token-with-at-least-forty-characters-123456',
  accessTokenExpiresAt: '2026-07-23T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-08-22T10:00:00.000Z',
};

function createSessionStorageMock(): SessionStorage {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

function createApiTokenStorageMock(): ApiTokenStorage {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

function createAuthenticationGatewayMock(): AuthenticationGateway {
  return {
    authenticate: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  };
}

describe('logoutAction', () => {
  let sessionStorage: SessionStorage;
  let apiTokenStorage: ApiTokenStorage;
  let authenticationGateway: AuthenticationGateway;

  beforeEach(() => {
    sessionStorage = createSessionStorageMock();
    apiTokenStorage = createApiTokenStorageMock();
    authenticationGateway = createAuthenticationGatewayMock();
    mockedCreateCookieSessionStorage.mockResolvedValue(sessionStorage);
    mockedCreateCookieApiTokenStorage.mockResolvedValue(apiTokenStorage);
    mockedCreateTenantApiAuthenticationGateway.mockReturnValue(authenticationGateway);
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  afterEach(() => {
    mockedCreateCookieApiTokenStorage.mockReset();
    mockedCreateCookieSessionStorage.mockReset();
    mockedCreateTenantApiAuthenticationGateway.mockReset();
    mockedRedirect.mockReset();
  });

  it('removes the local session and API token cookie', async () => {
    await expect(logoutAction({ message: null }, new FormData())).rejects.toThrow('NEXT_REDIRECT');

    expect(sessionStorage.remove).toHaveBeenCalledTimes(1);
    expect(apiTokenStorage.remove).toHaveBeenCalledTimes(1);
    expect(authenticationGateway.logout).not.toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledWith('/login');
  });

  it('revokes the refresh token before removing a real API session', async () => {
    jest.mocked(apiTokenStorage.get).mockResolvedValue(apiTokens);

    await expect(logoutAction({ message: null }, new FormData())).rejects.toThrow('NEXT_REDIRECT');

    expect(authenticationGateway.logout).toHaveBeenCalledWith(apiTokens.refreshToken);
    expect(sessionStorage.remove).toHaveBeenCalledTimes(1);
    expect(apiTokenStorage.remove).toHaveBeenCalledTimes(1);
  });

  it('finishes local logout when the API is unavailable', async () => {
    jest.mocked(apiTokenStorage.get).mockResolvedValue(apiTokens);
    jest.mocked(authenticationGateway.logout).mockRejectedValue(new Error('Offline'));

    await expect(logoutAction({ message: null }, new FormData())).rejects.toThrow('NEXT_REDIRECT');

    expect(sessionStorage.remove).toHaveBeenCalledTimes(1);
    expect(apiTokenStorage.remove).toHaveBeenCalledTimes(1);
  });

  it('returns a safe error when local session removal fails', async () => {
    jest.mocked(sessionStorage.remove).mockRejectedValue(new Error('Cookie failure'));

    await expect(logoutAction({ message: null }, new FormData())).resolves.toEqual({
      message: 'Não foi possível encerrar sua sessão. Tente novamente.',
    });

    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});
