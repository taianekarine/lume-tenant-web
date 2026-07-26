import { redirect } from 'next/navigation';

import { LoginPage } from '@/features/auth/pages/login-page';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

export default async function Page() {
  const session = await getCurrentAuthenticatedSession();

  if (session !== null) {
    redirect('/dashboard');
  }

  return <LoginPage />;
}
