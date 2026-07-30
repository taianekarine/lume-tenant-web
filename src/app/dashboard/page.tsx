import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { hasPermission } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { DashboardPage } from '@/features/dashboard/pages';
import { QuoteProposalRepositoryError } from '@/features/quote-proposals/application';
import {
  getQuoteProposalDashboardMetrics,
  type QuoteProposalDashboardMetrics,
} from '@/features/quote-proposals/domain';
import {
  getApprovedQuoteProposalsForDashboard,
  getCancelledQuoteProposalsForDashboard,
  getPendingQuoteProposalsForDashboard,
  getSentQuoteProposalsForDashboard,
} from '@/features/quote-proposals/server';
import { canReadQuoteProposals } from '@/features/quote-proposals/server/quote-proposal-access';
import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import {
  isWhatsAppConversationDepartment,
  type WhatsAppConversation,
} from '@/features/whatsapp-conversations/domain';
import { getWhatsAppConversationsForOperationalDashboard } from '@/features/whatsapp-conversations/server';

export const metadata: Metadata = {
  title: 'Dashboard | Lume',
  description: 'Visão operacional dos atendimentos no Lume.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) {
    redirect('/login');
  }

  if (!hasPermission(session.user, 'dashboard:view')) {
    redirect('/');
  }

  let conversations: readonly WhatsAppConversation[] = [];
  let initialError: string | null = null;
  let quoteMetrics: QuoteProposalDashboardMetrics | null = null;
  let quoteInitialError: string | null = null;
  const assignedDepartments = session.user.departments.flatMap((department) =>
    isWhatsAppConversationDepartment(department) ? [department] : [],
  );

  if (
    assignedDepartments.length > 0 ||
    hasPermission(session.user, 'whatsapp-conversations:manage')
  ) {
    try {
      const departmentQueues =
        assignedDepartments.length > 0
          ? await Promise.all(
              assignedDepartments.map((department) =>
                getWhatsAppConversationsForOperationalDashboard({ department }),
              ),
            )
          : [await getWhatsAppConversationsForOperationalDashboard()];

      conversations = departmentQueues.flat();
    } catch (error) {
      if (error instanceof WhatsAppConversationRepositoryError && error.code === 'unauthorized') {
        redirect('/auth/session-expired');
      }

      initialError =
        error instanceof WhatsAppConversationRepositoryError
          ? error.message
          : 'Não foi possível carregar os indicadores da Tenant API.';
    }
  } else {
    initialError =
      'Seu perfil não possui departamento atribuído para consultar os indicadores operacionais.';
  }

  if (assignedDepartments.includes('commercial') && canReadQuoteProposals(session.user)) {
    try {
      const pendingQueue = await getPendingQuoteProposalsForDashboard(1, 1);
      if (pendingQueue.summary) {
        quoteMetrics = getQuoteProposalDashboardMetrics(
          pendingQueue.items,
          [],
          [],
          [],
          pendingQueue.summary,
        );
      } else {
        const [sentQueue, approvedQueue, cancelledQueue] = await Promise.all([
          getSentQuoteProposalsForDashboard(),
          getApprovedQuoteProposalsForDashboard(),
          getCancelledQuoteProposalsForDashboard(),
        ]);
        quoteMetrics = getQuoteProposalDashboardMetrics(
          pendingQueue.items,
          sentQueue.items,
          approvedQueue.items,
          cancelledQueue.items,
        );
      }
    } catch (error) {
      if (error instanceof QuoteProposalRepositoryError && error.code === 'unauthorized') {
        redirect('/auth/session-expired');
      }
      quoteMetrics = getQuoteProposalDashboardMetrics([], []);
      quoteInitialError =
        error instanceof QuoteProposalRepositoryError
          ? error.message
          : 'Não foi possível carregar os indicadores comerciais da Tenant API.';
    }
  }

  return (
    <DashboardPage
      session={session}
      conversations={conversations}
      initialError={initialError}
      quoteMetrics={quoteMetrics}
      quoteInitialError={quoteInitialError}
    />
  );
}
