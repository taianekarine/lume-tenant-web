import { revalidatePath } from 'next/cache';

import { TenantAdministrationError, type TenantAdministrationGateway } from '../application';
import { executeAuthenticatedTenantMutation } from '../server';
import {
  createTenantUserFormAction,
  updateTenantUserFormAction,
} from './tenant-administration-actions';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('../server', () => ({
  executeAuthenticatedTenantMutation: jest.fn(),
}));

describe('tenant administration user actions', () => {
  const createUser = jest.fn();
  const updateUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createUser.mockResolvedValue({});
    updateUser.mockResolvedValue({});
    jest.mocked(executeAuthenticatedTenantMutation).mockImplementation(async (operation) =>
      operation({
        createUser,
        updateUser,
      } as unknown as TenantAdministrationGateway),
    );
  });

  it('rejects administrator creation before calling the Tenant API', async () => {
    await expect(
      createTenantUserFormAction({
        name: 'Admin Lume',
        username: 'admin.lume',
        email: 'admin@example.com',
        password: 'SenhaForte@2026',
        isAdministrator: true,
        departments: ['commercial', 'management'],
        permissionCodes: ['dashboard:view', 'users:manage'],
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Contas administradoras não podem ser criadas pelo Tenant Web.',
      errorCode: 'VALIDATION_ERROR',
    });

    expect(createUser).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects a numeric-only username before calling the gateway', async () => {
    await expect(
      createTenantUserFormAction({
        name: 'Usuário Numérico',
        username: '123456',
        email: 'numerico@example.com',
        password: 'SenhaForte@2026',
        isAdministrator: false,
        departments: ['commercial'],
        permissionCodes: ['commercial:view'],
      }),
    ).resolves.toEqual({
      success: false,
      message: 'O nome de usuário deve conter ao menos uma letra.',
      errorCode: 'VALIDATION_ERROR',
    });

    expect(createUser).not.toHaveBeenCalled();
  });

  it('returns the public API error code without exposing error details', async () => {
    createUser.mockRejectedValueOnce(
      new TenantAdministrationError(
        'forbidden',
        'Você não possui permissão para cadastrar este usuário.',
        'FORBIDDEN',
      ),
    );

    await expect(
      createTenantUserFormAction({
        name: 'Usuário Comercial',
        username: 'usuario.comercial',
        email: 'comercial@example.com',
        password: 'SenhaForte@2026',
        isAdministrator: false,
        departments: ['commercial'],
        permissionCodes: ['commercial:view'],
      }),
    ).resolves.toEqual({
      success: false,
      message: 'Você não possui permissão para cadastrar este usuário.',
      errorCode: 'FORBIDDEN',
    });
  });

  it('preserves explicit department assignments without mutating administrator authority', async () => {
    await expect(
      updateTenantUserFormAction('00000000-0000-4000-8000-000000000001', {
        name: 'Usuário Comercial',
        email: 'comercial@example.com',
        isAdministrator: false,
        departments: ['commercial'],
        permissionCodes: ['commercial:view'],
      }),
    ).resolves.toMatchObject({ success: true });

    expect(updateUser).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', {
      name: 'Usuário Comercial',
      email: 'comercial@example.com',
      departments: ['commercial'],
      permissionCodes: ['commercial:view'],
    });
  });

  it('cannot promote a user through a crafted update payload', async () => {
    await expect(
      updateTenantUserFormAction('00000000-0000-4000-8000-000000000001', {
        name: 'Usuário Comercial',
        email: 'comercial@example.com',
        isAdministrator: true,
        departments: [],
        permissionCodes: [],
      }),
    ).resolves.toMatchObject({ success: true });

    expect(updateUser).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', {
      name: 'Usuário Comercial',
      email: 'comercial@example.com',
    });
  });
});
