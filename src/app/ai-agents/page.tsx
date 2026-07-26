import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { AiAgentsPage } from '@/features/ai-agents/pages';

export const metadata: Metadata = {
  title: 'Agentes de IA | Milenium Platform',
  description: 'Catálogo protegido de agentes de IA da Milenium Platform.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) {
    redirect('/login');
  }

  if (!hasPermission(session.user, 'ai-agents:use')) {
    redirect('/dashboard');
  }

  return <AiAgentsPage session={session} />;
}
