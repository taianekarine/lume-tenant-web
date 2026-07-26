import type { WhatsAppConversationRepository } from '../contracts';
import { forwardWhatsAppConversation } from './forward-whatsapp-conversation';
import { getWhatsAppConversationById } from './get-whatsapp-conversation-by-id';
import { getWhatsAppConversations } from './get-whatsapp-conversations';
import { markWhatsAppConversationAsRead } from './mark-whatsapp-conversation-as-read';
import { returnWhatsAppConversationToBot } from './return-whatsapp-conversation-to-bot';
import { sendHumanWhatsAppMessage } from './send-human-whatsapp-message';
import { takeOverWhatsAppConversation } from './take-over-whatsapp-conversation';

function createRepository(): jest.Mocked<WhatsAppConversationRepository> {
  return {
    getConversations: jest.fn(),
    getConversationById: jest.fn(),
    takeOverConversation: jest.fn(),
    returnConversationToBot: jest.fn(),
    forwardConversation: jest.fn(),
    markConversationAsRead: jest.fn(),
    sendHumanMessage: jest.fn(),
  };
}

describe('WhatsApp conversation use cases', () => {
  it('passes the real API list filters to the repository', async () => {
    const repository = createRepository();
    const filters = {
      page: 2,
      pageSize: 50,
      search: 'ana',
      state: 'bot-active' as const,
    };
    repository.getConversations.mockResolvedValue([]);

    await getWhatsAppConversations(repository, filters);

    expect(repository.getConversations).toHaveBeenCalledWith(filters);
  });

  it('normalizes ids before loading a conversation', async () => {
    const repository = createRepository();
    repository.getConversationById.mockResolvedValue(null);

    await getWhatsAppConversationById(repository, ' conversation-001 ');
    await getWhatsAppConversationById(repository, null);

    expect(repository.getConversationById).toHaveBeenCalledTimes(1);
    expect(repository.getConversationById).toHaveBeenCalledWith('conversation-001');
  });

  it('passes expectedVersion to every write', async () => {
    const repository = createRepository();

    await takeOverWhatsAppConversation(repository, ' conversation-001 ', 7);
    await returnWhatsAppConversationToBot(repository, ' conversation-001 ', 8);
    await forwardWhatsAppConversation(repository, ' conversation-001 ', 'operations', 9);
    await markWhatsAppConversationAsRead(repository, ' conversation-001 ', 10);

    expect(repository.takeOverConversation).toHaveBeenCalledWith('conversation-001', 7);
    expect(repository.returnConversationToBot).toHaveBeenCalledWith('conversation-001', 8);
    expect(repository.forwardConversation).toHaveBeenCalledWith(
      'conversation-001',
      'operations',
      9,
    );
    expect(repository.markConversationAsRead).toHaveBeenCalledWith('conversation-001', 10);
  });

  it('does not execute a write with invalid input or version', async () => {
    const repository = createRepository();

    await takeOverWhatsAppConversation(repository, '', 1);
    await returnWhatsAppConversationToBot(repository, 'conversation-001', 0);
    await forwardWhatsAppConversation(repository, 'conversation-001', 'invalid', 1);
    await markWhatsAppConversationAsRead(repository, 'conversation-001', Number.NaN);

    expect(repository.takeOverConversation).not.toHaveBeenCalled();
    expect(repository.returnConversationToBot).not.toHaveBeenCalled();
    expect(repository.forwardConversation).not.toHaveBeenCalled();
    expect(repository.markConversationAsRead).not.toHaveBeenCalled();
  });

  it('validates and normalizes an idempotent human message command', async () => {
    const repository = createRepository();
    const command = {
      commandId: '00000000-0000-4000-8000-000000000701',
      idempotencyKey: '00000000-0000-4000-8000-000000000702',
      expectedVersion: 11,
      text: '  Posso ajudar com mais alguma coisa?  ',
    };

    await sendHumanWhatsAppMessage(repository, ' conversation-001 ', command);

    expect(repository.sendHumanMessage).toHaveBeenCalledWith('conversation-001', {
      ...command,
      text: 'Posso ajudar com mais alguma coisa?',
    });
  });

  it('does not send an invalid or empty human message', async () => {
    const repository = createRepository();

    await sendHumanWhatsAppMessage(repository, 'conversation-001', {
      commandId: 'not-a-uuid',
      idempotencyKey: '00000000-0000-4000-8000-000000000702',
      expectedVersion: 1,
      text: 'Mensagem',
    });
    await sendHumanWhatsAppMessage(repository, 'conversation-001', {
      commandId: '00000000-0000-4000-8000-000000000701',
      idempotencyKey: '00000000-0000-4000-8000-000000000702',
      expectedVersion: 1,
      text: '   ',
    });

    expect(repository.sendHumanMessage).not.toHaveBeenCalled();
  });
});
