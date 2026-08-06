import { redirect } from 'next/navigation';

export default function LegacyCancelledQuoteProposalsPage() {
  redirect('/quote-proposals?tab=cancelled');
}
