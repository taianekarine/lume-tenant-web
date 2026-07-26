/** @jest-environment node */

import { redirect } from 'next/navigation';

import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

import Page from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));

const mockedGetCurrentAuthenticatedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedRedirect = jest.mocked(redirect);

describe('login page route', () => {
  afterEach(() => {
    mockedGetCurrentAuthenticatedSession.mockReset();
    mockedRedirect.mockReset();
  });

  it('renders the login page when there is no current session', async () => {
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(null);

    const page = await Page();

    expect(page.type).toBeDefined();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('redirects an authenticated user away from login', async () => {
    const session: AuthenticatedSession = {
      version: AUTHENTICATED_SESSION_VERSION,
      id: 'session-employee-001',
      user: {
        id: 'employee-001',
        name: 'Usuário de demonstração',
        type: 'employee',
        departments: [],
        roles: [],
        permissions: ['dashboard:view'],
        clientCategory: null,
        isActive: true,
      },
      issuedAt: new Date(Date.now() - 60_000).toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      rememberDevice: false,
    };

    mockedGetCurrentAuthenticatedSession.mockResolvedValue(session);
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');
  });
});
