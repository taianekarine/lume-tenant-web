import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '../entities';
import { isSessionValid } from './is-session-valid';

describe('isSessionValid', () => {
  const currentDate = new Date('2026-07-20T10:00:00.000Z');

  const validSession: AuthenticatedSession = {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-employee-001',
    user: {
      id: 'employee-001',
      name: 'Maria',
      type: 'employee',
      departments: ['commercial'],
      roles: ['manager'],
      permissions: ['dashboard:view', 'commercial:view'],
      clientCategory: null,
      isActive: true,
    },
    issuedAt: '2026-07-20T09:00:00.000Z',
    expiresAt: '2026-07-20T18:00:00.000Z',
    rememberDevice: false,
  };

  it('returns true for an active and unexpired session', () => {
    expect(isSessionValid(validSession, currentDate)).toBe(true);
  });

  it('returns false when the session version is outdated', () => {
    const outdatedSession = {
      ...validSession,
      version: 0,
    } as unknown as AuthenticatedSession;

    expect(isSessionValid(outdatedSession, currentDate)).toBe(false);
  });

  it('returns false when the user is inactive', () => {
    const inactiveUserSession: AuthenticatedSession = {
      ...validSession,
      user: {
        ...validSession.user,
        isActive: false,
      },
    };

    expect(isSessionValid(inactiveUserSession, currentDate)).toBe(false);
  });

  it('returns false when the expiration date is invalid', () => {
    const invalidExpirationSession: AuthenticatedSession = {
      ...validSession,
      expiresAt: 'invalid-date',
    };

    expect(isSessionValid(invalidExpirationSession, currentDate)).toBe(false);
  });

  it('returns false when the session has expired', () => {
    const expiredSession: AuthenticatedSession = {
      ...validSession,
      expiresAt: '2026-07-20T09:59:59.999Z',
    };

    expect(isSessionValid(expiredSession, currentDate)).toBe(false);
  });

  it('returns false when expiration equals the current time', () => {
    const sessionExpiringNow: AuthenticatedSession = {
      ...validSession,
      expiresAt: currentDate.toISOString(),
    };

    expect(isSessionValid(sessionExpiringNow, currentDate)).toBe(false);
  });

  it('returns true when the expiration is after the current time', () => {
    const unexpiredSession: AuthenticatedSession = {
      ...validSession,
      expiresAt: '2026-07-20T10:00:00.001Z',
    };

    expect(isSessionValid(unexpiredSession, currentDate)).toBe(true);
  });

  it('validates client sessions using the same rules', () => {
    const clientSession: AuthenticatedSession = {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-client-001',
      user: {
        id: 'client-001',
        name: 'Empresa Exemplo',
        type: 'client',
        departments: [],
        roles: [],
        permissions: ['dashboard:view', 'contracts:view'],
        clientCategory: 'continuous-charter',
        isActive: true,
      },
      issuedAt: '2026-07-20T09:00:00.000Z',
      expiresAt: '2026-07-20T18:00:00.000Z',
      rememberDevice: true,
    };

    expect(isSessionValid(clientSession, currentDate)).toBe(true);
  });
});
