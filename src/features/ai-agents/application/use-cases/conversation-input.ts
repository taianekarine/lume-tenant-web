export const MAX_AI_CONVERSATION_MESSAGE_LENGTH = 4_000;
export const MAX_AI_CONVERSATION_IDENTIFIER_LENGTH = 256;

export function normalizeConversationMessage(message: unknown): string | null {
  if (typeof message !== 'string') {
    return null;
  }

  const normalizedMessage = message.trim();

  if (
    normalizedMessage.length === 0 ||
    normalizedMessage.length > MAX_AI_CONVERSATION_MESSAGE_LENGTH
  ) {
    return null;
  }

  return normalizedMessage;
}

export function normalizeConversationIdentifier(identifier: unknown): string | null {
  if (typeof identifier !== 'string') {
    return null;
  }

  const normalizedIdentifier = identifier.trim();

  if (
    normalizedIdentifier.length === 0 ||
    normalizedIdentifier.length > MAX_AI_CONVERSATION_IDENTIFIER_LENGTH
  ) {
    return null;
  }

  return normalizedIdentifier;
}
