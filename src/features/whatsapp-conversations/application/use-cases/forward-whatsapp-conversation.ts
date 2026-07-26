import {
  isWhatsAppConversationDepartment,
  type WhatsAppConversationDepartment,
} from '../../domain';
import type { WhatsAppConversationRepository } from '../contracts';

export function forwardWhatsAppConversation(
  repository: WhatsAppConversationRepository,
  conversationId: unknown,
  targetDepartment: unknown,
  expectedVersion: unknown,
) {
  if (
    typeof conversationId !== 'string' ||
    conversationId.trim().length === 0 ||
    !isWhatsAppConversationDepartment(targetDepartment) ||
    typeof expectedVersion !== 'number' ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1
  ) {
    return Promise.resolve(null);
  }

  return repository.forwardConversation(
    conversationId.trim(),
    targetDepartment as WhatsAppConversationDepartment,
    expectedVersion,
  );
}
