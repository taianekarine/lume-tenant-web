import type { AuthenticatedSession } from '../../domain';
import type { SessionStorage } from '../contracts';

export function saveAuthenticatedSession(
  sessionStorage: Pick<SessionStorage, 'save'>,
  session: AuthenticatedSession,
): Promise<void> {
  return sessionStorage.save(session);
}
