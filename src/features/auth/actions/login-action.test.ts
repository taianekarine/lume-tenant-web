/** @jest-environment node */

import { redirect } from 'next/navigation';

import {
  AuthenticationGatewayError,
  type ApiTokenStorage,
  type AuthenticationGateway,
  type SessionStorage,
} from '../application';
import {
  AUTHENTICATED_SESSION_VERSION,
  resolveAccessPermissions,
  type AuthenticatedSession,
} from '../domain';
import {
  createCookieApiTokenStorage,
  createCookieSessionStorage,
  createTenantApiAuthenticationGateway,
} from '../infrastructure';
import { SIMULATED_EMPLOYEE_USERS, SIMULATED_USER_PASSWORD } from '../simulation';
import { loginAction } from './login-action';

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
const originalSimulationFlag = process.env.AUTH_SIMULATION_ENABLED;

const apiSession: AuthenticatedSession = {
  version: AUTHENTICATED_SESSION_VERSION,
  id: 'api-session-id',
  user: {
    id: 'api-user-id',
    name: 'Administrador da API',
    type: 'employee',
    departments: ['commercial'],
    roles: ['administrator'],
    permissions: ['dashboard:view', 'whatsapp-conversations:manage'],
    clientCategory: null,
    isActive: true,
  },
  issuedAt: '2026-07-23T10:00:00.000Z',
  expiresAt: '2026-08-22T10:00:00.000Z',
  rememberDevice: true,
};

const apiTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token-with-at-least-forty-characters-123456',
  accessTokenExpiresAt: '2026-07-23T10:15:00.000Z',
  refreshTokenExpiresAt: apiSession.expiresAt,
} as const;

function createSessionStorageMock(): SessionStorage {
  return {
    save: jest
      .fn<ReturnType<SessionStorage['save']>, Parameters<SessionStorage['save']>>()
      .mockResolvedValue(undefined),
    get: jest
      .fn<ReturnType<SessionStorage['get']>, Parameters<SessionStorage['get']>>()
      .mockResolvedValue(null),
    remove: jest
      .fn<ReturnType<SessionStorage['remove']>, Parameters<SessionStorage['remove']>>()
      .mockResolvedValue(undefined),
  };
}

function createApiTokenStorageMock(): ApiTokenStorage {
  return {
    save: jest
      .fn<ReturnType<ApiTokenStorage['save']>, Parameters<ApiTokenStorage['save']>>()
      .mockResolvedValue(undefined),
    get: jest
      .fn<ReturnType<ApiTokenStorage['get']>, Parameters<ApiTokenStorage['get']>>()
      .mockResolvedValue(null),
    remove: jest
      .fn<ReturnType<ApiTokenStorage['remove']>, Parameters<ApiTokenStorage['remove']>>()
      .mockResolvedValue(undefined),
  };
}

function createAuthenticationGatewayMock(): AuthenticationGateway {
  return {
    authenticate: jest.fn().mockResolvedValue({
      session: apiSession,
      tokens: apiTokens,
    }),
    refresh: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  };
}

function restoreSimulationFlag(value: string | undefined) {
  if (value === undefined) {
    delete process.env.AUTH_SIMULATION_ENABLED;
    return;
  }

  process.env.AUTH_SIMULATION_ENABLED = value;
}

describe('loginAction', () => {
  let sessionStorage: SessionStorage;
  let apiTokenStorage: ApiTokenStorage;
  let authenticationGateway: AuthenticationGateway;

  beforeEach(() => {
    process.env.AUTH_SIMULATION_ENABLED = 'true';
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
    restoreSimulationFlag(originalSimulationFlag);
  });

  it('rejects invalid input before creating infrastructure adapters', async () => {
    await expect(
      loginAction({
        identifier: '',
        password: '',
        remember: false,
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Informe seu usuário, e-mail ou CPF.',
    });

    expect(mockedCreateCookieSessionStorage).not.toHaveBeenCalled();
    expect(mockedCreateCookieApiTokenStorage).not.toHaveBeenCalled();
    expect(mockedCreateTenantApiAuthenticationGateway).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it.each(SIMULATED_EMPLOYEE_USERS)(
    'creates the configured simulated session for $identifier',
    async (user) => {
      await expect(
        loginAction({
          identifier: user.identifier,
          password: user.password,
          remember: false,
        }),
      ).rejects.toThrow('NEXT_REDIRECT');

      const savedSession = jest.mocked(sessionStorage.save).mock.calls[0]?.[0];

      expect(savedSession).toMatchObject({
        user: {
          id: user.id,
          name: user.name,
          type: 'employee',
          departments: user.departments,
          roles: user.roles,
          isActive: true,
        },
        rememberDevice: false,
      });
      expect(savedSession?.user.permissions).toEqual(
        resolveAccessPermissions({
          type: 'employee',
          departments: user.departments,
          roles: user.roles,
        }),
      );
      expect(JSON.stringify(savedSession)).not.toContain(user.identifier);
      expect(JSON.stringify(savedSession)).not.toContain(user.password);
      expect(apiTokenStorage.remove).toHaveBeenCalledTimes(1);
      expect(authenticationGateway.authenticate).not.toHaveBeenCalled();
      expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');
    },
  );

  it('keeps simulated external-client access disabled', async () => {
    await expect(
      loginAction({
        identifier: '11.222.333/0001-81',
        password: SIMULATED_USER_PASSWORD,
        remember: true,
      }),
    ).resolves.toEqual({
      success: false,
      message: 'O acesso por CNPJ ainda não está disponível.',
    });

    expect(sessionStorage.save).not.toHaveBeenCalled();
    expect(authenticationGateway.authenticate).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown user', 'usuario.inexistente', SIMULATED_USER_PASSWORD],
    ['wrong password', 'rh.teste', 'senha-incorreta'],
  ])(
    'rejects simulated %s with a generic credential error',
    async (_case, identifier, password) => {
      await expect(
        loginAction({
          identifier,
          password,
          remember: false,
        }),
      ).resolves.toEqual({
        success: false,
        message: 'Usuário ou senha inválidos.',
      });

      expect(mockedCreateCookieSessionStorage).not.toHaveBeenCalled();
      expect(mockedRedirect).not.toHaveBeenCalled();
    },
  );

  it('authenticates against the API when simulation is disabled', async () => {
    process.env.AUTH_SIMULATION_ENABLED = 'false';

    await expect(
      loginAction({
        identifier: 'administrador.api',
        password: 'SenhaForte@2026',
        remember: true,
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(authenticationGateway.authenticate).toHaveBeenCalledWith({
      identifier: 'administrador.api',
      password: 'SenhaForte@2026',
      remember: true,
    });
    expect(sessionStorage.save).toHaveBeenCalledWith(apiSession);
    expect(apiTokenStorage.save).toHaveBeenCalledWith(apiTokens);
    expect(apiTokenStorage.remove).not.toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('uses the API when the simulation flag is absent', async () => {
    delete process.env.AUTH_SIMULATION_ENABLED;

    await expect(
      loginAction({
        identifier: 'administrador.api',
        password: 'SenhaForte@2026',
        remember: false,
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(authenticationGateway.authenticate).toHaveBeenCalledTimes(1);
  });

  it('returns a generic credential error when the API rejects the login', async () => {
    process.env.AUTH_SIMULATION_ENABLED = 'false';
    jest
      .mocked(authenticationGateway.authenticate)
      .mockRejectedValue(new AuthenticationGatewayError('invalid-credentials', 'Rejected'));

    await expect(
      loginAction({
        identifier: 'administrador.api',
        password: 'senha-incorreta',
        remember: false,
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Usuário ou senha inválidos.',
    });

    expect(mockedCreateCookieSessionStorage).not.toHaveBeenCalled();
    expect(apiTokenStorage.save).not.toHaveBeenCalled();
  });

  it('returns a safe error when the API is unavailable', async () => {
    process.env.AUTH_SIMULATION_ENABLED = 'false';
    jest
      .mocked(authenticationGateway.authenticate)
      .mockRejectedValue(new AuthenticationGatewayError('service-unavailable', 'Offline'));

    await expect(
      loginAction({
        identifier: 'administrador.api',
        password: 'SenhaForte@2026',
        remember: false,
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Não foi possível conectar ao serviço de autenticação. Tente novamente.',
    });

    expect(mockedCreateCookieSessionStorage).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('returns a safe error when simulated session persistence fails', async () => {
    mockedCreateCookieSessionStorage.mockRejectedValue(new Error('Missing secret'));

    await expect(
      loginAction({
        identifier: 'rh.teste',
        password: SIMULATED_USER_PASSWORD,
        remember: false,
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Não foi possível iniciar sua sessão. Tente novamente.',
    });

    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('revokes the remote session when local API token persistence fails', async () => {
    process.env.AUTH_SIMULATION_ENABLED = 'false';
    jest.mocked(apiTokenStorage.save).mockRejectedValue(new Error('Cookie failure'));

    await expect(
      loginAction({
        identifier: 'administrador.api',
        password: 'SenhaForte@2026',
        remember: true,
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Não foi possível iniciar sua sessão. Tente novamente.',
    });

    expect(authenticationGateway.logout).toHaveBeenCalledWith(apiTokens.refreshToken);
    expect(sessionStorage.remove).toHaveBeenCalledTimes(1);
    expect(apiTokenStorage.remove).toHaveBeenCalledTimes(1);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});
