import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  createTenantUserFormAction,
  updateTenantUserFormAction,
  updateTenantUserStatusAction,
} from '@/features/tenant-administration/actions';
import {
  type PermissionCatalog,
  type TenantUser,
  type TenantUserList,
} from '@/features/tenant-administration/domain';
import { toast } from '@/shared/ui/toast';

import { UserEditorForm } from './user-editor-form';
import { UsersManagement } from './users-management';

const mockRouterPush = jest.fn();
const mockRouterRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}));

jest.mock('@/features/tenant-administration/actions', () => ({
  createTenantUserFormAction: jest.fn().mockResolvedValue({
    success: true,
    message: 'Usuário criado.',
  }),
  requestTenantUserPasswordResetAction: jest.fn().mockResolvedValue({
    success: true,
    message: 'E-mail enviado.',
  }),
  updateTenantUserFormAction: jest.fn().mockResolvedValue({
    success: true,
    message: 'Usuário atualizado.',
  }),
  updateTenantUserStatusAction: jest.fn().mockResolvedValue({
    success: true,
    message: 'Estado atualizado.',
  }),
}));

beforeAll(() => {
  window.PointerEvent ??= MouseEvent as typeof PointerEvent;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

const permissionCatalog: PermissionCatalog = {
  resources: ['dashboard', 'commercial', 'users', 'license'],
  actions: ['view', 'manage'],
  actionsByResource: {
    dashboard: ['view'],
    commercial: ['view', 'manage'],
    users: ['manage'],
    license: ['view'],
  },
  permissions: [
    'dashboard:view',
    'commercial:view',
    'commercial:manage',
    'users:manage',
    'license:view',
  ],
  permissionsByDepartment: {
    commercial: ['dashboard:view', 'commercial:view', 'commercial:manage'],
    management: ['dashboard:view', 'users:manage', 'license:view'],
  },
  implicitPermissions: ['dashboard:view'],
};

const tenantUser: TenantUser = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Taiane Karine',
  username: 'taiane',
  email: 'taiane@example.com',
  cpf: null,
  departments: ['commercial'],
  isAdministrator: false,
  permissionCodes: ['commercial:view'],
  permissions: ['dashboard:view', 'commercial:view'],
  isActive: true,
  status: 'active',
  suspendedUntil: null,
  suspensionReason: null,
  mustChangePassword: false,
  hasProfilePicture: false,
  createdAt: '2026-07-28T08:00:00.000Z',
  updatedAt: '2026-07-28T08:00:00.000Z',
};

const users: TenantUserList = {
  data: [tenantUser],
  meta: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('users management permissions', () => {
  it('hides every mutation control without users:manage', () => {
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate={false}
        canEdit={false}
        canManageAccess={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Novo usuário' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar acessos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recuperar senha' })).not.toBeInTheDocument();
    expect(screen.getByText('Taiane Karine')).toBeInTheDocument();
  });

  it('limits users:manage to account lifecycle actions', () => {
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate={false}
        canEdit={false}
        canManageAccess
      />,
    );

    expect(screen.getByRole('button', { name: 'Desativar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspender' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo usuário' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar acessos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recuperar senha' })).not.toBeInTheDocument();
  });

  it('limits users:update to editing access and password recovery', () => {
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate={false}
        canEdit
        canManageAccess={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Editar acessos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recuperar senha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desativar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument();
  });

  it('shows search, filters and lifecycle actions with users:manage', () => {
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Pesquisar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Departamento')).toBeInTheDocument();
    expect(screen.getByLabelText('Permissão efetiva')).toBeInTheDocument();
    expect(
      screen.getByText('Inclui permissões individuais e automáticas publicadas pela Tenant API.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Estado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo usuário' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar acessos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desativar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspender' })).toBeInTheDocument();
  });

  it('publishes implicit permissions in the effective-permission filter', async () => {
    const interaction = userEvent.setup();
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    await interaction.click(screen.getByLabelText('Permissão efetiva'));

    expect(screen.getByText('Painel · Visualizar (automática)')).toBeInTheDocument();
    expect(screen.getByText('Comercial · Visualizar')).toBeInTheDocument();
  });

  it('applies a selected permission immediately and exposes a removable filter label', async () => {
    const interaction = userEvent.setup();
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    await interaction.click(screen.getByLabelText('Permissão efetiva'));
    await interaction.click(await screen.findByRole('option', { name: 'Licença · Visualizar' }));

    expect(mockRouterPush).toHaveBeenCalledWith('/users?permission=license%3Aview', {
      scroll: false,
    });
    expect(screen.getByRole('button', { name: 'Remover filtro de permissão' })).toHaveTextContent(
      'Permissão:Licença · Visualizar',
    );

    await interaction.click(screen.getByRole('button', { name: 'Remover filtro de permissão' }));
    expect(mockRouterPush).toHaveBeenLastCalledWith('/users', { scroll: false });
  });

  it('keeps every select controlled when all filters are cleared', async () => {
    const interaction = userEvent.setup();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
        filters={{
          department: 'commercial',
          permission: 'commercial:view',
          status: 'active',
        }}
      />,
    );

    await interaction.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(mockRouterPush).toHaveBeenLastCalledWith('/users', { scroll: false });
    expect(screen.getByLabelText('Departamento')).toHaveTextContent('Todos');
    expect(screen.getByLabelText('Permissão efetiva')).toHaveTextContent('Todas as permissões');
    expect(screen.getByLabelText('Estado')).toHaveTextContent('Todos');
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining(
        'A component is changing the default value state of an uncontrolled Select',
      ),
    );
    consoleError.mockRestore();
  });

  it('synchronizes controlled filters after rerender and cancels a stale search debounce', () => {
    jest.useFakeTimers();
    const { rerender } = render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar' }), {
      target: { value: 'pesquisa antiga' },
    });

    rerender(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
        filters={{
          department: 'financial',
          permission: 'license:view',
          status: 'suspended',
        }}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Pesquisar' })).toHaveValue('');
    expect(screen.getByLabelText('Departamento')).toHaveTextContent('Financeiro');
    expect(screen.getByLabelText('Permissão efetiva')).toHaveTextContent('Licença · Visualizar');
    expect(screen.getByLabelText('Estado')).toHaveTextContent('Suspensos');
    expect(screen.getByRole('button', { name: 'Remover filtro de permissão' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remover filtro de permissão' }));
    expect(mockRouterPush).toHaveBeenLastCalledWith(
      '/users?department=financial&status=suspended',
      { scroll: false },
    );

    act(() => jest.advanceTimersByTime(500));
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('renders Portuguese labels for every selected filter and suspension period', async () => {
    const interaction = userEvent.setup();
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
        filters={{
          department: 'financial',
          permission: 'license:view',
          status: 'suspended',
        }}
      />,
    );

    expect(screen.getByLabelText('Departamento')).toHaveTextContent('Financeiro');
    expect(screen.getByLabelText('Permissão efetiva')).toHaveTextContent('Licença · Visualizar');
    expect(screen.getByLabelText('Estado')).toHaveTextContent('Suspensos');

    await interaction.click(screen.getByRole('button', { name: 'Suspender' }));
    expect(screen.getByLabelText('Período')).toHaveTextContent('Quantidade de dias');
    expect(screen.queryByText(/^days$|^date$|^suspended$|^license:view$/)).not.toBeInTheDocument();
  });

  it('renders friendly labels for legacy departments without exposing their codes', () => {
    const legacyUsers = {
      ...users,
      data: [
        {
          ...tenantUser,
          departments: ['controlling', 'unknown-department-code'],
        },
      ],
    };

    render(
      <UsersManagement
        users={legacyUsers}
        permissionCatalog={permissionCatalog}
        canCreate={false}
        canEdit={false}
        canManageAccess={false}
      />,
    );

    expect(screen.getByText('Controladoria')).toBeInTheDocument();
    expect(screen.getByText('Departamento legado')).toBeInTheDocument();
    expect(screen.queryByText('controlling')).not.toBeInTheDocument();
    expect(screen.queryByText('unknown-department-code')).not.toBeInTheDocument();
  });

  it('activates an inactive account through the status endpoint action', async () => {
    const interaction = userEvent.setup();
    render(
      <UsersManagement
        users={{ ...users, data: [{ ...tenantUser, isActive: false, status: 'inactive' }] }}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    await interaction.click(screen.getByRole('button', { name: 'Ativar' }));

    await waitFor(() =>
      expect(updateTenantUserStatusAction).toHaveBeenCalledWith(tenantUser.id, {
        status: 'active',
      }),
    );
  });

  it('shows the public error code in a failed user action toast', async () => {
    const interaction = userEvent.setup();
    const toastAdd = jest.spyOn(toast, 'add');
    jest.mocked(updateTenantUserStatusAction).mockResolvedValueOnce({
      success: false,
      message: 'Você não possui permissão para alterar este usuário.',
      errorCode: 'FORBIDDEN',
    });
    render(
      <UsersManagement
        users={{ ...users, data: [{ ...tenantUser, isActive: false, status: 'inactive' }] }}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    await interaction.click(screen.getByRole('button', { name: 'Ativar' }));

    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            'Você não possui permissão para alterar este usuário.\nCódigo do erro: FORBIDDEN',
          type: 'error',
        }),
      ),
    );
    toastAdd.mockRestore();
  });
});

describe('user editor form', () => {
  it('updates departments and direct permissions without exposing CPF', async () => {
    const interaction = userEvent.setup();
    render(<UserEditorForm user={tenantUser} permissionCatalog={permissionCatalog} />);

    expect(screen.queryByLabelText('CPF (opcional)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Usuário')).toBeDisabled();

    const name = screen.getByLabelText('Nome');
    await interaction.clear(name);
    await interaction.type(name, 'Taiane Karine Atualizada');
    await interaction.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(updateTenantUserFormAction).toHaveBeenCalledTimes(1));
    expect(updateTenantUserFormAction).toHaveBeenCalledWith(tenantUser.id, {
      name: 'Taiane Karine Atualizada',
      email: tenantUser.email,
      isAdministrator: false,
      departments: ['commercial'],
      permissionCodes: ['commercial:view'],
    });
  });

  it('uses the three-step creation flow and only shows compatible permissions', async () => {
    const interaction = userEvent.setup();
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    await interaction.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Dados básicos')).toBeInTheDocument();

    await interaction.type(within(dialog).getByLabelText('Nome'), 'Maria Financeiro');
    await interaction.type(within(dialog).getByLabelText('Usuário'), 'maria.financeiro');
    await interaction.type(within(dialog).getByLabelText('E-mail'), 'maria@example.com');
    await interaction.type(within(dialog).getByLabelText('Senha inicial'), 'SenhaForte@2026');
    await interaction.click(within(dialog).getByRole('button', { name: 'Continuar' }));

    await interaction.click(within(dialog).getByRole('checkbox', { name: 'Comercial' }));
    fireEvent.submit(within(dialog).getByTestId('create-user-form'));
    expect(createTenantUserFormAction).not.toHaveBeenCalled();
    expect(
      within(dialog).queryByRole('button', { name: 'Cadastrar usuário' }),
    ).not.toBeInTheDocument();
    await interaction.click(within(dialog).getByRole('button', { name: 'Continuar' }));

    expect(createTenantUserFormAction).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText(/Dashboard, Agentes de IA, Perfil e Suporte/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Comercial')).toBeInTheDocument();
    expect(within(dialog).queryByText('Usuários')).not.toBeInTheDocument();
    await interaction.click(within(dialog).getAllByRole('checkbox')[0]);
    await interaction.click(within(dialog).getByRole('button', { name: 'Cadastrar usuário' }));

    await waitFor(() => expect(createTenantUserFormAction).toHaveBeenCalledTimes(1));
    const input = jest.mocked(createTenantUserFormAction).mock.calls[0][0] as {
      isAdministrator: boolean;
      departments: string[];
      permissionCodes: string[];
    };
    expect(input.isAdministrator).toBe(false);
    expect(input.departments).toEqual(['commercial']);
    expect(input.permissionCodes).toHaveLength(1);
    expect(permissionCatalog.permissionsByDepartment?.commercial).toContain(
      input.permissionCodes[0],
    );
    expect(input.permissionCodes).not.toContain('users:manage');
  });

  it('does not expose administrator assignment when creating a user', async () => {
    const interaction = userEvent.setup();
    render(
      <UsersManagement
        users={users}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    await interaction.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const dialog = screen.getByRole('dialog');
    await interaction.type(within(dialog).getByLabelText('Nome'), 'Admin Lume');
    await interaction.type(within(dialog).getByLabelText('Usuário'), 'admin.lume');
    await interaction.type(within(dialog).getByLabelText('E-mail'), 'admin@example.com');
    await interaction.type(within(dialog).getByLabelText('Senha inicial'), 'SenhaForte@2026');
    await interaction.click(within(dialog).getByRole('button', { name: 'Continuar' }));

    expect(
      within(dialog).queryByRole('checkbox', { name: 'Administrador' }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Selecione um ou mais departamentos/)).toBeInTheDocument();
    expect(createTenantUserFormAction).not.toHaveBeenCalled();
  });

  it('supports an accessible indeterminate select-all checkbox per permission block', async () => {
    const interaction = userEvent.setup();
    render(<UserEditorForm user={tenantUser} permissionCatalog={permissionCatalog} />);

    const selectAll = screen.getByRole('checkbox', { name: 'Selecionar todas em Comercial' });
    expect(selectAll).toHaveAttribute('aria-checked', 'mixed');

    await interaction.click(selectAll);
    expect(screen.getByRole('checkbox', { name: 'Visualizar' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Gerenciar' })).toBeChecked();
    expect(selectAll).toBeChecked();
  });

  it('shows the administrator state in the user list', () => {
    render(
      <UsersManagement
        users={{ ...users, data: [{ ...tenantUser, isAdministrator: true }] }}
        permissionCatalog={permissionCatalog}
        canCreate
        canEdit
        canManageAccess
      />,
    );

    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Acesso administrativo completo')).toBeInTheDocument();
  });
});
