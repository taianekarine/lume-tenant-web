import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from './authenticated-session';

describe('authenticated session contract', () => {
  it('defines the current session version', () => {
    expect(AUTHENTICATED_SESSION_VERSION).toBe(1);
  });

  it('accepts a session for an employee', () => {
    const session: AuthenticatedSession = {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-employee-001',
      user: {
        id: 'employee-001',
        name: 'Maria',
        type: 'employee',
        departments: ['commercial'],
        roles: ['manager'],
        permissions: ['dashboard:view', 'commercial:view', 'reports:view'],
        clientCategory: null,
        isActive: true,
      },
      issuedAt: '2026-07-20T10:00:00.000Z',
      expiresAt: '2026-07-20T18:00:00.000Z',
      rememberDevice: false,
    };

    expect(session.version).toBe(1);
    expect(session.user.type).toBe('employee');
    expect(session.user.departments).toContain('commercial');
    expect(session.rememberDevice).toBe(false);
  });

  it('accepts a session for a client', () => {
    const session: AuthenticatedSession = {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-client-001',
      user: {
        id: 'client-001',
        name: 'Empresa Exemplo',
        type: 'client',
        departments: [],
        roles: [],
        permissions: ['dashboard:view', 'contracts:view', 'trips:view'],
        clientCategory: 'continuous-charter',
        isActive: true,
      },
      issuedAt: '2026-07-20T10:00:00.000Z',
      expiresAt: '2026-08-19T10:00:00.000Z',
      rememberDevice: true,
    };

    expect(session.user.type).toBe('client');
    expect(session.user.clientCategory).toBe('continuous-charter');
    expect(session.rememberDevice).toBe(true);
  });

  it('stores session dates as ISO 8601 strings', () => {
    const session: AuthenticatedSession = {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-employee-002',
      user: {
        id: 'employee-002',
        name: 'João',
        type: 'employee',
        departments: ['operations'],
        roles: ['driver'],
        permissions: ['dashboard:view', 'operations:view', 'drivers:view'],
        clientCategory: null,
        isActive: true,
      },
      issuedAt: '2026-07-20T10:00:00.000Z',
      expiresAt: '2026-07-20T18:00:00.000Z',
      rememberDevice: false,
    };

    expect(new Date(session.issuedAt).toISOString()).toBe(session.issuedAt);

    expect(new Date(session.expiresAt).toISOString()).toBe(session.expiresAt);
  });

  it('keeps the expiration date after the issue date', () => {
    const session: AuthenticatedSession = {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-employee-003',
      user: {
        id: 'employee-003',
        name: 'Ana',
        type: 'employee',
        departments: ['financial'],
        roles: [],
        permissions: ['dashboard:view', 'financial:view'],
        clientCategory: null,
        isActive: true,
      },
      issuedAt: '2026-07-20T10:00:00.000Z',
      expiresAt: '2026-07-20T18:00:00.000Z',
      rememberDevice: false,
    };

    const issuedAt = new Date(session.issuedAt).getTime();
    const expiresAt = new Date(session.expiresAt).getTime();

    expect(expiresAt).toBeGreaterThan(issuedAt);
  });

  it('does not require credentials inside the session', () => {
    const session: AuthenticatedSession = {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-client-002',
      user: {
        id: 'client-002',
        name: 'Cliente Eventual',
        type: 'client',
        departments: [],
        roles: [],
        permissions: ['dashboard:view', 'quotes:create'],
        clientCategory: 'eventual-charter',
        isActive: true,
      },
      issuedAt: '2026-07-20T10:00:00.000Z',
      expiresAt: '2026-07-20T18:00:00.000Z',
      rememberDevice: false,
    };

    expect(session).not.toHaveProperty('password');
    expect(session).not.toHaveProperty('identifier');
    expect(session.user).not.toHaveProperty('password');
  });
});
