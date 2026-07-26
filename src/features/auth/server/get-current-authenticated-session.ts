import 'server-only';

import { getAuthenticatedSession, type SessionStorage } from '../application';
import type { AuthenticatedSession } from '../domain';
import { createCookieSessionStorage } from '../infrastructure';

export async function getCurrentAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  let sessionStorage: SessionStorage;

  try {
    sessionStorage = await createCookieSessionStorage();
  } catch {
    return null;
  }

  return getAuthenticatedSession(sessionStorage);
}
