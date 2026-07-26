import { UsersPage } from '@/features/tenant-administration/components';
import type { TenantRole, TenantUserList } from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function UsersRoute({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession(['users:view', 'users:manage']);
  const query = await searchParams;
  let users: TenantUserList;
  let roles: readonly TenantRole[];

  try {
    [users, roles] = await executeAuthenticatedTenantRequest((gateway) =>
      Promise.all([gateway.listUsers(), gateway.listRoles()]),
    );
  } catch (error) {
    rethrowTenantPageError(error);
  }

  return (
    <UsersPage
      session={session}
      users={users}
      roles={roles}
      error={query.error}
      success={query.success}
    />
  );
}
