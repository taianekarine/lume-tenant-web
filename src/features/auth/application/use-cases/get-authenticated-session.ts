import { isSessionValid, type AuthenticatedSession } from '../../domain';
import type { SessionStorage } from '../contracts';

export async function getAuthenticatedSession(
  sessionStorage: Pick<SessionStorage, 'get'>,
  currentDate: Date = new Date(),
): Promise<AuthenticatedSession | null> {
  const session = await sessionStorage.get();

  if (session === null) {
    return null;
  }

  if (isSessionValid(session, currentDate)) {
    return session;
  }

  return null;
}
