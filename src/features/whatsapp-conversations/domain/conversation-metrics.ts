import { isWhatsAppAwaitingProposal, type WhatsAppConversation } from './entities';

export interface WhatsAppConversationMetrics {
  readonly total: number;
  readonly botActive: number;
  readonly attendantActive: number;
  readonly automationPaused: number;
  readonly unreadMessages: number;
  readonly unreadConversations: number;
  readonly awaitingProposal: number;
}

export function getWhatsAppConversationMetrics(
  conversations: readonly WhatsAppConversation[],
): WhatsAppConversationMetrics {
  return conversations.reduce<WhatsAppConversationMetrics>(
    (metrics, conversation) => ({
      total: metrics.total + 1,
      botActive: metrics.botActive + (conversation.conversationState === 'bot-active' ? 1 : 0),
      attendantActive:
        metrics.attendantActive + (conversation.conversationState === 'human-active' ? 1 : 0),
      automationPaused:
        metrics.automationPaused +
        (conversation.conversationState === 'waiting-for-customer' ||
        conversation.conversationState === 'sent-to-human'
          ? 1
          : 0),
      unreadMessages: metrics.unreadMessages + conversation.unreadCount,
      unreadConversations:
        metrics.unreadConversations +
        (conversation.conversationState !== 'closed' && conversation.unreadCount > 0 ? 1 : 0),
      awaitingProposal:
        metrics.awaitingProposal + (isWhatsAppAwaitingProposal(conversation) ? 1 : 0),
    }),
    {
      total: 0,
      botActive: 0,
      attendantActive: 0,
      automationPaused: 0,
      unreadMessages: 0,
      unreadConversations: 0,
      awaitingProposal: 0,
    },
  );
}
