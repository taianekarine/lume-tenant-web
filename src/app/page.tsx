import { redirect } from 'next/navigation';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

export default async function HomePage() {
  const session = await getCurrentAuthenticatedSession();
  redirect(session?.user.documentAccessMode === 'document-portal' ? '/documents' : '/dashboard');
}
