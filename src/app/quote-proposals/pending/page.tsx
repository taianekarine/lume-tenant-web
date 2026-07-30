import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import type { User } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { QuoteProposalRepositoryError } from '@/features/quote-proposals/application';
import type { PendingQuoteProposal } from '@/features/quote-proposals/domain';
import { PendingQuoteProposalsPage } from '@/features/quote-proposals/pages';
import { getPendingQuoteProposalsForDashboard } from '@/features/quote-proposals/server';
import {
  canManageQuoteProposals,
  canReadQuoteProposals,
} from '@/features/quote-proposals/server/quote-proposal-access';
import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import type { WhatsAppConversation } from '@/features/whatsapp-conversations/domain';
import { getWhatsAppConversationsForDashboard } from '@/features/whatsapp-conversations/server';

export const metadata: Metadata = {
  title: 'Orçamentos pendentes | Lume',
  description: 'Fila prioritária de orçamentos aguardando proposta.',
};

function toManualQuoteSeed(conversation: WhatsAppConversation, user: User): PendingQuoteProposal {
  const quote = conversation.currentQuoteRequest;
  return {
    stage: 'pending',
    conversationState: conversation.conversationState,
    requestStatus: conversation.requestStatus,
    quoteRequestId: quote?.id ?? conversation.id,
    quoteRequestVersion: quote?.version ?? 1,
    conversationId: conversation.id,
    conversationVersion: conversation.version,
    contact: {
      id: conversation.contact.id,
      name: conversation.contact.name,
      phone: conversation.contact.phone,
    },
    summary: {
      sequence: quote?.sequence ?? 0,
      contactName: quote?.contactName ?? conversation.contact.name,
      document: quote?.document ?? null,
      email: quote?.email ?? null,
      serviceType: quote?.serviceType ?? null,
      origin: quote?.origin ?? null,
      destination: quote?.destination ?? null,
      departureDate: quote?.departureDate ?? null,
      departureAt: quote?.departureAt ?? null,
      returnDate: quote?.returnDate ?? null,
      returnAt: quote?.returnAt ?? null,
      passengerCount: quote?.passengerCount ?? null,
      vehicleType: quote?.vehicleType ?? null,
      vehicleAtDisposal: quote?.vehicleAtDisposal ?? null,
      localTransfers: quote?.localTransfers ?? null,
      notes: quote?.notes ?? null,
      structuredData: quote?.structuredData ?? {},
    },
    proposalDocument: null,
    requestedAt: quote?.createdAt ?? conversation.createdAt,
    requestedBy: {
      id: user.id,
      name: user.name,
      type: 'attendant',
    },
    decision: {
      status: 'pending',
      reason: null,
      decidedAt: null,
      decidedBy: null,
    },
    updatedAt: quote?.updatedAt ?? conversation.updatedAt,
  };
}

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) redirect('/login');
  if (!canReadQuoteProposals(session.user)) redirect('/dashboard');

  let proposals: readonly PendingQuoteProposal[] = [];
  let total = 0;
  let manualQuoteSeeds: readonly PendingQuoteProposal[] = [];
  let initialError: string | null = null;

  try {
    const queue = await getPendingQuoteProposalsForDashboard();
    proposals = queue.items;
    total = queue.total;
  } catch (error) {
    if (error instanceof QuoteProposalRepositoryError && error.code === 'unauthorized') {
      redirect('/auth/session-expired');
    }
    initialError =
      error instanceof QuoteProposalRepositoryError
        ? error.message
        : 'Não foi possível carregar os orçamentos pendentes da Tenant API.';
  }

  try {
    const conversations = await getWhatsAppConversationsForDashboard({
      page: 1,
      pageSize: 100,
      department: 'commercial',
    });
    manualQuoteSeeds = conversations
      .filter(
        (conversation) =>
          conversation.conversationState !== 'closed' &&
          conversation.assignedTo?.id === session.user.id &&
          conversation.currentQuoteRequest?.status !== 'under-review',
      )
      .map((conversation) => toManualQuoteSeed(conversation, session.user));
  } catch (error) {
    if (error instanceof WhatsAppConversationRepositoryError && error.code === 'unauthorized') {
      redirect('/auth/session-expired');
    }
    initialError ??=
      error instanceof WhatsAppConversationRepositoryError
        ? error.message
        : 'Não foi possível carregar os atendimentos disponíveis para orçamento avulso.';
  }

  return (
    <PendingQuoteProposalsPage
      session={session}
      proposals={proposals}
      total={total}
      initialError={initialError}
      canManage={canManageQuoteProposals(session.user)}
      manualQuoteSeeds={manualQuoteSeeds}
    />
  );
}
