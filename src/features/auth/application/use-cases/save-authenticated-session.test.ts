import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '../../domain';
import type { SessionStorage } from '../contracts';
import { saveAuthenticatedSession } from './save-authenticated-session';

describe('saveAuthenticatedSession', () => {
  it('delegates the authenticated session to the storage contract', async () => {
    const session: AuthenticatedSession = {
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
    const save = jest
      .fn<ReturnType<SessionStorage['save']>, Parameters<SessionStorage['save']>>()
      .mockResolvedValue(undefined);

    await expect(saveAuthenticatedSession({ save }, session)).resolves.toBeUndefined();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(session);
  });
});
