export interface StartAiConversationGatewayInput {
  readonly agentId: string;
  readonly authenticatedUserId: string;
  readonly message: string;
}

export interface ContinueAiConversationGatewayInput {
  readonly conversationId: string;
  readonly authenticatedUserId: string;
  readonly message: string;
}

export interface AiAssistantReply {
  readonly id: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface AiConversationResponse {
  readonly conversationId: string;
  readonly reply: AiAssistantReply;
}

export interface AiConversationGateway {
  startConversation(input: StartAiConversationGatewayInput): Promise<AiConversationResponse>;
  continueConversation(input: ContinueAiConversationGatewayInput): Promise<AiConversationResponse>;
}
