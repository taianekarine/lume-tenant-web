import type { AuthenticatedSession } from '@/features/auth/domain';
import { AuthenticatedShell } from '@/features/navigation';

import { QuoteProposalArchive, QuoteProposalWorkspace } from '../components';
import type { PendingQuoteProposal, QuoteProposalCategory } from '../domain';

const contentClassName = 'mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8';

export interface PendingQuoteProposalsPageProps {
  readonly session: AuthenticatedSession;
  readonly proposals: readonly PendingQuoteProposal[];
  readonly total: number;
  readonly initialError?: string | null;
  readonly canManage?: boolean;
  readonly manualQuoteSeeds?: readonly PendingQuoteProposal[];
}

export function PendingQuoteProposalsPage({
  session,
  proposals,
  total,
  initialError = null,
  canManage = true,
  manualQuoteSeeds = [],
}: PendingQuoteProposalsPageProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <main className={contentClassName}>
        <header>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Comercial · Orçamentos
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Orçamentos pendentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prioridade da equipe: valide os dados, anexe um ou mais PDFs e confirme o envio.
          </p>
        </header>
        <QuoteProposalWorkspace
          initialPendingProposals={proposals}
          initialPendingTotal={total}
          initialSentProposals={[]}
          initialSentTotal={0}
          initialError={initialError}
          showHistory={false}
          canManage={canManage}
          initialManualQuoteSeeds={manualQuoteSeeds}
        />
      </main>
    </AuthenticatedShell>
  );
}

export interface QuoteProposalArchivePageProps {
  readonly session: AuthenticatedSession;
  readonly category: Exclude<QuoteProposalCategory, 'pending'>;
  readonly proposals: readonly PendingQuoteProposal[];
  readonly initialError?: string | null;
  readonly canManage?: boolean;
}

export function QuoteProposalArchivePage({
  session,
  category,
  proposals,
  initialError = null,
  canManage = true,
}: QuoteProposalArchivePageProps) {
  return (
    <AuthenticatedShell user={session.user}>
      <main className={contentClassName}>
        <QuoteProposalArchive
          category={category}
          initialProposals={proposals}
          initialError={initialError}
          canManage={canManage}
        />
      </main>
    </AuthenticatedShell>
  );
}
