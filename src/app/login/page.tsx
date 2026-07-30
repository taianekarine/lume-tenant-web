import { redirect } from 'next/navigation';

import { LoginPage } from '@/features/auth/pages/login-page';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

export default async function Page({
  searchParams,
}: {
  readonly searchParams?: Promise<{ passwordChanged?: string }>;
} = {}) {
  const session = await getCurrentAuthenticatedSession();
  const params = await searchParams;

  if (session !== null) {
    redirect('/dashboard');
  }

  return <LoginPage passwordChanged={params?.passwordChanged === '1'} />;
}
