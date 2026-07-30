/** @jest-environment node */

import { WhatsAppConversationRepositoryError } from '../../application';
import {
  MockWhatsAppConversationRepository,
  resetMockWhatsAppConversations,
} from './mock-whatsapp-conversation-repository';

describe('MockWhatsAppConversationRepository', () => {
  const repository = new MockWhatsAppConversationRepository();

  beforeEach(() => {
    resetMockWhatsAppConversations();
  });

  it('filters using the same list parameters exposed by the API', async () => {
    await expect(repository.getConversations({ search: 'contato' })).resolves.toHaveLength(1);
    await expect(repository.getConversations({ department: 'commercial' })).resolves.toHaveLength(
      1,
    );
    await expect(
      repository.getConversations({ requestStatus: 'collecting-information' }),
    ).resolves.toHaveLength(1);
    await expect(repository.getConversations({ state: 'human-active' })).resolves.toEqual([]);
  });

  it('implements versioned takeover, return-to-bot, forward and mark-read', async () => {
    const [initial] = await repository.getConversations();
    const taken = await repository.takeOverConversation(initial.id, initial.version);
    const returned = await repository.returnConversationToBot(taken.id, taken.version);
    const forwarded = await repository.forwardConversation(
      returned.id,
      'operations',
      returned.version,
    );
    const read = await repository.markConversationAsRead(forwarded.id, forwarded.version);

    expect(taken.conversationState).toBe('human-active');
    expect(returned.flowStep).toBe('commercial-follow-up-menu');
    expect(forwarded).toMatchObject({
      department: 'operations',
      conversationState: 'sent-to-human',
    });
    expect(read.unreadCount).toBe(0);
    expect(read.version).toBe(initial.version + 4);
  });

  it('rejects a stale expectedVersion with the current version', async () => {
    const [initial] = await repository.getConversations();
    await repository.takeOverConversation(initial.id, initial.version);

    await expect(repository.markConversationAsRead(initial.id, initial.version)).rejects.toEqual(
      expect.objectContaining<Partial<WhatsAppConversationRepositoryError>>({
        code: 'conflict',
        currentVersion: initial.version + 1,
      }),
    );
  });

  it('persists a pending human message with optimistic versioning', async () => {
    const [initial] = await repository.getConversations();
    const taken = await repository.takeOverConversation(initial.id, initial.version);

    const result = await repository.sendHumanMessage(taken.id, {
      commandId: '00000000-0000-4000-8000-000000000701',
      idempotencyKey: '00000000-0000-4000-8000-000000000702',
      expectedVersion: taken.version,
      text: 'Mensagem humana.',
    });

    expect(result.message).toMatchObject({
      direction: 'outbound',
      deliveryStatus: 'pending',
      text: 'Mensagem humana.',
    });
    expect(result.conversation.version).toBe(taken.version + 1);
    expect(result.conversation.messages).toContainEqual(result.message);
  });
});
