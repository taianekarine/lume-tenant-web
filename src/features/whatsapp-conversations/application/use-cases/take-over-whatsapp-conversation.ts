import type { WhatsAppConversationRepository } from '../contracts';

export function takeOverWhatsAppConversation(
  repository: WhatsAppConversationRepository,
  conversationId: unknown,
  expectedVersion: unknown,
) {
  if (
    typeof conversationId !== 'string' ||
    conversationId.trim().length === 0 ||
    typeof expectedVersion !== 'number' ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1
  ) {
    return Promise.resolve(null);
  }

  return repository.takeOverConversation(conversationId.trim(), expectedVersion);
}
