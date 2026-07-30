import 'server-only';

import {
  getAuthenticatedSession,
  type ApiTokenStorage,
  type AuthenticationGateway,
  type SessionStorage,
} from '../application';
import type { AuthenticatedSession } from '../domain';
import {
  createCookieApiTokenStorage,
  createCookieSessionStorage,
  createTenantApiAuthenticationGateway,
} from '../infrastructure';
import { isSimulatedLoginEnabled } from '../simulation';

export async function getCurrentAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  let sessionStorage: SessionStorage;
  let session: AuthenticatedSession | null;

  try {
    sessionStorage = await createCookieSessionStorage();
    session = await getAuthenticatedSession(sessionStorage);
  } catch {
    return null;
  }

  if (session === null) return null;

  if (isSimulatedLoginEnabled(process.env.NODE_ENV, process.env.AUTH_SIMULATION_ENABLED)) {
    return session;
  }

  let tokenStorage: ApiTokenStorage;
  let authenticationGateway: AuthenticationGateway;

  try {
    tokenStorage = await createCookieApiTokenStorage();
    authenticationGateway = createTenantApiAuthenticationGateway();
    const tokens = await tokenStorage.get();
    if (tokens === null) return null;

    const currentUser = await authenticationGateway.getCurrentIdentity(tokens.accessToken);
    if (currentUser.id !== session.user.id || !currentUser.isActive) return null;

    return {
      ...session,
      user: currentUser,
    };
  } catch {
    return null;
  }
}
