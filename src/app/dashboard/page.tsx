import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { DashboardPage } from '@/features/dashboard/pages';

export const metadata: Metadata = {
  title: 'Dashboard | Milenium Platform',
  description: 'Área protegida da Milenium Platform.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) {
    redirect('/login');
  }

  if (!hasPermission(session.user, 'dashboard:view')) {
    redirect('/');
  }

  return <DashboardPage session={session} />;
}
