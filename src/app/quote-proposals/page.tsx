import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { QuoteProposalRepositoryError } from '@/features/quote-proposals/application';
import type { PendingQuoteProposal } from '@/features/quote-proposals/domain';
import { QuoteProposalsPage, type QuoteProposalTab } from '@/features/quote-proposals/pages';
import {
  getApprovedQuoteProposalsForDashboard,
  getCancelledQuoteProposalsForDashboard,
  getPendingQuoteProposalsForDashboard,
  getSentQuoteProposalsForDashboard,
} from '@/features/quote-proposals/server';
import { canReadQuoteProposals } from '@/features/quote-proposals/server/quote-proposal-access';
import { canManageQuoteProposals } from '@/features/quote-proposals/server/quote-proposal-access';
import { userFacingMessage } from '@/shared/lib/user-facing-message';

export const metadata: Metadata = {
  title: 'Orçamentos | Lume',
  description: 'Filas comerciais de orçamentos.',
};

const quoteTabs = ['pending', 'sent', 'approved', 'cancelled'] as const;

function isQuoteTab(value: string | undefined): value is QuoteProposalTab {
  return quoteTabs.some((tab) => tab === value);
}

export default async function Page({
  searchParams,
}: {
  readonly searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) redirect('/login');
  if (!canReadQuoteProposals(session.user)) redirect('/dashboard');
  const query = await searchParams;
  const results = await Promise.allSettled([
    getPendingQuoteProposalsForDashboard(),
    getSentQuoteProposalsForDashboard(),
    getApprovedQuoteProposalsForDashboard(),
    getCancelledQuoteProposalsForDashboard(),
  ]);
  const unauthorized = results.some(
    (result) =>
      result.status === 'rejected' &&
      result.reason instanceof QuoteProposalRepositoryError &&
      result.reason.code === 'unauthorized',
  );
  if (unauthorized) redirect('/auth/session-expired');

  const values = results.map((result) =>
    result.status === 'fulfilled' ? result.value : { items: [], total: 0 },
  ) as Array<{ items: readonly PendingQuoteProposal[]; total: number }>;
  const errorFor = (index: number, fallback: string): string | null => {
    const result = results[index];
    if (result.status === 'fulfilled') return null;
    return result.reason instanceof QuoteProposalRepositoryError
      ? userFacingMessage(result.reason.message, fallback)
      : fallback;
  };

  return (
    <QuoteProposalsPage
      session={session}
      initialTab={isQuoteTab(query.tab) ? query.tab : 'pending'}
      pending={values[0].items}
      pendingTotal={values[0].total}
      sent={values[1].items}
      approved={values[2].items}
      cancelled={values[3].items}
      errors={{
        pending: errorFor(0, 'Não foi possível carregar os orçamentos pendentes.'),
        sent: errorFor(1, 'Não foi possível carregar os orçamentos enviados.'),
        approved: errorFor(2, 'Não foi possível carregar os orçamentos aprovados.'),
        cancelled: errorFor(3, 'Não foi possível carregar os orçamentos cancelados.'),
      }}
      canManage={canManageQuoteProposals(session.user)}
    />
  );
}
