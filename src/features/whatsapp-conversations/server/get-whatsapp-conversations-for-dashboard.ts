import 'server-only';

import {
  forwardWhatsAppConversation,
  getWhatsAppConversationById,
  getWhatsAppConversations,
  markWhatsAppConversationAsRead,
  returnWhatsAppConversationToBot,
  sendHumanWhatsAppMessage,
  takeOverWhatsAppConversation,
  type GetWhatsAppConversationsFilters,
} from '../application';
import {
  executeAuthenticatedWhatsAppMutation,
  executeAuthenticatedWhatsAppRequest,
} from './execute-authenticated-whatsapp-request';

export function getWhatsAppConversationsForDashboard(filters?: GetWhatsAppConversationsFilters) {
  return executeAuthenticatedWhatsAppRequest((repository) =>
    getWhatsAppConversations(repository, filters),
  );
}

export function pollWhatsAppConversationsForDashboard(filters?: GetWhatsAppConversationsFilters) {
  return executeAuthenticatedWhatsAppMutation((repository) =>
    getWhatsAppConversations(repository, filters),
  );
}

export function getWhatsAppConversationForDashboard(conversationId: unknown) {
  return executeAuthenticatedWhatsAppRequest((repository) =>
    getWhatsAppConversationById(repository, conversationId),
  );
}

export function pollWhatsAppConversationForDashboard(conversationId: unknown) {
  return executeAuthenticatedWhatsAppMutation((repository) =>
    getWhatsAppConversationById(repository, conversationId),
  );
}

export function takeOverWhatsAppConversationForDashboard(
  conversationId: unknown,
  expectedVersion: unknown,
) {
  return executeAuthenticatedWhatsAppMutation((repository) =>
    takeOverWhatsAppConversation(repository, conversationId, expectedVersion),
  );
}

export function returnWhatsAppConversationToBotForDashboard(
  conversationId: unknown,
  expectedVersion: unknown,
) {
  return executeAuthenticatedWhatsAppMutation((repository) =>
    returnWhatsAppConversationToBot(repository, conversationId, expectedVersion),
  );
}

export function forwardWhatsAppConversationForDashboard(
  conversationId: unknown,
  targetDepartment: unknown,
  expectedVersion: unknown,
) {
  return executeAuthenticatedWhatsAppMutation((repository) =>
    forwardWhatsAppConversation(repository, conversationId, targetDepartment, expectedVersion),
  );
}

export function markWhatsAppConversationAsReadForDashboard(
  conversationId: unknown,
  expectedVersion: unknown,
) {
  return executeAuthenticatedWhatsAppMutation((repository) =>
    markWhatsAppConversationAsRead(repository, conversationId, expectedVersion),
  );
}

export function sendHumanWhatsAppMessageForDashboard(
  conversationId: unknown,
  command: {
    readonly commandId: unknown;
    readonly idempotencyKey: unknown;
    readonly expectedVersion: unknown;
    readonly text: unknown;
  },
) {
  return executeAuthenticatedWhatsAppMutation((repository) =>
    sendHumanWhatsAppMessage(repository, conversationId, command),
  );
}
