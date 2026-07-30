/** @jest-environment node */

import { AuthenticationGatewayError } from '../../application';
import {
  TenantApiAuthenticationGateway,
  resolveTenantApiBaseUrl,
  resolveTenantApiTimeout,
} from './tenant-api-authentication-gateway';

const responseBody = {
  accessToken: 'signed-access-token',
  refreshToken: 'refresh-token-with-at-least-forty-characters-123456',
  tokenType: 'Bearer',
  expiresIn: 900,
  session: {
    version: 1,
    id: 'refresh-token-id',
    user: {
      id: 'user-id',
      name: 'Administrador Milenium',
      username: 'administrador',
      email: 'administrador@example.test',
      cpf: null,
      type: 'employee',
      departments: ['commercial'],
      permissions: ['dashboard:view', 'whatsapp-conversations:manage'],
      clientCategory: null,
      isActive: true,
      createdAt: '2026-07-22T09:00:00.000Z',
      updatedAt: '2026-07-23T09:00:00.000Z',
    },
    issuedAt: '2026-07-23T10:00:00.000Z',
    expiresAt: '2026-08-22T10:00:00.000Z',
    rememberDevice: true,
  },
} as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TenantApiAuthenticationGateway', () => {
  it('authenticates an employee and maps the backend session to the frontend contract', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse(responseBody));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1/',
      fetcher,
      now: () => new Date('2026-07-23T10:00:00.000Z'),
      timeoutMs: 1_000,
    });

    await expect(
      gateway.authenticate({
        identifier: 'administrador',
        password: 'SenhaForte@2026',
        remember: true,
      }),
    ).resolves.toEqual({
      session: {
        version: 1,
        id: 'refresh-token-id',
        user: {
          id: 'user-id',
          name: 'Administrador Milenium',
          type: 'employee',
          departments: ['commercial'],
          permissions: ['dashboard:view', 'whatsapp-conversations:manage'],
          clientCategory: null,
          isActive: true,
        },
        issuedAt: '2026-07-23T10:00:00.000Z',
        expiresAt: '2026-08-22T10:00:00.000Z',
        rememberDevice: true,
      },
      tokens: {
        accessToken: 'signed-access-token',
        refreshToken: 'refresh-token-with-at-least-forty-characters-123456',
        accessTokenExpiresAt: '2026-07-23T10:15:00.000Z',
        refreshTokenExpiresAt: '2026-08-22T10:00:00.000Z',
      },
    });

    const [requestUrl, request] = fetcher.mock.calls[0] ?? [];

    expect(requestUrl).toBe('http://localhost:3333/api/v1/auth/login');
    expect(request).toMatchObject({
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      identifier: 'administrador',
      password: 'SenhaForte@2026',
      remember: true,
    });
  });

  it('rotates a refresh token through the API contract', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse(responseBody));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
      now: () => new Date('2026-07-23T10:00:00.000Z'),
    });

    await gateway.refresh('refresh-token-with-at-least-forty-characters-123456');

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          refreshToken: 'refresh-token-with-at-least-forty-characters-123456',
        }),
      }),
    );
  });

  it('loads the current identity with the access token and maps live authorization data', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      jsonResponse({
        companyId: 'company-001',
        user: {
          ...responseBody.session.user,
          departments: ['financial'],
          permissions: ['dashboard:view', 'financial:view'],
        },
      }),
    );
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(gateway.getCurrentIdentity('current-access-token')).resolves.toEqual({
      id: 'user-id',
      name: 'Administrador Milenium',
      type: 'employee',
      departments: ['financial'],
      permissions: ['dashboard:view', 'financial:view'],
      clientCategory: null,
      isActive: true,
    });

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/auth/me',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer current-access-token',
        }),
      }),
    );
  });

  it.each([401, 403])('rejects an unavailable current identity with HTTP %s', async (status) => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({}, status));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(gateway.getCurrentIdentity('stale-access-token')).rejects.toMatchObject<
      Partial<AuthenticationGatewayError>
    >({
      code: 'invalid-access-token',
    });
  });

  it('rejects an incompatible current identity response', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ companyId: 'company-001', user: { id: 'user-id' } }));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(gateway.getCurrentIdentity('current-access-token')).rejects.toMatchObject<
      Partial<AuthenticationGatewayError>
    >({
      code: 'invalid-response',
    });
  });

  it('requests a non-enumerable password recovery through the API contract', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(gateway.requestPasswordReset('taiane.karine')).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/auth/password/forgot',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'taiane.karine' }),
      }),
    );
  });

  it('does not distinguish an unknown recovery identifier returned as a client error', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ code: 'NOT_FOUND' }, 404));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(gateway.requestPasswordReset('conta.inexistente')).resolves.toBeUndefined();
  });

  it('maps an unauthorized login to a safe credential failure', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ code: 'INVALID_CREDENTIALS' }, 401));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'administrador',
        password: 'wrong-password',
        remember: false,
      }),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'invalid-credentials',
      publicCode: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects the legacy inline password challenge as an incompatible login response', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      jsonResponse({
        passwordChangeRequired: true,
        changeToken: 'x'.repeat(40),
        reason: 'first-access',
        expiresAt: '2026-07-29T12:00:00.000Z',
      }),
    );
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'taiane.karine',
        password: 'SenhaInicial@2026',
        remember: false,
      }),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'invalid-response',
    });
  });

  it.each([
    [403, 'ACCOUNT_INACTIVE', 'account-inactive', 'desativado'],
    [423, 'ACCOUNT_SUSPENDED', 'account-suspended', 'suspenso'],
  ] as const)(
    'maps the authenticated account state %s/%s to a safe visible error',
    async (status, apiCode, expectedCode, expectedMessage) => {
      const fetcher = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockResolvedValue(jsonResponse({ code: apiCode, message: 'internal detail' }, status));
      const gateway = new TenantApiAuthenticationGateway({
        baseUrl: 'http://localhost:3333/api/v1',
        fetcher,
      });

      await expect(
        gateway.authenticate({
          identifier: 'taiane.karine',
          password: 'SenhaCorreta@2026',
          remember: false,
        }),
      ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
        code: expectedCode,
        publicCode: apiCode,
        message: expect.stringContaining(expectedMessage),
      });
    },
  );

  it('returns the opaque first-access challenge without creating a session', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      jsonResponse(
        {
          code: 'ACCOUNT_PASSWORD_SETUP_REQUIRED',
          message: 'Defina uma nova senha para concluir o primeiro acesso.',
          details: {
            challengeToken: 'opaque-first-access-challenge',
            expiresAt: '2026-07-29T12:00:00.000Z',
            reason: 'first-access',
          },
        },
        403,
      ),
    );
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'taiane.karine',
        password: 'SenhaInicial@2026',
        remember: false,
      }),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'account-password-setup-required',
      publicCode: 'ACCOUNT_PASSWORD_SETUP_REQUIRED',
      passwordSetupChallenge: {
        token: 'opaque-first-access-challenge',
        expiresAt: '2026-07-29T12:00:00.000Z',
        reason: 'first-access',
      },
    });
  });

  it('rejects a first-access response without a valid challenge', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse({ code: 'ACCOUNT_PASSWORD_SETUP_REQUIRED', details: {} }, 403),
      );
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'taiane.karine',
        password: 'SenhaInicial@2026',
        remember: false,
      }),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'invalid-response',
      publicCode: 'INVALID_RESPONSE',
    });
  });

  it('uses a safe fallback for an unknown forbidden account response', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ code: 'UNKNOWN', message: 'sensitive' }, 403));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'taiane.karine',
        password: 'SenhaCorreta@2026',
        remember: false,
      }),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'account-unavailable',
      publicCode: 'UNKNOWN',
      message: 'Esta conta não está disponível para acesso. Contate o administrador.',
    });
  });

  it.each([
    [400, 'validation-error', 'VALIDATION_ERROR'],
    [429, 'service-unavailable', 'TOO_MANY_REQUESTS'],
    [503, 'service-unavailable', 'INTERNAL_ERROR'],
  ] as const)(
    'uses the deterministic HTTP fallback for login status %s',
    async (status, code, publicCode) => {
      const fetcher = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockResolvedValue(jsonResponse({ message: ['default Nest payload'] }, status));
      const gateway = new TenantApiAuthenticationGateway({
        baseUrl: 'http://localhost:3333/api/v1',
        fetcher,
      });

      await expect(
        gateway.authenticate({
          identifier: 'taiane.karine',
          password: 'SenhaCorreta@2026',
          remember: false,
        }),
      ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
        code,
        publicCode,
      });
    },
  );

  it('preserves a stable API code when resetting a password', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      jsonResponse(
        {
          code: 'INVALID_PASSWORD_CHANGE_TOKEN',
          message: 'O link para criar a senha é inválido ou expirou.',
        },
        401,
      ),
    );
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.completePasswordChange('expired-token', 'SenhaNova@2026'),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'invalid-password-change-token',
      publicCode: 'INVALID_PASSWORD_CHANGE_TOKEN',
    });
  });

  it('uses the throttle fallback code for password recovery', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ statusCode: 429 }, 429));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(gateway.requestPasswordReset('taiane.karine')).rejects.toMatchObject<
      Partial<AuthenticationGatewayError>
    >({
      code: 'service-unavailable',
      publicCode: 'TOO_MANY_REQUESTS',
    });
  });

  it('accepts permission codes introduced by the backend', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      jsonResponse({
        ...responseBody,
        session: {
          ...responseBody.session,
          user: {
            ...responseBody.session.user,
            permissions: ['unknown:permission'],
          },
        },
      }),
    );
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'administrador',
        password: 'SenhaForte@2026',
        remember: false,
      }),
    ).resolves.toMatchObject({
      session: {
        user: {
          permissions: ['unknown:permission'],
        },
      },
    });
  });

  it('reports network failures without exposing the original error', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new Error('ECONNREFUSED'));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'administrador',
        password: 'SenhaForte@2026',
        remember: false,
      }),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'service-unavailable',
      publicCode: 'SERVICE_UNAVAILABLE',
      message: 'Não foi possível estabelecer comunicação com a API.',
    });
  });

  it('distinguishes request timeout from other transport failures', async () => {
    const timeout = new Error('request timed out');
    timeout.name = 'TimeoutError';
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(timeout);
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.authenticate({
        identifier: 'administrador',
        password: 'SenhaForte@2026',
        remember: false,
      }),
    ).rejects.toMatchObject<Partial<AuthenticationGatewayError>>({
      code: 'request-timeout',
      publicCode: 'REQUEST_TIMEOUT',
    });
  });

  it('revokes the backend refresh token during logout', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const gateway = new TenantApiAuthenticationGateway({
      baseUrl: 'http://localhost:3333/api/v1',
      fetcher,
    });

    await expect(
      gateway.logout('refresh-token-with-at-least-forty-characters-123456'),
    ).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});

describe('Milenium API configuration', () => {
  it('normalizes a development URL', () => {
    expect(resolveTenantApiBaseUrl('http://localhost:3333/api/v1/', 'development')).toBe(
      'http://localhost:3333/api/v1',
    );
  });

  it('requires HTTPS in production', () => {
    expect(() =>
      resolveTenantApiBaseUrl('http://api.milenium.example/api/v1', 'production'),
    ).toThrow('LUME_TENANT_API_URL must use HTTPS in production.');
  });

  it('uses a bounded configurable timeout', () => {
    expect(resolveTenantApiTimeout(undefined)).toBe(5_000);
    expect(resolveTenantApiTimeout('7500')).toBe(7_500);
    expect(() => resolveTenantApiTimeout('50')).toThrow(
      'LUME_TENANT_API_TIMEOUT_MS must be an integer between 100 and 30000.',
    );
  });
});
