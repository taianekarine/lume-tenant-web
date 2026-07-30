import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { QuoteProposalRepositoryError } from '@/features/quote-proposals/application';
import type { PendingQuoteProposal } from '@/features/quote-proposals/domain';
import { PendingQuoteProposalsPage } from '@/features/quote-proposals/pages';
import { getPendingQuoteProposalsForDashboard } from '@/features/quote-proposals/server';
import {
  canManageQuoteProposals,
  canReadQuoteProposals,
} from '@/features/quote-proposals/server/quote-proposal-access';

export const metadata: Metadata = {
  title: 'Orçamentos pendentes | Lume',
  description: 'Fila prioritária de orçamentos aguardando proposta.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) redirect('/login');
  if (!canReadQuoteProposals(session.user)) redirect('/dashboard');

  let proposals: readonly PendingQuoteProposal[] = [];
  let total = 0;
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

  return (
    <PendingQuoteProposalsPage
      session={session}
      proposals={proposals}
      total={total}
      initialError={initialError}
      canManage={canManageQuoteProposals(session.user)}
    />
  );
}
