import type { EmployeeUser } from '@/features/auth/domain';

import type { AiConversationGateway, AiConversationResponse } from '../contracts';
import { continueAiConversation } from './continue-ai-conversation';

const response: AiConversationResponse = {
  conversationId: 'conversation-001',
  reply: {
    id: 'message-002',
    content: 'Continuação segura da conversa.',
    createdAt: '2026-07-20T18:05:00.000Z',
  },
};

function createUser(permissions: EmployeeUser['permissions'] = ['ai-agents:use']): EmployeeUser {
  return {
    id: 'employee-001',
    name: 'Maria Silva',
    type: 'employee',
    departments: [],
    roles: ['manager'],
    permissions,
    clientCategory: null,
    isActive: true,
  };
}

function createGateway(): jest.Mocked<AiConversationGateway> {
  return {
    startConversation: jest.fn(),
    continueConversation: jest.fn().mockResolvedValue(response),
  };
}

describe('continueAiConversation', () => {
  it('rejects a user without permission', async () => {
    const gateway = createGateway();

    const result = await continueAiConversation(gateway, createUser([]), {
      conversationId: 'conversation-001',
      message: 'Mensagem válida',
    });

    expect(result).toEqual({
      success: false,
      reason: 'forbidden',
      message: 'Você não tem permissão para usar agentes de IA.',
    });
    expect(gateway.continueConversation).not.toHaveBeenCalled();
  });

  it('rejects an invalid conversation identifier', async () => {
    const gateway = createGateway();

    const result = await continueAiConversation(gateway, createUser(), {
      conversationId: ' ',
      message: 'Mensagem válida',
    });

    expect(result).toEqual({
      success: false,
      reason: 'invalid-conversation',
      message: 'A conversa informada é inválida.',
    });
    expect(gateway.continueConversation).not.toHaveBeenCalled();
  });

  it('rejects an invalid message', async () => {
    const gateway = createGateway();

    const result = await continueAiConversation(gateway, createUser(), {
      conversationId: 'conversation-001',
      message: null,
    });

    expect(result).toEqual({
      success: false,
      reason: 'invalid-message',
      message: 'Escreva uma mensagem entre 1 e 4000 caracteres.',
    });
    expect(gateway.continueConversation).not.toHaveBeenCalled();
  });

  it('continues a conversation with the server-trusted user identity', async () => {
    const gateway = createGateway();

    const result = await continueAiConversation(gateway, createUser(), {
      conversationId: ' conversation-001 ',
      message: '  Destaque os pontos críticos.  ',
    });

    expect(result).toEqual({
      success: true,
      conversation: response,
    });
    expect(gateway.continueConversation).toHaveBeenCalledWith({
      conversationId: 'conversation-001',
      authenticatedUserId: 'employee-001',
      message: 'Destaque os pontos críticos.',
    });
  });

  it('returns a safe failure when the AI service is unavailable', async () => {
    const gateway = createGateway();
    gateway.continueConversation.mockRejectedValue(new Error('Provider timeout'));

    const result = await continueAiConversation(gateway, createUser(), {
      conversationId: 'conversation-001',
      message: 'Mensagem válida',
    });

    expect(result).toEqual({
      success: false,
      reason: 'service-unavailable',
      message: 'Não foi possível obter uma resposta do agente. Tente novamente.',
    });
  });
});
