import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '../../domain/entities';
import type { SessionStorage } from './session-storage';

const authenticatedSession: AuthenticatedSession = {
  version: AUTHENTICATED_SESSION_VERSION,
  id: 'session-employee-001',
  user: {
    id: 'employee-001',
    name: 'Maria',
    type: 'employee',
    departments: ['commercial'],
    permissions: ['dashboard:view', 'commercial:view'],
    clientCategory: null,
    isActive: true,
  },
  issuedAt: '2026-07-20T10:00:00.000Z',
  expiresAt: '2026-07-20T18:00:00.000Z',
  rememberDevice: false,
};

const createSessionStorageMock = (overrides: Partial<SessionStorage> = {}): SessionStorage => ({
  save: () => Promise.resolve(),
  get: () => Promise.resolve(null),
  remove: () => Promise.resolve(),
  ...overrides,
});

describe('SessionStorage contract', () => {
  it('saves an authenticated session asynchronously', async () => {
    const save = jest
      .fn<ReturnType<SessionStorage['save']>, Parameters<SessionStorage['save']>>()
      .mockResolvedValue(undefined);
    const sessionStorage = createSessionStorageMock({ save });

    await expect(sessionStorage.save(authenticatedSession)).resolves.toBeUndefined();

    expect(save).toHaveBeenCalledWith(authenticatedSession);
  });

  it('retrieves the current authenticated session', async () => {
    const get = jest
      .fn<ReturnType<SessionStorage['get']>, Parameters<SessionStorage['get']>>()
      .mockResolvedValue(authenticatedSession);
    const sessionStorage = createSessionStorageMock({ get });

    await expect(sessionStorage.get()).resolves.toBe(authenticatedSession);
  });

  it('returns null when there is no authenticated session', async () => {
    const sessionStorage = createSessionStorageMock();

    await expect(sessionStorage.get()).resolves.toBeNull();
  });

  it('removes the current session asynchronously', async () => {
    const remove = jest
      .fn<ReturnType<SessionStorage['remove']>, Parameters<SessionStorage['remove']>>()
      .mockResolvedValue(undefined);
    const sessionStorage = createSessionStorageMock({ remove });

    await expect(sessionStorage.remove()).resolves.toBeUndefined();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
