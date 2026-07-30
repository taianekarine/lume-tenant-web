/** @jest-environment node */

import { redirect } from 'next/navigation';

import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '@/features/auth/domain';
import { LicensePage } from '@/features/tenant-administration/components';
import {
  executeAuthenticatedTenantRequest,
  requireTenantSession,
} from '@/features/tenant-administration/server';

import LicenseRoute from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/features/tenant-administration/server', () => ({
  executeAuthenticatedTenantRequest: jest.fn(),
  requireTenantSession: jest.fn(),
  rethrowTenantPageError: jest.fn((error: unknown) => {
    throw error;
  }),
}));

const mockedRedirect = jest.mocked(redirect);
const mockedRequireTenantSession = jest.mocked(requireTenantSession);
const mockedExecuteAuthenticatedTenantRequest = jest.mocked(executeAuthenticatedTenantRequest);

function session(
  permissions: AuthenticatedSession['user']['permissions'],
  departments: readonly string[] = [],
): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-001',
    user: {
      id: 'employee-001',
      name: 'Maria Silva',
      type: 'employee',
      departments,
      permissions,
      clientCategory: null,
      isActive: true,
    },
    issuedAt: '2026-07-28T12:00:00.000Z',
    expiresAt: '2026-07-28T13:00:00.000Z',
    rememberDevice: false,
  };
}

const license = {
  state: 'active' as const,
  tenantId: '00000000-0000-4000-8000-000000000001',
  installationId: 'installation-001',
  plan: 'mvp',
  features: ['whatsapp'],
  expiresAt: '2027-07-28T12:00:00.000Z',
  graceUntil: '2027-08-04T12:00:00.000Z',
};

describe('license route access', () => {
  beforeEach(() => {
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    mockedExecuteAuthenticatedTenantRequest.mockResolvedValue(license);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects the Management department when it has no required permission', async () => {
    mockedRequireTenantSession.mockResolvedValue(session(['dashboard:view'], ['management']));

    await expect(LicenseRoute()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');
    expect(mockedExecuteAuthenticatedTenantRequest).not.toHaveBeenCalled();
  });

  it('renders the license for Management with the explicit permission', async () => {
    const authenticatedSession = session(['license:view'], ['management']);
    mockedRequireTenantSession.mockResolvedValue(authenticatedSession);

    const page = await LicenseRoute();

    expect(page.type).toBe(LicensePage);
    expect(page.props.session).toBe(authenticatedSession);
    expect(page.props.license).toBe(license);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});
