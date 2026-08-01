import 'server-only';

import { WhatsAppConversationRepositoryError } from '../application';
import { createWhatsAppMediaContentGateway } from '../infrastructure';
import { executeAuthenticatedWhatsAppTokenRequest } from './execute-authenticated-whatsapp-request';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new WhatsAppConversationRepositoryError(
      'validation',
      `${label} é inválido.`,
    );
  }
  return value;
}

export function downloadWhatsAppMessageMediaForDashboard(
  conversationId: unknown,
  messageId: unknown,
) {
  const normalizedConversationId = requiredUuid(
    conversationId,
    'O identificador da conversa',
  );
  const normalizedMessageId = requiredUuid(
    messageId,
    'O identificador da mensagem',
  );

  return executeAuthenticatedWhatsAppTokenRequest((accessToken) =>
    createWhatsAppMediaContentGateway(accessToken).download(
      normalizedConversationId,
      normalizedMessageId,
    ),
  );
}
