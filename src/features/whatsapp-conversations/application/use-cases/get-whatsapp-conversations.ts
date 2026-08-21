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

export function getWhatsAppConversationPage(
  repository: WhatsAppConversationRepository,
  filters?: GetWhatsAppConversationsFilters,
) {
  return repository.getConversationPage(filters);
}

export function getWhatsAppDashboardConversationPage(
  repository: WhatsAppConversationRepository,
  filters?: GetWhatsAppConversationsFilters,
) {
  return repository.getDashboardConversationPage(filters);
}
