import 'server-only';

import {
  WhatsAppConversationRepositoryError,
  type GetWhatsAppConversationsFilters,
  type SendHumanWhatsAppMessageCommand,
  type SendHumanWhatsAppMessageResult,
  type WhatsAppConversationRepository,
} from '../../application';
import type { WhatsAppConversation, WhatsAppConversationDepartment } from '../../domain';
import { INITIAL_MOCK_WHATSAPP_CONVERSATIONS } from './mock-whatsapp-conversations';

let mockConversations: WhatsAppConversation[] = [
  ...structuredClone(INITIAL_MOCK_WHATSAPP_CONVERSATIONS),
];

function cloneConversation(conversation: WhatsAppConversation): WhatsAppConversation {
  return structuredClone(conversation);
}

function getConversationIndex(conversationId: string): number {
  const index = mockConversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) {
    throw new WhatsAppConversationRepositoryError('not-found', 'Conversa não encontrada.');
  }
  return index;
}

function updateConversation(
  conversationId: string,
  expectedVersion: number,
  changes: Partial<WhatsAppConversation>,
): WhatsAppConversation {
  const index = getConversationIndex(conversationId);
  const current = mockConversations[index];

  if (current.version !== expectedVersion) {
    throw new WhatsAppConversationRepositoryError(
      'conflict',
      'A conversa foi alterada por outro comando.',
      current.version,
    );
  }

  const updated: WhatsAppConversation = {
    ...current,
    ...changes,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };
  mockConversations = mockConversations.map((conversation, currentIndex) =>
    currentIndex === index ? updated : conversation,
  );

  return cloneConversation(updated);
}

export class MockWhatsAppConversationRepository implements WhatsAppConversationRepository {
  async getConversations(
    filters?: GetWhatsAppConversationsFilters,
  ): Promise<readonly WhatsAppConversation[]> {
    const search = filters?.search?.trim().toLocaleLowerCase('pt-BR');

    return mockConversations
      .filter(
        (conversation) =>
          (!filters?.department || conversation.department === filters.department) &&
          (!filters?.state || conversation.conversationState === filters.state) &&
          (!filters?.requestStatus ||
            (conversation.department === 'commercial' &&
              conversation.requestStatus === filters.requestStatus)) &&
          (!search ||
            `${conversation.contact.name} ${conversation.contact.phone}`
              .toLocaleLowerCase('pt-BR')
              .includes(search)),
      )
      .map(cloneConversation);
  }

  getDashboardConversations(
    filters?: GetWhatsAppConversationsFilters,
  ): Promise<readonly WhatsAppConversation[]> {
    return this.getConversations(filters);
  }

  async getConversationById(conversationId: string): Promise<WhatsAppConversation | null> {
    const conversation = mockConversations.find((candidate) => candidate.id === conversationId);
    return conversation ? cloneConversation(conversation) : null;
  }

  async takeOverConversation(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return updateConversation(conversationId, expectedVersion, {
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo: { id: 'mock-user', name: 'Usuário de teste' },
    });
  }

  async returnConversationToBot(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    const current = mockConversations[getConversationIndex(conversationId)];
    return updateConversation(conversationId, expectedVersion, {
      conversationState: 'bot-active',
      flowStep: current.requestStatus === 'not-started' ? 'main-menu' : 'commercial-follow-up-menu',
      assignedTo: null,
    });
  }

  async forwardConversation(
    conversationId: string,
    targetDepartment: WhatsAppConversationDepartment,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return updateConversation(conversationId, expectedVersion, {
      department: targetDepartment,
      conversationState: 'sent-to-human',
      flowStep: 'human-service',
      assignedTo: null,
    });
  }

  async markConversationAsRead(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return updateConversation(conversationId, expectedVersion, { unreadCount: 0 });
  }

  async closeConversationAfterRejection(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    const current = mockConversations[getConversationIndex(conversationId)];
    if (current.requestStatus !== 'rejected') {
      throw new WhatsAppConversationRepositoryError(
        'validation',
        'O atendimento só pode ser encerrado depois que a proposta for recusada.',
      );
    }

    return updateConversation(conversationId, expectedVersion, {
      conversationState: 'closed',
      flowStep: 'closed',
      assignedTo: null,
      unreadCount: 0,
      closedAt: new Date().toISOString(),
    });
  }

  async closeConversation(
    conversationId: string,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<WhatsAppConversation> {
    const current = mockConversations[getConversationIndex(conversationId)];
    if (
      ['collecting-information', 'waiting-for-customer', 'under-review'].includes(
        current.requestStatus,
      )
    ) {
      throw new WhatsAppConversationRepositoryError(
        'conflict',
        'A conversa possui uma solicitação de orçamento em andamento.',
      );
    }
    if (current.requestStatus === 'rejected' && !reason?.trim()) {
      throw new WhatsAppConversationRepositoryError(
        'validation',
        'Informe o motivo do encerramento da proposta recusada.',
      );
    }

    return updateConversation(conversationId, expectedVersion, {
      conversationState: 'closed',
      flowStep: 'closed',
      assignedTo: null,
      unreadCount: 0,
      closedAt: new Date().toISOString(),
    });
  }

  async sendHumanMessage(
    conversationId: string,
    command: SendHumanWhatsAppMessageCommand,
  ): Promise<SendHumanWhatsAppMessageResult> {
    const index = getConversationIndex(conversationId);
    const current = mockConversations[index];

    if (current.version !== command.expectedVersion) {
      throw new WhatsAppConversationRepositoryError(
        'conflict',
        'A conversa foi alterada por outro comando.',
        current.version,
      );
    }

    const occurredAt = new Date().toISOString();
    const message = {
      id: command.commandId,
      direction: 'outbound' as const,
      deliveryStatus: 'pending' as const,
      kind: 'text' as const,
      text: command.text,
      attachment: null,
      occurredAt,
      attempts: [],
    };
    const conversation = updateConversation(conversationId, command.expectedVersion, {
      lastOutboundAt: occurredAt,
      lastMessageAt: occurredAt,
      lastMessagePreview: command.text,
      messages: [...current.messages, message],
    });

    return { conversation, message };
  }
}

export function resetMockWhatsAppConversations(): void {
  mockConversations = [...structuredClone(INITIAL_MOCK_WHATSAPP_CONVERSATIONS)];
}
