import 'server-only';

import type {
  CreateQuoteProposalCommand,
  DecideQuoteProposalCommand,
  QuoteProposalDocumentHistory,
  SendQuoteProposalDocumentCommand,
  UpdateQuoteProposalStatusCommand,
  UploadQuoteProposalDocumentCommand,
} from '../application';
import {
  executeAuthenticatedQuoteProposalMutation,
  executeAuthenticatedQuoteProposalRequest,
} from './execute-authenticated-quote-proposal-request';

export function getPendingQuoteProposalsForDashboard(page = 1, pageSize = 100) {
  return executeAuthenticatedQuoteProposalRequest((repository) =>
    repository.getPending(page, pageSize),
  );
}

export function getPendingQuoteProposalCountForDashboard() {
  return executeAuthenticatedQuoteProposalRequest((repository) => repository.countPending());
}

export function getSentQuoteProposalsForDashboard(page = 1, pageSize = 100) {
  return executeAuthenticatedQuoteProposalRequest((repository) =>
    repository.getSent(page, pageSize),
  );
}

export function getApprovedQuoteProposalsForDashboard(page = 1, pageSize = 100) {
  return executeAuthenticatedQuoteProposalRequest((repository) =>
    repository.getApproved(page, pageSize),
  );
}

export function getCancelledQuoteProposalsForDashboard(page = 1, pageSize = 100) {
  return executeAuthenticatedQuoteProposalRequest((repository) =>
    repository.getCancelled(page, pageSize),
  );
}

export function getQuoteProposalsForConversationForDashboard(conversationId: string) {
  return executeAuthenticatedQuoteProposalRequest((repository) =>
    repository.getByConversation(conversationId),
  );
}

export function getQuoteProposalDocumentHistoryForDashboard(
  quoteRequestId: string,
): Promise<QuoteProposalDocumentHistory> {
  return executeAuthenticatedQuoteProposalRequest((repository) =>
    repository.getDocumentHistory(quoteRequestId),
  );
}

export function createQuoteProposalForDashboard(command: CreateQuoteProposalCommand) {
  return executeAuthenticatedQuoteProposalMutation((repository) => repository.create(command));
}

export function decideQuoteProposalForDashboard(
  quoteRequestId: string,
  command: DecideQuoteProposalCommand,
) {
  return executeAuthenticatedQuoteProposalMutation((repository) =>
    repository.decide(quoteRequestId, command),
  );
}

export function updateQuoteProposalStatusForDashboard(
  quoteRequestId: string,
  command: UpdateQuoteProposalStatusCommand,
) {
  return executeAuthenticatedQuoteProposalMutation((repository) =>
    repository.updateStatus(quoteRequestId, command),
  );
}

export function downloadQuoteProposalDocumentForDashboard(
  quoteRequestId: string,
  documentId: string,
) {
  return executeAuthenticatedQuoteProposalRequest((repository) =>
    repository.downloadDocument(quoteRequestId, documentId),
  );
}

export function uploadQuoteProposalDocumentForDashboard(
  quoteRequestId: string,
  command: UploadQuoteProposalDocumentCommand,
) {
  return executeAuthenticatedQuoteProposalMutation((repository) =>
    repository.uploadDocument(quoteRequestId, command),
  );
}

export function sendQuoteProposalDocumentForDashboard(
  quoteRequestId: string,
  command: SendQuoteProposalDocumentCommand,
) {
  return executeAuthenticatedQuoteProposalMutation((repository) =>
    repository.sendDocument(quoteRequestId, command),
  );
}
