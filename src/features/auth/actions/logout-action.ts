'use server';

import { redirect } from 'next/navigation';

import { removeAuthenticatedSession } from '../application';
import {
  createCookieApiTokenStorage,
  createCookieSessionStorage,
  createTenantApiAuthenticationGateway,
} from '../infrastructure';

export interface LogoutActionState {
  readonly message: string | null;
}

const LOGOUT_DESTINATION = '/login';

export async function logoutAction(
  previousState: LogoutActionState,
  formData: FormData,
): Promise<LogoutActionState> {
  void previousState;
  void formData;

  try {
    const [sessionStorage, apiTokenStorage] = await Promise.all([
      createCookieSessionStorage(),
      createCookieApiTokenStorage(),
    ]);
    const apiTokens = await apiTokenStorage.get();

    if (apiTokens !== null) {
      try {
        const authenticationGateway = createTenantApiAuthenticationGateway();

        await authenticationGateway.logout(apiTokens.refreshToken);
      } catch {
        // Local logout must succeed even when the API is temporarily unavailable.
      }
    }

    await Promise.all([removeAuthenticatedSession(sessionStorage), apiTokenStorage.remove()]);
  } catch {
    return {
      message: 'Não foi possível encerrar sua sessão. Tente novamente.',
    };
  }

  redirect(LOGOUT_DESTINATION);
}
