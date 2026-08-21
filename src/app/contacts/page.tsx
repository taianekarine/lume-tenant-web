import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { AuthenticatedShell } from '@/features/navigation';
import { WhatsAppContactsPage } from '@/features/whatsapp-contacts/pages';

export const metadata: Metadata = {
  title: 'Contatos | Lume',
  description: 'Agenda de contatos vinculada ao Painel WhatsApp.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) redirect('/login');
  const canManage = hasPermission(session.user, 'whatsapp-conversations:manage');
  if (!canManage && !hasPermission(session.user, 'whatsapp-conversations:view')) {
    redirect('/dashboard');
  }
  return (
    <AuthenticatedShell user={session.user}>
      <WhatsAppContactsPage canManage={canManage} />
    </AuthenticatedShell>
  );
}
