import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { QuoteProposalRepositoryError } from '@/features/quote-proposals/application';
import type { PendingQuoteProposal } from '@/features/quote-proposals/domain';
import { QuoteProposalArchivePage } from '@/features/quote-proposals/pages';
import { getCancelledQuoteProposalsForDashboard } from '@/features/quote-proposals/server';
import {
  canManageQuoteProposals,
  canReadQuoteProposals,
} from '@/features/quote-proposals/server/quote-proposal-access';

export const metadata: Metadata = {
  title: 'Orçamentos cancelados | Lume',
  description: 'Histórico e motivos dos orçamentos cancelados.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) redirect('/login');
  if (!canReadQuoteProposals(session.user)) redirect('/dashboard');

  let proposals: readonly PendingQuoteProposal[] = [];
  let initialError: string | null = null;
  try {
    proposals = (await getCancelledQuoteProposalsForDashboard()).items;
  } catch (error) {
    if (error instanceof QuoteProposalRepositoryError && error.code === 'unauthorized') {
      redirect('/auth/session-expired');
    }
    initialError =
      error instanceof QuoteProposalRepositoryError
        ? error.message
        : 'Não foi possível carregar os orçamentos cancelados da Tenant API.';
  }

  return (
    <QuoteProposalArchivePage
      session={session}
      category="cancelled"
      proposals={proposals}
      initialError={initialError}
      canManage={canManageQuoteProposals(session.user)}
    />
  );
}
