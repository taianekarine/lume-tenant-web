import type { WhatsAppConversationRepository } from '../contracts';

export function closeWhatsAppConversation(
  repository: WhatsAppConversationRepository,
  conversationId: unknown,
  expectedVersion: unknown,
  reason?: unknown,
) {
  const normalizedReason =
    reason === null || reason === undefined
      ? null
      : typeof reason === 'string'
        ? reason.trim() || null
        : undefined;

  if (
    typeof conversationId !== 'string' ||
    conversationId.trim().length === 0 ||
    typeof expectedVersion !== 'number' ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1 ||
    normalizedReason === undefined ||
    (normalizedReason !== null && (normalizedReason.length < 3 || normalizedReason.length > 500))
  ) {
    return Promise.resolve(null);
  }

  return repository.closeConversation(conversationId.trim(), expectedVersion, normalizedReason);
}
