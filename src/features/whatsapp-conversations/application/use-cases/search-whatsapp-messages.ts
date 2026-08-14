import type { WhatsAppConversationRepository } from '../contracts';

export function searchWhatsAppMessages(
  repository: WhatsAppConversationRepository,
  conversationId: unknown,
  search: unknown,
  page: unknown = 1,
) {
  if (typeof conversationId !== 'string' || typeof search !== 'string') {
    return Promise.resolve(null);
  }
  const normalizedConversationId = conversationId.trim();
  const normalizedSearch = search.trim();
  if (!normalizedConversationId || normalizedSearch.length < 2 || normalizedSearch.length > 160) {
    return Promise.resolve(null);
  }
  const normalizedPage =
    typeof page === 'number' && Number.isSafeInteger(page) && page > 0 ? page : 1;
  return repository.searchMessages(normalizedConversationId, normalizedSearch, normalizedPage);
}
