/** @jest-environment node */

import { redirect } from 'next/navigation';

import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

import {
  requireManagementTenantSession,
  requirePeopleOperationsTenantSession,
} from './tenant-page-security';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));

const mockedRedirect = jest.mocked(redirect);
const mockedSession = jest.mocked(getCurrentAuthenticatedSession);

function session(
  departments: readonly string[],
  permissions: readonly `${string}:${string}`[],
  isAdministrator = false,
) {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-001',
    user: {
      id: 'employee-001',
      name: 'Maria Silva',
      type: 'employee' as const,
      departments,
      permissions,
      clientCategory: null,
      isActive: true,
      isAdministrator,
    },
    issuedAt: '2026-07-28T12:00:00.000Z',
    expiresAt: '2026-07-28T13:00:00.000Z',
    rememberDevice: false,
  } satisfies AuthenticatedSession;
}

describe('management tenant page security', () => {
  beforeEach(() => {
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks a commercial user even if a legacy assignment grants users:manage', async () => {
    mockedSession.mockResolvedValue(session(['commercial'], ['users:manage']));

    await expect(requireManagementTenantSession(['users:manage'])).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('requires both Management and the explicit user permission', async () => {
    const authorized = session(['management'], ['users:manage']);
    mockedSession.mockResolvedValue(authorized);
    await expect(requireManagementTenantSession(['users:manage'])).resolves.toBe(authorized);

    mockedSession.mockResolvedValue(session(['management'], ['dashboard:view']));
    await expect(requireManagementTenantSession(['users:manage'])).rejects.toThrow('NEXT_REDIRECT');
  });

  it('allows an explicit administrator even when department data is empty', async () => {
    const administrator = session([], ['users:manage'], true);
    mockedSession.mockResolvedValue(administrator);

    await expect(requirePeopleOperationsTenantSession(['users:manage'])).resolves.toBe(
      administrator,
    );
  });

  it('allows information technology to access user management with an explicit permission', async () => {
    const informationTechnology = session(
      ['information-technology'],
      ['users:view', 'users:manage'],
    );
    mockedSession.mockResolvedValue(informationTechnology);

    await expect(requirePeopleOperationsTenantSession(['users:view'])).resolves.toBe(
      informationTechnology,
    );
  });
});
