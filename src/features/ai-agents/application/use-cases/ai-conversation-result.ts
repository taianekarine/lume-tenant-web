import type { AiConversationResponse } from '../contracts';

export const AI_CONVERSATION_FAILURE_REASONS = [
  'forbidden',
  'invalid-agent',
  'agent-unavailable',
  'invalid-conversation',
  'invalid-message',
  'service-unavailable',
] as const;

export type AiConversationFailureReason = (typeof AI_CONVERSATION_FAILURE_REASONS)[number];

export type AiConversationResult =
  | {
      readonly success: true;
      readonly conversation: AiConversationResponse;
    }
  | {
      readonly success: false;
      readonly reason: AiConversationFailureReason;
      readonly message: string;
    };
