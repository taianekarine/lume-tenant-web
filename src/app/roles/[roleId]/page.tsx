import { notFound } from 'next/navigation';

import { TenantAdministrationError } from '@/features/tenant-administration/application';
import { RoleEditorPage } from '@/features/tenant-administration/components';
import type { PermissionCatalog, TenantRole } from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function RoleEditorRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ roleId: string }>;
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession(['settings:view', 'settings:manage']);
  const [{ roleId }, query] = await Promise.all([params, searchParams]);
  let role: TenantRole | undefined;
  let permissions: PermissionCatalog;

  try {
    const [roles, permissionCatalog] = await executeAuthenticatedTenantRequest((gateway) =>
      Promise.all([gateway.listRoles(), gateway.listPermissions()]),
    );
    role = roles.find((candidate) => candidate.id === roleId);
    permissions = permissionCatalog;
    if (!role) notFound();
  } catch (error) {
    if (error instanceof TenantAdministrationError && error.code === 'not-found') notFound();
    rethrowTenantPageError(error);
  }

  return (
    <RoleEditorPage
      session={session}
      role={role}
      permissions={permissions}
      error={query.error}
      success={query.success}
    />
  );
}
