/** @jest-environment node */

import { redirect } from 'next/navigation';

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

import Page from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));
jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));

const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedRedirect = jest.mocked(redirect);

function createSession(
  permissions: readonly Permission[],
  departments: readonly string[] = ['commercial'],
): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-001',
    user: {
      id: 'employee-001',
      name: 'Usuário Comercial',
      type: 'employee',
      departments,
      permissions,
      clientCategory: null,
      isActive: true,
    },
    issuedAt: '2026-07-21T12:00:00.000Z',
    expiresAt: '2026-07-21T20:00:00.000Z',
    rememberDevice: false,
  };
}

describe('quote proposals parent route', () => {
  beforeEach(() => {
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects a visitor without a session to login', async () => {
    mockedSession.mockResolvedValue(null);

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/login');
  });

  it('protects the route with permission and Commercial scope', async () => {
    mockedSession.mockResolvedValue(createSession(['dashboard:view']));

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');

    mockedSession.mockResolvedValue(
      createSession(['whatsapp-conversations:manage'], ['operations']),
    );
    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedRedirect).toHaveBeenLastCalledWith('/dashboard');
  });

  it('redirects an authorized operator to the priority pending queue', async () => {
    mockedSession.mockResolvedValue(createSession(['whatsapp-conversations:manage']));

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/quote-proposals/pending');
  });
});
