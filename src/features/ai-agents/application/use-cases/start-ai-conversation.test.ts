import type { EmployeeUser } from '@/features/auth/domain';

import type { AiAgent } from '../../domain';
import type { AiConversationGateway, AiConversationResponse } from '../contracts';
import { MAX_AI_CONVERSATION_MESSAGE_LENGTH, startAiConversation } from './index';

const availableAgent: AiAgent = {
  id: 'operations-assistant',
  name: 'Assistente de Operações',
  category: 'Operações',
  description: 'Apoia a equipe de operações.',
  capabilities: ['Resumos'],
  status: 'available',
};

const preparingAgent: AiAgent = {
  ...availableAgent,
  status: 'preparing',
};

const response: AiConversationResponse = {
  conversationId: 'conversation-001',
  reply: {
    id: 'message-001',
    content: 'Resposta segura do agente.',
    createdAt: '2026-07-20T18:00:00.000Z',
  },
};

function createUser(permissions: EmployeeUser['permissions'] = ['ai-agents:use']): EmployeeUser {
  return {
    id: 'employee-001',
    name: 'Maria Silva',
    type: 'employee',
    departments: [],
    permissions,
    clientCategory: null,
    isActive: true,
  };
}

function createGateway(): jest.Mocked<AiConversationGateway> {
  return {
    startConversation: jest.fn().mockResolvedValue(response),
    continueConversation: jest.fn(),
  };
}

describe('startAiConversation', () => {
  it('rejects a user without permission before inspecting the agent', async () => {
    const gateway = createGateway();

    await expect(
      startAiConversation({ gateway, agents: [availableAgent] }, createUser([]), {
        agentId: availableAgent.id,
        message: 'Mensagem válida',
      }),
    ).resolves.toEqual({
      success: false,
      reason: 'forbidden',
      message: 'Você não tem permissão para usar agentes de IA.',
    });

    expect(gateway.startConversation).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', '   '],
    ['too long', 'a'.repeat(MAX_AI_CONVERSATION_MESSAGE_LENGTH + 1)],
  ])('rejects an %s message', async (_case, message) => {
    const gateway = createGateway();

    const result = await startAiConversation({ gateway, agents: [availableAgent] }, createUser(), {
      agentId: availableAgent.id,
      message,
    });

    expect(result).toEqual({
      success: false,
      reason: 'invalid-message',
      message: 'Escreva uma mensagem entre 1 e 4000 caracteres.',
    });
    expect(gateway.startConversation).not.toHaveBeenCalled();
  });

  it('rejects an unknown agent', async () => {
    const gateway = createGateway();

    const result = await startAiConversation({ gateway, agents: [availableAgent] }, createUser(), {
      agentId: 'unknown-agent',
      message: 'Mensagem válida',
    });

    expect(result).toEqual({
      success: false,
      reason: 'invalid-agent',
      message: 'O agente solicitado não está disponível.',
    });
    expect(gateway.startConversation).not.toHaveBeenCalled();
  });

  it('does not start conversations with an agent still in preparation', async () => {
    const gateway = createGateway();

    const result = await startAiConversation({ gateway, agents: [preparingAgent] }, createUser(), {
      agentId: preparingAgent.id,
      message: 'Mensagem válida',
    });

    expect(result).toEqual({
      success: false,
      reason: 'agent-unavailable',
      message: 'Este agente ainda não está disponível para conversas.',
    });
    expect(gateway.startConversation).not.toHaveBeenCalled();
  });

  it('starts an available agent with the server-trusted user identity', async () => {
    const gateway = createGateway();

    const result = await startAiConversation({ gateway, agents: [availableAgent] }, createUser(), {
      agentId: ` ${availableAgent.id} `,
      message: '  Resuma as ocorrências do dia.  ',
    });

    expect(result).toEqual({
      success: true,
      conversation: response,
    });
    expect(gateway.startConversation).toHaveBeenCalledWith({
      agentId: availableAgent.id,
      authenticatedUserId: 'employee-001',
      message: 'Resuma as ocorrências do dia.',
    });
  });

  it('returns a safe failure when the AI service is unavailable', async () => {
    const gateway = createGateway();
    gateway.startConversation.mockRejectedValue(new Error('Provider credentials rejected'));

    const result = await startAiConversation({ gateway, agents: [availableAgent] }, createUser(), {
      agentId: availableAgent.id,
      message: 'Mensagem válida',
    });

    expect(result).toEqual({
      success: false,
      reason: 'service-unavailable',
      message: 'Não foi possível obter uma resposta do agente. Tente novamente.',
    });
  });
});
