import { createWhatsAppConversationFixture } from '../testing/whatsapp-conversation-fixture';
import { getWhatsAppConversationMetrics } from './conversation-metrics';

describe('getWhatsAppConversationMetrics', () => {
  it('derives all indicators from the canonical conversation state', () => {
    const currentQuoteRequest = createWhatsAppConversationFixture().currentQuoteRequest;
    expect(currentQuoteRequest).not.toBeNull();
    const metrics = getWhatsAppConversationMetrics([
      createWhatsAppConversationFixture({
        id: 'bot',
        conversationState: 'bot-active',
        unreadCount: 3,
      }),
      createWhatsAppConversationFixture({
        id: 'attendant',
        conversationState: 'human-active',
        unreadCount: 1,
      }),
      createWhatsAppConversationFixture({
        id: 'paused',
        conversationState: 'sent-to-human',
        flowStep: 'human-service',
        requestStatus: 'under-review',
        unreadCount: 2,
        currentQuoteRequest: {
          ...currentQuoteRequest!,
          status: 'under-review',
        },
      }),
      createWhatsAppConversationFixture({
        id: 'closed',
        conversationState: 'closed',
        unreadCount: 0,
      }),
    ]);

    expect(metrics).toEqual({
      total: 4,
      botActive: 1,
      attendantActive: 1,
      automationPaused: 1,
      unreadMessages: 6,
      unreadConversations: 3,
      awaitingProposal: 1,
    });
  });

  it('counts conversations with unread messages instead of summing message totals', () => {
    const metrics = getWhatsAppConversationMetrics([
      createWhatsAppConversationFixture({
        id: 'unread',
        unreadCount: 4,
      }),
      createWhatsAppConversationFixture({
        id: 'read',
        unreadCount: 0,
      }),
    ]);

    expect(metrics.unreadConversations).toBe(1);
  });

  it('does not count unread messages from closed conversations as unread conversations', () => {
    const metrics = getWhatsAppConversationMetrics([
      createWhatsAppConversationFixture({
        id: 'active-unread',
        conversationState: 'bot-active',
        unreadCount: 1,
      }),
      createWhatsAppConversationFixture({
        id: 'closed-unread',
        conversationState: 'closed',
        unreadCount: 7,
      }),
    ]);

    expect(metrics.unreadConversations).toBe(1);
  });
});
