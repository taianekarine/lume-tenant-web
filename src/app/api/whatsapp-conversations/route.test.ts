/** @jest-environment node */

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import {
  pollWhatsAppConversationForDashboard,
  pollWhatsAppConversationsForDashboard,
} from '@/features/whatsapp-conversations/server';
import { createWhatsAppConversationFixture } from '@/features/whatsapp-conversations/testing/whatsapp-conversation-fixture';

import { GET } from './route';

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));
jest.mock('@/features/whatsapp-conversations/server', () => ({
  pollWhatsAppConversationForDashboard: jest.fn(),
  pollWhatsAppConversationsForDashboard: jest.fn(),
}));

const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedPollDetail = jest.mocked(pollWhatsAppConversationForDashboard);
const mockedPollList = jest.mocked(pollWhatsAppConversationsForDashboard);

function session(permissions: readonly Permission[]): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-001',
    user: {
      id: 'user-001',
      name: 'Usuário',
      type: 'employee',
      departments: ['commercial'],
      roles: [],
      permissions,
      clientCategory: null,
      isActive: true,
    },
    issuedAt: '2026-07-25T12:00:00.000Z',
    expiresAt: '2026-07-25T20:00:00.000Z',
    rememberDevice: false,
  };
}

describe('WhatsApp polling route', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects polling without whatsapp-conversations:manage', async () => {
    mockedSession.mockResolvedValue(session(['dashboard:view']));

    const response = await GET(new Request('http://localhost/api/whatsapp-conversations'));

    expect(response.status).toBe(403);
    expect(mockedPollList).not.toHaveBeenCalled();
  });

  it('returns the tenant-scoped list through the authenticated server layer', async () => {
    const conversation = createWhatsAppConversationFixture();
    mockedSession.mockResolvedValue(session(['whatsapp-conversations:manage']));
    mockedPollList.mockResolvedValue([conversation]);

    const response = await GET(new Request('http://localhost/api/whatsapp-conversations'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      conversations: [conversation],
    });
  });

  it('loads a selected conversation with its complete history', async () => {
    const conversation = createWhatsAppConversationFixture();
    mockedSession.mockResolvedValue(session(['whatsapp-conversations:manage']));
    mockedPollDetail.mockResolvedValue(conversation);

    const response = await GET(
      new Request(`http://localhost/api/whatsapp-conversations?conversationId=${conversation.id}`),
    );

    expect(response.status).toBe(200);
    expect(mockedPollDetail).toHaveBeenCalledWith(conversation.id);
  });
});
