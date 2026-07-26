import { hasPermission, type User } from '@/features/auth/domain';

import type { AiConversationGateway } from '../contracts';
import type { AiConversationResult } from './ai-conversation-result';
import {
  normalizeConversationIdentifier,
  normalizeConversationMessage,
} from './conversation-input';

export interface ContinueAiConversationInput {
  readonly conversationId: unknown;
  readonly message: unknown;
}

export async function continueAiConversation(
  gateway: AiConversationGateway,
  user: User,
  input: ContinueAiConversationInput,
): Promise<AiConversationResult> {
  if (!hasPermission(user, 'ai-agents:use')) {
    return {
      success: false,
      reason: 'forbidden',
      message: 'Você não tem permissão para usar agentes de IA.',
    };
  }

  const conversationId = normalizeConversationIdentifier(input.conversationId);

  if (conversationId === null) {
    return {
      success: false,
      reason: 'invalid-conversation',
      message: 'A conversa informada é inválida.',
    };
  }

  const message = normalizeConversationMessage(input.message);

  if (message === null) {
    return {
      success: false,
      reason: 'invalid-message',
      message: 'Escreva uma mensagem entre 1 e 4000 caracteres.',
    };
  }

  try {
    const conversation = await gateway.continueConversation({
      conversationId,
      authenticatedUserId: user.id,
      message,
    });

    return {
      success: true,
      conversation,
    };
  } catch {
    return {
      success: false,
      reason: 'service-unavailable',
      message: 'Não foi possível obter uma resposta do agente. Tente novamente.',
    };
  }
}
