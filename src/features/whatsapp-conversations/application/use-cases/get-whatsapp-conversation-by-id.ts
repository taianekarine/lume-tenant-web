import type { WhatsAppConversationRepository } from '../contracts';

export function getWhatsAppConversationById(
  repository: WhatsAppConversationRepository,
  conversationId: unknown,
  messagePage: unknown = 1,
) {
  if (typeof conversationId !== 'string') {
    return Promise.resolve(null);
  }

  const normalizedConversationId = conversationId.trim();

  if (normalizedConversationId.length === 0) {
    return Promise.resolve(null);
  }

  const normalizedMessagePage =
    typeof messagePage === 'number' && Number.isSafeInteger(messagePage) && messagePage > 0
      ? messagePage
      : 1;

  return repository.getConversationById(normalizedConversationId, normalizedMessagePage);
}
