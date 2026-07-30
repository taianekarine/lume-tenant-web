import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

export const metadata: Metadata = {
  title: 'Recuperar senha | Lume',
  description: 'Solicite um link seguro para redefinir sua senha.',
};

export default async function ForgotPasswordRoute() {
  if ((await getCurrentAuthenticatedSession()) !== null) {
    redirect('/dashboard');
  }

  return <ForgotPasswordPage />;
}
