import { notFound } from 'next/navigation';

import { TenantAdministrationError } from '@/features/tenant-administration/application';
import { UserEditorPage } from '@/features/tenant-administration/components';
import type { TenantRole, TenantUser } from '@/features/tenant-administration/domain';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';

export default async function UserEditorRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ userId: string }>;
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requireTenantSession(['users:manage']);
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  let user: TenantUser;
  let roles: readonly TenantRole[];

  try {
    [user, roles] = await executeAuthenticatedTenantRequest((gateway) =>
      Promise.all([gateway.getUser(userId), gateway.listRoles()]),
    );
  } catch (error) {
    if (error instanceof TenantAdministrationError && error.code === 'not-found') notFound();
    rethrowTenantPageError(error);
  }

  return (
    <UserEditorPage
      session={session}
      user={user}
      roles={roles}
      error={query.error}
      success={query.success}
    />
  );
}
