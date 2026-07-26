import { RolesPage } from '@/features/tenant-administration/components';
import type { PermissionCatalog, TenantRole } from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function RolesRoute({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession(['settings:view', 'settings:manage']);
  const query = await searchParams;
  let roles: readonly TenantRole[];
  let permissions: PermissionCatalog;

  try {
    [roles, permissions] = await executeAuthenticatedTenantRequest((gateway) =>
      Promise.all([gateway.listRoles(), gateway.listPermissions()]),
    );
  } catch (error) {
    rethrowTenantPageError(error);
  }

  return (
    <RolesPage
      session={session}
      roles={roles}
      permissions={permissions}
      error={query.error}
      success={query.success}
    />
  );
}
