/** @jest-environment node */

import { redirect } from 'next/navigation';

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { WhatsAppConversationRepositoryError } from '@/features/whatsapp-conversations/application';
import { WhatsAppConversationsPage } from '@/features/whatsapp-conversations/pages';
import { getWhatsAppConversationsForDashboard } from '@/features/whatsapp-conversations/server';

import Page from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));

jest.mock('@/features/whatsapp-conversations/server', () => ({
  getWhatsAppConversationsForDashboard: jest.fn(),
}));

const mockedGetCurrentAuthenticatedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedGetConversations = jest.mocked(getWhatsAppConversationsForDashboard);
const mockedRedirect = jest.mocked(redirect);

function createSession(permissions: readonly Permission[]): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-commercial-001',
    user: {
      id: 'commercial-001',
      name: 'Usuário Comercial',
      type: 'employee',
      departments: ['commercial'],
      roles: [],
      permissions,
      clientCategory: null,
      isActive: true,
    },
    issuedAt: '2026-07-21T12:00:00.000Z',
    expiresAt: '2026-07-21T20:00:00.000Z',
    rememberDevice: false,
  };
}

describe('WhatsApp conversations page route', () => {
  beforeEach(() => {
    mockedRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects a visitor without a session to login', async () => {
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(null);

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/login');
    expect(mockedGetConversations).not.toHaveBeenCalled();
  });

  it('redirects a user without conversation management permission', async () => {
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(createSession(['dashboard:view']));

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard');
    expect(mockedGetConversations).not.toHaveBeenCalled();
  });

  it('loads data through the server layer for an authorized user', async () => {
    const session = createSession(['dashboard:view', 'whatsapp-conversations:manage']);
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(session);
    mockedGetConversations.mockResolvedValue([]);

    const page = await Page();

    expect(mockedGetConversations).toHaveBeenCalledTimes(1);
    expect(page.type).toBe(WhatsAppConversationsPage);
    expect(page.props).toEqual({ session, conversations: [], initialError: null });
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it('renders a retryable initial error when the Tenant API is unavailable', async () => {
    const session = createSession(['dashboard:view', 'whatsapp-conversations:manage']);
    mockedGetCurrentAuthenticatedSession.mockResolvedValue(session);
    mockedGetConversations.mockRejectedValue(
      new WhatsAppConversationRepositoryError('service-unavailable', 'Tenant API indisponível.'),
    );

    const page = await Page();

    expect(page.props).toEqual({
      session,
      conversations: [],
      initialError: 'Tenant API indisponível.',
    });
  });
});
