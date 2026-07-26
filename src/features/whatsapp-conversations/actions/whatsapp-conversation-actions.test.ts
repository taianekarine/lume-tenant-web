/** @jest-environment node */

import { revalidatePath } from 'next/cache';

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

import { WhatsAppConversationRepositoryError } from '../application';
import {
  forwardWhatsAppConversationForDashboard,
  markWhatsAppConversationAsReadForDashboard,
  pollWhatsAppConversationForDashboard,
  returnWhatsAppConversationToBotForDashboard,
  sendHumanWhatsAppMessageForDashboard,
  takeOverWhatsAppConversationForDashboard,
} from '../server';
import { createWhatsAppConversationFixture } from '../testing/whatsapp-conversation-fixture';
import {
  forwardWhatsAppConversationAction,
  markWhatsAppConversationAsReadAction,
  returnWhatsAppConversationToBotAction,
  sendHumanWhatsAppMessageAction,
  takeOverWhatsAppConversationAction,
} from './whatsapp-conversation-actions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));
jest.mock('../server', () => ({
  forwardWhatsAppConversationForDashboard: jest.fn(),
  markWhatsAppConversationAsReadForDashboard: jest.fn(),
  pollWhatsAppConversationForDashboard: jest.fn(),
  returnWhatsAppConversationToBotForDashboard: jest.fn(),
  sendHumanWhatsAppMessageForDashboard: jest.fn(),
  takeOverWhatsAppConversationForDashboard: jest.fn(),
}));

const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedTakeOver = jest.mocked(takeOverWhatsAppConversationForDashboard);
const mockedReturn = jest.mocked(returnWhatsAppConversationToBotForDashboard);
const mockedForward = jest.mocked(forwardWhatsAppConversationForDashboard);
const mockedMarkRead = jest.mocked(markWhatsAppConversationAsReadForDashboard);
const mockedSendMessage = jest.mocked(sendHumanWhatsAppMessageForDashboard);
const mockedPoll = jest.mocked(pollWhatsAppConversationForDashboard);

function createSession(permissions: readonly Permission[]): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-001',
    user: {
      id: 'employee-001',
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

describe('WhatsApp conversation server actions', () => {
  beforeEach(() => {
    mockedSession.mockResolvedValue(createSession(['whatsapp-conversations:manage']));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('enforces whatsapp-conversations:manage before every write', async () => {
    mockedSession.mockResolvedValue(createSession(['dashboard:view']));

    await expect(
      takeOverWhatsAppConversationAction({
        conversationId: 'conversation-001',
        expectedVersion: 3,
      }),
    ).resolves.toMatchObject({ success: false, code: 'forbidden' });

    expect(mockedTakeOver).not.toHaveBeenCalled();
  });

  it('passes expectedVersion to takeover and return-to-bot', async () => {
    const taken = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      version: 4,
    });
    const returned = createWhatsAppConversationFixture({
      conversationState: 'bot-active',
      flowStep: 'commercial-follow-up-menu',
      version: 5,
    });
    mockedTakeOver.mockResolvedValue(taken);
    mockedReturn.mockResolvedValue(returned);

    await takeOverWhatsAppConversationAction({
      conversationId: taken.id,
      expectedVersion: 3,
    });
    await returnWhatsAppConversationToBotAction({
      conversationId: returned.id,
      expectedVersion: 4,
    });

    expect(mockedTakeOver).toHaveBeenCalledWith(taken.id, 3);
    expect(mockedReturn).toHaveBeenCalledWith(returned.id, 4);
    expect(revalidatePath).toHaveBeenCalledWith('/whatsapp-conversations');
  });

  it('reloads the current conversation and reports a 409 conflict', async () => {
    const latest = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      version: 9,
    });
    mockedTakeOver.mockRejectedValue(
      new WhatsAppConversationRepositoryError('conflict', 'A conversa foi alterada.', 9),
    );
    mockedPoll.mockResolvedValue(latest);

    await expect(
      takeOverWhatsAppConversationAction({
        conversationId: latest.id,
        expectedVersion: 8,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        success: false,
        code: 'conflict',
        conversation: latest,
      }),
    );
    expect(mockedPoll).toHaveBeenCalledWith(latest.id);
  });

  it('executes forward and mark-read only through their real API operations', async () => {
    const forwarded = createWhatsAppConversationFixture({
      department: 'operations',
      conversationState: 'sent-to-human',
      version: 4,
    });
    const read = createWhatsAppConversationFixture({ unreadCount: 0, version: 5 });
    mockedForward.mockResolvedValue(forwarded);
    mockedMarkRead.mockResolvedValue(read);

    await forwardWhatsAppConversationAction({
      conversationId: forwarded.id,
      targetDepartment: 'operations',
      expectedVersion: 3,
    });
    await markWhatsAppConversationAsReadAction({
      conversationId: read.id,
      expectedVersion: 4,
    });

    expect(mockedForward).toHaveBeenCalledWith(forwarded.id, 'operations', 3);
    expect(mockedMarkRead).toHaveBeenCalledWith(read.id, 4);
  });

  it('sends an idempotent human message and returns the persisted pending message', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo: { id: 'employee-001', name: 'Usuário Comercial' },
      version: 6,
    });
    const message = {
      id: '00000000-0000-4000-8000-000000000701',
      direction: 'outbound' as const,
      deliveryStatus: 'pending' as const,
      kind: 'text' as const,
      text: 'Sua solicitação está em análise.',
      attachment: null,
      occurredAt: '2026-07-26T12:00:00.000Z',
      attempts: [],
    };
    mockedSendMessage.mockResolvedValue({ conversation, message });
    const input = {
      conversationId: conversation.id,
      commandId: '00000000-0000-4000-8000-000000000702',
      idempotencyKey: '00000000-0000-4000-8000-000000000703',
      expectedVersion: 5,
      text: message.text,
    };

    await expect(sendHumanWhatsAppMessageAction(input)).resolves.toEqual({
      success: true,
      conversation,
      message,
    });
    expect(mockedSendMessage).toHaveBeenCalledWith(conversation.id, {
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
      expectedVersion: input.expectedVersion,
      text: input.text,
    });
  });

  it('preserves the current conversation when a human message conflicts', async () => {
    const latest = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      assignedTo: { id: 'employee-001', name: 'Usuário Comercial' },
      version: 12,
    });
    mockedSendMessage.mockRejectedValue(
      new WhatsAppConversationRepositoryError('conflict', 'Conversa alterada.', 12),
    );
    mockedPoll.mockResolvedValue(latest);

    await expect(
      sendHumanWhatsAppMessageAction({
        conversationId: latest.id,
        commandId: '00000000-0000-4000-8000-000000000702',
        idempotencyKey: '00000000-0000-4000-8000-000000000703',
        expectedVersion: 11,
        text: 'Mensagem preservada.',
      }),
    ).resolves.toMatchObject({
      success: false,
      code: 'conflict',
      conversation: latest,
    });
  });
});
