import { revalidatePath } from 'next/cache';

import { TenantAdministrationError, type TenantAdministrationGateway } from '../application';
import { executeAuthenticatedTenantMutation } from '../server';
import {
  createTenantUserFormAction,
  deleteTenantUserAction,
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
  const deleteUser = jest.fn();
  const updateUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createUser.mockResolvedValue({});
    deleteUser.mockResolvedValue({ deleted: true });
    updateUser.mockResolvedValue({});
    jest.mocked(executeAuthenticatedTenantMutation).mockImplementation(async (operation) =>
      operation({
        createUser,
        deleteUser,
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

  it('creates documentation only when a collaborator explicitly requests it', async () => {
    const baseInput = {
      name: 'Usuário Comercial',
      username: 'usuario.comercial',
      email: 'comercial@example.com',
      password: 'SenhaForte@2026',
      isAdministrator: false,
      documentAccessMode: 'standard' as const,
      departments: ['commercial'],
      permissionCodes: ['commercial:view'],
    };

    await createTenantUserFormAction({ ...baseInput, requestDocuments: false });
    expect(createUser).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ initialDocumentRequestCommandId: expect.anything() }),
    );

    await createTenantUserFormAction({ ...baseInput, requestDocuments: true });
    expect(createUser).toHaveBeenLastCalledWith(
      expect.objectContaining({
        requestDocuments: true,
        initialDocumentRequestCommandId: expect.any(String),
      }),
    );
  });

  it('requires documentation for candidates', async () => {
    await expect(
      createTenantUserFormAction({
        name: 'Novo Candidato',
        username: 'novo.candidato',
        email: 'candidato@example.com',
        password: 'SenhaForte@2026',
        isAdministrator: false,
        documentAccessMode: 'document-portal',
        requestDocuments: false,
        departments: [],
        permissionCodes: [],
      }),
    ).resolves.toMatchObject({ success: false, errorCode: 'VALIDATION_ERROR' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('deletes a user only through the dedicated authenticated action', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    await expect(deleteTenantUserAction(userId, 'SenhaAdministrativa@2026')).resolves.toEqual({
      success: true,
      message: 'Usuário excluído com sucesso.',
    });
    expect(deleteUser).toHaveBeenCalledWith(userId, 'SenhaAdministrativa@2026');
    expect(revalidatePath).toHaveBeenCalledWith('/users');
    expect(revalidatePath).toHaveBeenCalledWith('/document-management');
    expect(revalidatePath).toHaveBeenCalledWith('/administration');
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
