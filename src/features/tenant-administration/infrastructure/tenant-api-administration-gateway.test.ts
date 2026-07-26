import { TenantAdministrationError } from '../application';
import { TenantApiAdministrationGateway } from './tenant-api-administration-gateway';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('TenantApiAdministrationGateway', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts permission codes introduced by the backend', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        resources: ['future-module'],
        actions: ['review'],
        actionsByResource: { 'future-module': ['review'] },
        permissions: ['future-module:review'],
      }),
    );
    const gateway = new TenantApiAdministrationGateway(
      'http://localhost:3333/api/v1/',
      'access-token',
      fetcher,
    );

    const catalog = await gateway.listPermissions();

    expect(catalog.permissions).toEqual(['future-module:review']);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/permissions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('keeps tenant user updates inside the local API', async () => {
    const responseUser = {
      id: '5a19a7d8-4aa8-4d35-b758-8450f865cff0',
      name: 'Ana Souza',
      username: 'ana.souza',
      email: 'ana@example.com',
      cpf: null,
      type: 'employee',
      departments: ['commercial'],
      roles: ['manager'],
      permissions: ['dashboard:view'],
      clientCategory: null,
      isActive: false,
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T01:00:00.000Z',
    };
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(responseUser));
    const gateway = new TenantApiAdministrationGateway(
      'https://tenant.example/api/v1',
      'access-token',
      fetcher,
    );

    await gateway.updateUser(responseUser.id, { isActive: false });

    expect(fetcher).toHaveBeenCalledWith(
      `https://tenant.example/api/v1/users/${responseUser.id}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }),
    );
  });

  it('accepts the license state returned by the running Tenant API contract', async () => {
    const license = {
      state: 'active',
      tenantId: 'tenant-001',
      installationId: 'installation-001',
      plan: 'enterprise',
      features: ['users', 'roles'],
      expiresAt: '2027-07-25T00:00:00.000Z',
      graceUntil: '2027-08-24T00:00:00.000Z',
    };
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(license));
    const gateway = new TenantApiAdministrationGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
    );

    await expect(gateway.getLicenseStatus()).resolves.toEqual(license);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/license/status',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('maps an incompatible success payload to the integration error contract', async () => {
    const fetcher = jest.fn().mockResolvedValue(jsonResponse({ state: 'VALID' }));
    const gateway = new TenantApiAdministrationGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
    );

    await expect(gateway.getLicenseStatus()).rejects.toMatchObject<
      Partial<TenantAdministrationError>
    >({
      code: 'invalid-response',
      message: 'A API local retornou uma resposta incompatível com o frontend.',
    });
  });

  it('preserves validation messages returned as an array by NestJS', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: ['email must be an email', 'name is too short'] }, 400),
      );
    const gateway = new TenantApiAdministrationGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
    );

    await expect(gateway.listRoles()).rejects.toMatchObject<Partial<TenantAdministrationError>>({
      code: 'validation',
      message: 'email must be an email name is too short',
    });
  });

  it('uses the timeout supplied by the Tenant API configuration', async () => {
    const requestSignal = new AbortController().signal;
    const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(requestSignal);
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        resources: [],
        actions: [],
        actionsByResource: {},
        permissions: [],
      }),
    );
    const gateway = new TenantApiAdministrationGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
      7_500,
    );

    await gateway.listPermissions();

    expect(timeout).toHaveBeenCalledWith(7_500);
  });
});
