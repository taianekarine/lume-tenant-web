import { AUTHENTICATED_SESSION_VERSION } from '../entities';
import { DEFAULT_SESSION_DURATION_MS, REMEMBERED_SESSION_DURATION_MS } from '../policies';
import { createAuthenticatedSession } from './create-authenticated-session';

describe('createAuthenticatedSession', () => {
  const issuedAt = new Date('2026-07-20T10:00:00.000Z');

  it('creates an authenticated session for an employee', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-employee-001',
      userId: 'employee-001',
      name: 'Maria',
      type: 'employee',
      departments: ['commercial'],
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    expect(session).toEqual({
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-employee-001',
      user: {
        id: 'employee-001',
        name: 'Maria',
        type: 'employee',
        departments: ['commercial'],
        permissions: expect.any(Array),
        clientCategory: null,
        isActive: true,
      },
      issuedAt: '2026-07-20T10:00:00.000Z',
      expiresAt: '2026-07-20T18:00:00.000Z',
      rememberDevice: false,
    });
  });

  it('resolves department permissions for an employee', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-employee-002',
      userId: 'employee-002',
      name: 'João',
      type: 'employee',
      departments: ['operations'],
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    expect(session.user.permissions).toContain('dashboard:view');
    expect(session.user.permissions).toContain('operations:view');
    expect(session.user.permissions).toContain('operations:manage');
    expect(session.user.permissions).toContain('drivers:view');
  });

  it('creates an authenticated session for a continuous charter client', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-client-001',
      userId: 'client-001',
      name: 'Empresa Exemplo',
      type: 'client',
      clientCategory: 'continuous-charter',
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    expect(session.user).toEqual({
      id: 'client-001',
      name: 'Empresa Exemplo',
      type: 'client',
      departments: [],
      permissions: expect.any(Array),
      clientCategory: 'continuous-charter',
      isActive: true,
    });

    expect(session.user.permissions).toContain('contracts:view');
    expect(session.user.permissions).toContain('trips:view');
    expect(session.user.permissions).not.toContain('quotes:update');
  });

  it('creates an authenticated session for an eventual charter client', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-client-002',
      userId: 'client-002',
      name: 'Cliente Eventual',
      type: 'client',
      clientCategory: 'eventual-charter',
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    expect(session.user.permissions).toContain('quotes:view');
    expect(session.user.permissions).toContain('quotes:create');
    expect(session.user.permissions).toContain('quotes:update');
    expect(session.user.permissions).toContain('support:create');
  });

  it('uses the default session duration when remember device is false', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-default-duration',
      userId: 'employee-003',
      name: 'Ana',
      type: 'employee',
      departments: ['financial'],
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    const expirationDuration =
      new Date(session.expiresAt).getTime() - new Date(session.issuedAt).getTime();

    expect(expirationDuration).toBe(DEFAULT_SESSION_DURATION_MS);
    expect(session.rememberDevice).toBe(false);
  });

  it('uses the remembered session duration when remember device is true', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-remembered-duration',
      userId: 'client-003',
      name: 'Cliente Contínuo',
      type: 'client',
      clientCategory: 'continuous-charter',
      isActive: true,
      rememberDevice: true,
      issuedAt,
    });

    const expirationDuration =
      new Date(session.expiresAt).getTime() - new Date(session.issuedAt).getTime();

    expect(expirationDuration).toBe(REMEMBERED_SESSION_DURATION_MS);
    expect(session.rememberDevice).toBe(true);
  });

  it('uses the current authenticated session version', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-version',
      userId: 'employee-004',
      name: 'Carlos',
      type: 'employee',
      departments: ['maintenance'],
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    expect(session.version).toBe(AUTHENTICATED_SESSION_VERSION);
  });

  it('preserves the provided session and user identifiers', () => {
    const session = createAuthenticatedSession({
      sessionId: 'custom-session-id',
      userId: 'custom-user-id',
      name: 'Usuário Exemplo',
      type: 'employee',
      departments: ['monitoring'],
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    expect(session.id).toBe('custom-session-id');
    expect(session.user.id).toBe('custom-user-id');
  });

  it('preserves the active status supplied for the user', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-inactive-user',
      userId: 'employee-inactive',
      name: 'Usuário Inativo',
      type: 'employee',
      departments: ['commercial'],
      isActive: false,
      rememberDevice: false,
      issuedAt,
    });

    expect(session.user.isActive).toBe(false);
  });

  it('does not generate duplicate permissions', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-unique-permissions',
      userId: 'employee-005',
      name: 'Gerente Comercial',
      type: 'employee',
      departments: ['commercial'],
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    const uniquePermissions = new Set(session.user.permissions);

    expect(uniquePermissions.size).toBe(session.user.permissions.length);
  });

  it('does not include credentials in the session', () => {
    const session = createAuthenticatedSession({
      sessionId: 'session-without-credentials',
      userId: 'employee-006',
      name: 'Fernanda',
      type: 'employee',
      departments: ['human-resources'],
      isActive: true,
      rememberDevice: false,
      issuedAt,
    });

    expect(session).not.toHaveProperty('password');
    expect(session).not.toHaveProperty('identifier');
    expect(session.user).not.toHaveProperty('password');
  });
});
