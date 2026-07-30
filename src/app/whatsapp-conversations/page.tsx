import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { hasCommercialScope, hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import type { WhatsAppConversation } from '@/features/whatsapp-conversations/domain';
import { WhatsAppConversationsPage } from '@/features/whatsapp-conversations/pages';
import { getWhatsAppConversationsForDashboard } from '@/features/whatsapp-conversations/server';

export const metadata: Metadata = {
  title: 'Painel WhatsApp | Lume',
  description: 'Gestão protegida das conversas comerciais recebidas pelo WhatsApp.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) {
    redirect('/login');
  }

  if (
    !hasCommercialScope(session.user) ||
    !hasPermission(session.user, 'whatsapp-conversations:manage')
  ) {
    redirect('/dashboard');
  }

  let conversations: readonly WhatsAppConversation[] = [];
  let initialError: string | null = null;

  try {
    conversations = await getWhatsAppConversationsForDashboard();
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError && error.code === 'unauthorized') {
      redirect('/auth/session-expired');
    }

    initialError =
      error instanceof WhatsAppConversationRepositoryError
        ? error.message
        : 'Não foi possível carregar as conversas da Tenant API.';
  }

  return (
    <WhatsAppConversationsPage
      session={session}
      conversations={conversations}
      initialError={initialError}
    />
  );
}
