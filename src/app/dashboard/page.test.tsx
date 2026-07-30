/** @jest-environment node */

import { redirect } from 'next/navigation';

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { DashboardPage } from '@/features/dashboard/pages';
import {
  getApprovedQuoteProposalsForDashboard,
  getCancelledQuoteProposalsForDashboard,
  getPendingQuoteProposalsForDashboard,
  getSentQuoteProposalsForDashboard,
} from '@/features/quote-proposals/server';
import { getWhatsAppConversationsForOperationalDashboard } from '@/features/whatsapp-conversations/server';

import Page from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));

jest.mock('@/features/whatsapp-conversations/server', () => ({
  getWhatsAppConversationsForOperationalDashboard: jest.fn(),
}));
jest.mock('@/features/quote-proposals/server', () => ({
  getPendingQuoteProposalsForDashboard: jest.fn(),
  getSentQuoteProposalsForDashboard: jest.fn(),
  getApprovedQuoteProposalsForDashboard: jest.fn(),
  getCancelledQuoteProposalsForDashboard: jest.fn(),
}));

const mockedGetCurrentAuthenticatedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedGetWhatsAppConversationsForOperationalDashboard = jest.mocked(
  getWhatsAppConversationsForOperationalDashboard,
);
const mockedGetPendingQuoteProposals = jest.mocked(getPendingQuoteProposalsForDashboard);
const mockedGetSentQuoteProposals = jest.mocked(getSentQuoteProposalsForDashboard);
const mockedGetApprovedQuoteProposals = jest.mocked(getApprovedQuoteProposalsForDashboard);
const mockedGetCancelledQuoteProposals = jest.mocked(getCancelledQuoteProposalsForDashboard);
const mockedRedirect = jest.mocked(redirect);

function createSession(
  permissions: readonly Permission[],
  departments: readonly string[] = ['commercial'],
): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-employee-001',
    user: {
      id: 'employee-001',
      name: 'Maria Silva',
      type: 'employee',
      departments,
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
    mockedGetWhatsAppConversationsForOperationalDashboard.mockResolvedValue([]);
    mockedGetPendingQuoteProposals.mockResolvedValue({
      items: [],
      total: 0,
      summary: {
        pending: 0,
        sent: 0,
        approved: 0,
        cancelled: 0,
        cancellationReasons: [],
      },
    });
    mockedGetSentQuoteProposals.mockResolvedValue({ items: [], total: 0 });
    mockedGetApprovedQuoteProposals.mockResolvedValue({ items: [], total: 0 });
    mockedGetCancelledQuoteProposals.mockResolvedValue({ items: [], total: 0 });
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  afterEach(() => {
    mockedGetCurrentAuthenticatedSession.mockReset();
    mockedGetWhatsAppConversationsForOperationalDashboard.mockReset();
    mockedGetPendingQuoteProposals.mockReset();
    mockedGetSentQuoteProposals.mockReset();
    mockedGetApprovedQuoteProposals.mockReset();
    mockedGetCancelledQuoteProposals.mockReset();
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

  it('loads indicators for a driver department without WhatsApp management access', async () => {
    const session = createSession(
      ['dashboard:view', 'drivers:view', 'operations:view'],
      ['operations'],
    );
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(session);

    const page = await Page();

    expect(mockedGetWhatsAppConversationsForOperationalDashboard).toHaveBeenCalledWith({
      department: 'operations',
    });
    expect(page.props.initialError).toBeNull();
    expect(mockedGetPendingQuoteProposals).not.toHaveBeenCalled();
  });

  it('moves the quote indicators to the Commercial dashboard', async () => {
    const session = createSession(['dashboard:view', 'whatsapp-conversations:manage']);
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(session);
    mockedGetPendingQuoteProposals.mockResolvedValue({
      items: [],
      total: 4,
      summary: {
        pending: 4,
        sent: 7,
        approved: 3,
        cancelled: 2,
        cancellationReasons: [{ reason: 'Data indisponível', count: 2 }],
      },
    });

    const page = await Page();

    expect(mockedGetPendingQuoteProposals).toHaveBeenCalledWith(1, 1);
    expect(page.props.quoteMetrics).toEqual({
      pending: 4,
      sent: 7,
      approved: 3,
      cancelled: 2,
      delivered: 12,
      cancellationReasons: [{ reason: 'Data indisponível', count: 2 }],
    });
  });
});
