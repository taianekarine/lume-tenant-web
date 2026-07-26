import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '../entities';

export function isSessionValid(
  session: AuthenticatedSession,
  currentDate: Date = new Date(),
): boolean {
  if (session.version !== AUTHENTICATED_SESSION_VERSION) {
    return false;
  }

  if (!session.user.isActive) {
    return false;
  }

  const expirationTimestamp = Date.parse(session.expiresAt);

  if (Number.isNaN(expirationTimestamp)) {
    return false;
  }

  return expirationTimestamp > currentDate.getTime();
}
