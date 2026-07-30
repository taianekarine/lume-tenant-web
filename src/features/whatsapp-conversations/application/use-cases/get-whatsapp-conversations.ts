import type { GetWhatsAppConversationsFilters, WhatsAppConversationRepository } from '../contracts';

export function getWhatsAppConversations(
  repository: WhatsAppConversationRepository,
  filters?: GetWhatsAppConversationsFilters,
) {
  return repository.getConversations(filters);
}

export function getWhatsAppDashboardConversations(
  repository: WhatsAppConversationRepository,
  filters?: GetWhatsAppConversationsFilters,
) {
  return repository.getDashboardConversations(filters);
}
