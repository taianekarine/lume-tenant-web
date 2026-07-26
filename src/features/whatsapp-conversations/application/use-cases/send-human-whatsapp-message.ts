import type { SendHumanWhatsAppMessageCommand, WhatsAppConversationRepository } from '../contracts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH = 10_000;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function sendHumanWhatsAppMessage(
  repository: WhatsAppConversationRepository,
  conversationId: unknown,
  command: {
    readonly commandId: unknown;
    readonly idempotencyKey: unknown;
    readonly expectedVersion: unknown;
    readonly text: unknown;
  },
) {
  const text = typeof command.text === 'string' ? command.text.trim() : '';

  if (
    typeof conversationId !== 'string' ||
    conversationId.trim().length === 0 ||
    !isUuid(command.commandId) ||
    !isUuid(command.idempotencyKey) ||
    typeof command.expectedVersion !== 'number' ||
    !Number.isInteger(command.expectedVersion) ||
    command.expectedVersion < 1 ||
    text.length === 0 ||
    text.length > HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH
  ) {
    return Promise.resolve(null);
  }

  const normalizedCommand: SendHumanWhatsAppMessageCommand = {
    commandId: command.commandId,
    idempotencyKey: command.idempotencyKey,
    expectedVersion: command.expectedVersion,
    text,
  };

  return repository.sendHumanMessage(conversationId.trim(), normalizedCommand);
}
