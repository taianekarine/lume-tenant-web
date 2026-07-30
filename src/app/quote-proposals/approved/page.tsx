import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { QuoteProposalRepositoryError } from '@/features/quote-proposals/application';
import type { PendingQuoteProposal } from '@/features/quote-proposals/domain';
import { QuoteProposalArchivePage } from '@/features/quote-proposals/pages';
import { getApprovedQuoteProposalsForDashboard } from '@/features/quote-proposals/server';
import {
  canManageQuoteProposals,
  canReadQuoteProposals,
} from '@/features/quote-proposals/server/quote-proposal-access';

export const metadata: Metadata = {
  title: 'Orçamentos aprovados | Lume',
  description: 'Histórico dos orçamentos aprovados.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) redirect('/login');
  if (!canReadQuoteProposals(session.user)) redirect('/dashboard');

  let proposals: readonly PendingQuoteProposal[] = [];
  let initialError: string | null = null;
  try {
    proposals = (await getApprovedQuoteProposalsForDashboard()).items;
  } catch (error) {
    if (error instanceof QuoteProposalRepositoryError && error.code === 'unauthorized') {
      redirect('/auth/session-expired');
    }
    initialError =
      error instanceof QuoteProposalRepositoryError
        ? error.message
        : 'Não foi possível carregar os orçamentos aprovados da Tenant API.';
  }

  return (
    <QuoteProposalArchivePage
      session={session}
      category="approved"
      proposals={proposals}
      initialError={initialError}
      canManage={canManageQuoteProposals(session.user)}
    />
  );
}
