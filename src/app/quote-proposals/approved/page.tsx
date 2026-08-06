import { redirect } from 'next/navigation';

export default function LegacyApprovedQuoteProposalsPage() {
  redirect('/quote-proposals?tab=approved');
}
