import Link from 'next/link';
import { notFound } from 'next/navigation';

import { TenantAdministrationError } from '@/features/tenant-administration/application';
import type { PermissionCatalog, TenantUser } from '@/features/tenant-administration/domain';
import { UserEditorForm } from '@/features/tenant-administration/users';
import {
  executeAuthenticatedTenantRequest,
  requirePeopleOperationsTenantSession,
  rethrowTenantPageError,
} from '@/features/tenant-administration/server';
import { AuthenticatedShell } from '@/features/navigation';
import { Button } from '@/shared/ui/button';
import { PageFeedbackToast } from '@/shared/page-feedback-toast';

export default async function UserEditorRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ userId: string }>;
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requirePeopleOperationsTenantSession(['users:update', 'users:create']);
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  let user: TenantUser;
  let permissionCatalog: PermissionCatalog = {
    resources: [],
    actions: [],
    actionsByResource: {},
    permissions: [],
    permissionsByDepartment: {},
    implicitPermissions: [],
  };

  try {
    if (session.user.isAdministrator) {
      [user, permissionCatalog] = await executeAuthenticatedTenantRequest((gateway) =>
        Promise.all([gateway.getUser(userId), gateway.listPermissions()]),
      );
    } else {
      user = await executeAuthenticatedTenantRequest((gateway) => gateway.getUser(userId));
    }
  } catch (error) {
    if (error instanceof TenantAdministrationError && error.code === 'not-found') notFound();
    rethrowTenantPageError(error);
  }

  return (
    <AuthenticatedShell user={session.user}>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <Button render={<Link href="/users" />} nativeButton={false} variant="outline">
          Voltar para usuários
        </Button>
        <header className="my-8">
          <p className="text-sm font-medium text-primary-emphasis">Administração local</p>
          <h1 className="text-3xl font-bold tracking-tight">Editar {user.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {session.user.isAdministrator
              ? 'Revise os dados, departamentos e permissões individuais.'
              : 'Revise os dados pessoais e o perfil usado nas exigências documentais.'}
          </p>
        </header>
        <PageFeedbackToast error={query.error} success={query.success} />
        <UserEditorForm
          user={user}
          permissionCatalog={permissionCatalog}
          canManageAccess={session.user.isAdministrator === true}
        />
      </div>
    </AuthenticatedShell>
  );
}
