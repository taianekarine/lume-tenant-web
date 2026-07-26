/** @jest-environment node */

import { redirect } from 'next/navigation';

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { DashboardPage } from '@/features/dashboard/pages';

import Page from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));

const mockedGetCurrentAuthenticatedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedRedirect = jest.mocked(redirect);

function createSession(permissions: readonly Permission[]): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-employee-001',
    user: {
      id: 'employee-001',
      name: 'Maria Silva',
      type: 'employee',
      departments: ['commercial'],
      roles: ['manager'],
      permissions,
      clientCategory: null,
      isActive: true,
    },
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    rememberDevice: false,
  };
}

describe('dashboard page route', () => {
  beforeEach(() => {
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  afterEach(() => {
    mockedGetCurrentAuthenticatedSession.mockReset();
    mockedRedirect.mockReset();
  });

  it('redirects a visitor without a session to login', async () => {
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(null);

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects an authenticated user without dashboard permission', async () => {
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(createSession(['profile:view']));

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/');
  });

  it('renders the dashboard for an authorized session', async () => {
    const session = createSession(['dashboard:view']);
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(session);

    const page = await Page();

    expect(page.type).toBe(DashboardPage);
    expect(page.props.session).toBe(session);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});
