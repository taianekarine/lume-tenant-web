import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { canReadQuoteProposals } from '@/features/quote-proposals/server/quote-proposal-access';

export const metadata: Metadata = {
  title: 'Orçamentos | Lume',
  description: 'Fila prioritária dos orçamentos comerciais pendentes.',
};

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) redirect('/login');
  if (!canReadQuoteProposals(session.user)) redirect('/dashboard');
  redirect('/quote-proposals/pending');
}
