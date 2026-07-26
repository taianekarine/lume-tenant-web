import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '../../domain';
import type { SessionStorage } from '../contracts';
import { getAuthenticatedSession } from './get-authenticated-session';

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

const createGet = (
  session: AuthenticatedSession | null,
): jest.Mock<ReturnType<SessionStorage['get']>, Parameters<SessionStorage['get']>> =>
  jest
    .fn<ReturnType<SessionStorage['get']>, Parameters<SessionStorage['get']>>()
    .mockResolvedValue(session);

describe('getAuthenticatedSession', () => {
  it('returns null when there is no stored session', async () => {
    const get = createGet(null);

    await expect(getAuthenticatedSession({ get }, currentDate)).resolves.toBeNull();

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('returns the stored session when it is valid', async () => {
    const get = createGet(validSession);

    await expect(getAuthenticatedSession({ get }, currentDate)).resolves.toBe(validSession);
  });

  it('rejects an invalid session without mutating storage', async () => {
    const expiredSession: AuthenticatedSession = {
      ...validSession,
      expiresAt: '2026-07-20T09:59:59.999Z',
    };
    const get = createGet(expiredSession);

    await expect(getAuthenticatedSession({ get }, currentDate)).resolves.toBeNull();
  });
});
