import { hasPermission, type User } from '@/features/auth/domain';

import type { AiAgent } from '../../domain';
import type { AiConversationGateway } from '../contracts';
import type { AiConversationResult } from './ai-conversation-result';
import {
  normalizeConversationIdentifier,
  normalizeConversationMessage,
} from './conversation-input';

export interface StartAiConversationDependencies {
  readonly gateway: AiConversationGateway;
  readonly agents: readonly AiAgent[];
}

export interface StartAiConversationInput {
  readonly agentId: unknown;
  readonly message: unknown;
}

export async function startAiConversation(
  { gateway, agents }: StartAiConversationDependencies,
  user: User,
  input: StartAiConversationInput,
): Promise<AiConversationResult> {
  if (!hasPermission(user, 'ai-agents:use')) {
    return {
      success: false,
      reason: 'forbidden',
      message: 'Você não tem permissão para usar agentes de IA.',
    };
  }

  const agentId = normalizeConversationIdentifier(input.agentId);

  if (agentId === null) {
    return {
      success: false,
      reason: 'invalid-agent',
      message: 'O agente solicitado não está disponível.',
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

  const agent = agents.find((candidate) => candidate.id === agentId);

  if (agent === undefined) {
    return {
      success: false,
      reason: 'invalid-agent',
      message: 'O agente solicitado não está disponível.',
    };
  }

  if (agent.status !== 'available') {
    return {
      success: false,
      reason: 'agent-unavailable',
      message: 'Este agente ainda não está disponível para conversas.',
    };
  }

  try {
    const conversation = await gateway.startConversation({
      agentId: agent.id,
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
