import type { AiConversationGateway } from './ai-conversation-gateway';

const response = {
  conversationId: 'conversation-001',
  reply: {
    id: 'message-001',
    content: 'Resposta segura do agente.',
    createdAt: '2026-07-20T18:00:00.000Z',
  },
};

describe('AiConversationGateway contract', () => {
  it('supports starting a conversation for an authenticated user', async () => {
    const gateway: AiConversationGateway = {
      startConversation: jest.fn().mockResolvedValue(response),
      continueConversation: jest.fn(),
    };

    await expect(
      gateway.startConversation({
        agentId: 'operations-assistant',
        authenticatedUserId: 'employee-001',
        message: 'Resuma as ocorrências do dia.',
      }),
    ).resolves.toEqual(response);
  });

  it('supports continuing an existing conversation', async () => {
    const gateway: AiConversationGateway = {
      startConversation: jest.fn(),
      continueConversation: jest.fn().mockResolvedValue(response),
    };

    await expect(
      gateway.continueConversation({
        conversationId: 'conversation-001',
        authenticatedUserId: 'employee-001',
        message: 'Agora destaque os pontos críticos.',
      }),
    ).resolves.toEqual(response);
  });
});
