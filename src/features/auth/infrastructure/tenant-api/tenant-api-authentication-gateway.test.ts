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
      roles: ['administrator'],
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
          roles: ['administrator'],
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

  it('maps an unauthorized login to a safe credential failure', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({}, 401));
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
      message: 'Não foi possível estabelecer comunicação com a API.',
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
