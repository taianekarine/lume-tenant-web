import type { GetWhatsAppConversationsFilters, WhatsAppConversationRepository } from '../contracts';

export function getWhatsAppConversations(
  repository: WhatsAppConversationRepository,
  filters?: GetWhatsAppConversationsFilters,
) {
  return repository.getConversations(filters);
}
