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
  getWhatsAppConversationMetrics,
  isWhatsAppConversationDepartment,
  type WhatsAppConversation,
  type WhatsAppConversationDepartment,
  type WhatsAppConversationMetrics,
  WHATSAPP_ROUTABLE_DEPARTMENTS,
} from '@/features/whatsapp-conversations/domain';
import { getWhatsAppConversationPageForOperationalDashboard } from '@/features/whatsapp-conversations/server';

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
    redirect(session.user.documentAccessMode === 'document-portal' ? '/documents' : '/');
  }

  const conversations: readonly WhatsAppConversation[] = [];
  let operationalMetrics: WhatsAppConversationMetrics = getWhatsAppConversationMetrics([]);
  let departmentVolumes: readonly {
    readonly department: WhatsAppConversationDepartment;
    readonly value: number;
  }[] = [];
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
      const visibleDepartments =
        assignedDepartments.length > 0 ? assignedDepartments : WHATSAPP_ROUTABLE_DEPARTMENTS;
      const departmentPages = await Promise.all(
        visibleDepartments.map(async (department) => ({
          department,
          page: await getWhatsAppConversationPageForOperationalDashboard({
            department,
            page: 1,
            pageSize: 1,
          }),
        })),
      );

      operationalMetrics = departmentPages.reduce<WhatsAppConversationMetrics>(
        (total, current) => ({
          total: total.total + current.page.metrics.total,
          botActive: total.botActive + current.page.metrics.botActive,
          attendantActive: total.attendantActive + current.page.metrics.attendantActive,
          automationPaused: total.automationPaused + current.page.metrics.automationPaused,
          unreadMessages: total.unreadMessages + current.page.metrics.unreadMessages,
          unreadConversations: total.unreadConversations + current.page.metrics.unreadConversations,
          awaitingProposal: total.awaitingProposal + current.page.metrics.awaitingProposal,
        }),
        getWhatsAppConversationMetrics([]),
      );
      departmentVolumes = departmentPages.map(({ department, page }) => ({
        department,
        value: page.metrics.total,
      }));
    } catch (error) {
      if (error instanceof WhatsAppConversationRepositoryError && error.code === 'unauthorized') {
        redirect('/auth/session-expired');
      }

      initialError =
        error instanceof WhatsAppConversationRepositoryError
          ? error.message
          : 'Não foi possível carregar os indicadores.';
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
          : 'Não foi possível carregar os indicadores comerciais.';
    }
  }

  return (
    <DashboardPage
      session={session}
      conversations={conversations}
      operationalMetrics={operationalMetrics}
      departmentVolumes={departmentVolumes}
      initialError={initialError}
      quoteMetrics={quoteMetrics}
      quoteInitialError={quoteInitialError}
    />
  );
}
