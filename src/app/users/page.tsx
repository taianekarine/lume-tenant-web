import { AuthenticatedShell } from '@/features/navigation';
import { type UserListFilters, UsersManagement } from '@/features/tenant-administration/users';
import type {
  PermissionCatalog,
  TenantUserList,
  TenantUserStatus,
} from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requirePeopleOperationsTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function UsersRoute({
  searchParams,
}: {
  readonly searchParams: Promise<{
    error?: string;
    success?: string;
    search?: string;
    department?: string;
    permission?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const session = await requirePeopleOperationsTenantSession([
    'users:view',
    'users:create',
    'users:update',
    'users:manage',
  ]);
  const query = await searchParams;
  let users: TenantUserList;
  let permissionCatalog: PermissionCatalog;
  const status = ['active', 'inactive', 'suspended'].includes(query.status ?? '')
    ? (query.status as TenantUserStatus)
    : undefined;
  const filters: UserListFilters = {
    search: query.search?.trim() || undefined,
    department: query.department && query.department !== '__all__' ? query.department : undefined,
    permission: query.permission && query.permission !== '__all__' ? query.permission : undefined,
    status,
  };
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);

  try {
    [users, permissionCatalog] = await executeAuthenticatedTenantRequest((gateway) =>
      Promise.all([
        gateway.listUsers({ ...filters, page, pageSize: 20 }),
        gateway.listPermissions(),
      ]),
    );
  } catch (error) {
    rethrowTenantPageError(error);
  }

  return (
    <AuthenticatedShell user={session.user}>
      <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        {query.error || query.success ? (
          <p
            role={query.error ? 'alert' : 'status'}
            className={
              query.error
                ? 'mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'
                : 'mb-6 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700'
            }
          >
            {query.error ?? query.success}
          </p>
        ) : null}
        <UsersManagement
          users={users}
          permissionCatalog={permissionCatalog}
          canCreate={session.user.permissions.includes('users:create')}
          canEdit={session.user.isAdministrator === true}
          canManageAccess={session.user.isAdministrator === true}
          filters={filters}
        />
      </main>
    </AuthenticatedShell>
  );
}
