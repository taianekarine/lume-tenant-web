import 'server-only';

import { redirect } from 'next/navigation';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { hasPermission, type AuthenticatedSession, type Permission } from '@/features/auth/domain';

import { TenantAdministrationError } from '../application';

export async function requireTenantSession(
  anyPermission: readonly Permission[],
): Promise<AuthenticatedSession> {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) redirect('/login');
  if (!anyPermission.some((permission) => hasPermission(session.user, permission))) {
    redirect('/dashboard');
  }

  return session;
}

export async function requireManagementTenantSession(
  anyPermission: readonly Permission[],
): Promise<AuthenticatedSession> {
  const session = await requireTenantSession(anyPermission);

  if (session.user.isAdministrator === true) return session;
  if (session.user.type !== 'employee' || !session.user.departments.includes('management')) {
    redirect('/dashboard');
  }

  return session;
}

export async function requirePeopleOperationsTenantSession(
  anyPermission: readonly Permission[],
): Promise<AuthenticatedSession> {
  const session = await requireTenantSession(anyPermission);

  if (session.user.isAdministrator === true) return session;
  if (
    session.user.type !== 'employee' ||
    !session.user.departments.some((department) =>
      ['management', 'personnel-department', 'human-resources'].includes(department),
    )
  ) {
    redirect('/dashboard');
  }

  return session;
}

export function rethrowTenantPageError(error: unknown): never {
  if (error instanceof TenantAdministrationError && error.code === 'unauthorized') {
    redirect('/auth/session-expired');
  }

  throw error;
}
