import { redirect } from 'next/navigation';

export default function LegacySentQuoteProposalsPage() {
  redirect('/quote-proposals?tab=sent');
}
