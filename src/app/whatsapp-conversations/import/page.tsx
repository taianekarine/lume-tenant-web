import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { AuthenticatedShell } from '@/features/navigation';
import { WhatsAppHistoryImportPage } from '@/features/whatsapp-history-import/pages';

export const metadata: Metadata = {
  title: 'Importar históricos do WhatsApp | Lume',
  description: 'Importação revisada de conversas exportadas do WhatsApp.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) redirect('/login');
  if (!hasPermission(session.user, 'whatsapp-conversations:manage')) {
    redirect('/dashboard');
  }

  return (
    <AuthenticatedShell user={session.user}>
      <WhatsAppHistoryImportPage />
    </AuthenticatedShell>
  );
}
