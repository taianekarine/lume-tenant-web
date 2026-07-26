import type {
  WhatsAppConversation,
  WhatsAppConversationDepartment,
  WhatsAppMessage,
  WhatsAppConversationState,
} from '../../domain';

export interface GetWhatsAppConversationsFilters {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly state?: WhatsAppConversationState;
}

export type WhatsAppConversationRepositoryErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'invalid-response'
  | 'service-unavailable';

export class WhatsAppConversationRepositoryError extends Error {
  constructor(
    readonly code: WhatsAppConversationRepositoryErrorCode,
    message: string,
    readonly currentVersion: number | null = null,
  ) {
    super(message);
    this.name = 'WhatsAppConversationRepositoryError';
  }
}

export interface SendHumanWhatsAppMessageCommand {
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedVersion: number;
  readonly text: string;
}

export interface SendHumanWhatsAppMessageResult {
  readonly conversation: WhatsAppConversation;
  readonly message: WhatsAppMessage;
}

export interface WhatsAppConversationRepository {
  getConversations(
    filters?: GetWhatsAppConversationsFilters,
  ): Promise<readonly WhatsAppConversation[]>;
  getConversationById(conversationId: string): Promise<WhatsAppConversation | null>;
  takeOverConversation(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation>;
  returnConversationToBot(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation>;
  forwardConversation(
    conversationId: string,
    targetDepartment: WhatsAppConversationDepartment,
    expectedVersion: number,
  ): Promise<WhatsAppConversation>;
  markConversationAsRead(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation>;
  sendHumanMessage(
    conversationId: string,
    command: SendHumanWhatsAppMessageCommand,
  ): Promise<SendHumanWhatsAppMessageResult>;
}
