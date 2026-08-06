import { redirect } from 'next/navigation';

export default function LegacyPendingQuoteProposalsPage() {
  redirect('/quote-proposals?tab=pending');
}
