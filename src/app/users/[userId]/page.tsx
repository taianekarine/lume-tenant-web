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

export default async function UserEditorRoute({
  params,
  searchParams,
}: {
  readonly params: Promise<{ userId: string }>;
  readonly searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await requirePeopleOperationsTenantSession(['users:update']);
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  let user: TenantUser;
  let permissionCatalog: PermissionCatalog;

  try {
    [user, permissionCatalog] = await executeAuthenticatedTenantRequest((gateway) =>
      Promise.all([gateway.getUser(userId), gateway.listPermissions()]),
    );
  } catch (error) {
    if (error instanceof TenantAdministrationError && error.code === 'not-found') notFound();
    rethrowTenantPageError(error);
  }

  return (
    <AuthenticatedShell user={session.user}>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <Button render={<Link href="/users" />} nativeButton={false} variant="outline">
          Voltar para usuários
        </Button>
        <header className="my-8">
          <p className="text-sm font-medium text-emerald-600">Administração local</p>
          <h1 className="text-3xl font-bold tracking-tight">Editar {user.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Revise os dados, departamentos e permissões individuais.
          </p>
        </header>
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
        <UserEditorForm user={user} permissionCatalog={permissionCatalog} />
      </main>
    </AuthenticatedShell>
  );
}
