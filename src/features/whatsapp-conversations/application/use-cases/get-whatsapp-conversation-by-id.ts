import type { WhatsAppConversationRepository } from '../contracts';

export function getWhatsAppConversationById(
  repository: WhatsAppConversationRepository,
  conversationId: unknown,
) {
  if (typeof conversationId !== 'string') {
    return Promise.resolve(null);
  }

  const normalizedConversationId = conversationId.trim();

  if (normalizedConversationId.length === 0) {
    return Promise.resolve(null);
  }

  return repository.getConversationById(normalizedConversationId);
}
