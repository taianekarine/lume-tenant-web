import type { SessionStorage } from '../contracts';

export function removeAuthenticatedSession(
  sessionStorage: Pick<SessionStorage, 'remove'>,
): Promise<void> {
  return sessionStorage.remove();
}
