import type {
  PendingQuoteProposal,
  QuoteProposalStageSummary,
  QuoteProposalDocumentContent,
  QuoteProposalDocument,
  SubmittedQuoteProposal,
} from '../domain';

export type QuoteProposalRepositoryErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'invalid-response'
  | 'service-unavailable';

export class QuoteProposalRepositoryError extends Error {
  constructor(
    readonly code: QuoteProposalRepositoryErrorCode,
    message: string,
    readonly currentVersion: number | null = null,
  ) {
    super(message);
    this.name = 'QuoteProposalRepositoryError';
  }
}

export interface PendingQuoteProposalQueue {
  readonly items: readonly PendingQuoteProposal[];
  readonly total: number;
  readonly summary?: QuoteProposalStageSummary;
}

export interface QuoteProposalDocumentHistory {
  readonly quoteRequestId: string;
  readonly documents: readonly QuoteProposalDocument[];
}

export interface UploadQuoteProposalDocumentCommand {
  readonly commandId: string;
  readonly expectedVersion: number;
  readonly file: {
    readonly fileName: string;
    readonly mimeType: 'application/pdf';
    readonly bytes: Uint8Array;
  };
}

export interface SendQuoteProposalDocumentCommand {
  readonly commandId: string;
  readonly proposalDocumentId: string;
  readonly batchId: string;
  readonly batchDocumentIds: readonly string[];
  readonly expectedVersion: number;
}

export interface CreateQuoteProposalCommand {
  readonly commandId: string;
  readonly expectedVersion: number;
  readonly conversationId: string;
  readonly contactName: string;
  readonly document?: string | null;
  readonly email?: string | null;
  readonly serviceType: string;
  readonly origin: string;
  readonly destination: string;
  readonly departureDate: string;
  readonly departureAt: string | null;
  readonly returnDate?: string | null;
  readonly returnAt?: string | null;
  readonly passengerCount: number;
  readonly vehicleType?: string | null;
  readonly vehicleAtDisposal: boolean;
  readonly localTransfers: boolean;
  readonly notes?: string | null;
}

export interface DecideQuoteProposalCommand {
  readonly commandId: string;
  readonly expectedVersion: number;
  readonly decision: 'approved' | 'rejected';
  readonly reason?: string | null;
}

export interface UpdateQuoteProposalStatusCommand {
  readonly commandId: string;
  readonly expectedVersion: number;
  readonly status: 'waiting-for-customer' | 'under-review' | 'approved' | 'rejected' | 'cancelled';
  readonly reason?: string | null;
}

export interface QuoteProposalRepository {
  getPending(page?: number, pageSize?: number): Promise<PendingQuoteProposalQueue>;
  countPending(): Promise<number>;
  getSent(page?: number, pageSize?: number): Promise<PendingQuoteProposalQueue>;
  getApproved(page?: number, pageSize?: number): Promise<PendingQuoteProposalQueue>;
  getCancelled(page?: number, pageSize?: number): Promise<PendingQuoteProposalQueue>;
  getDocumentHistory(quoteRequestId: string): Promise<QuoteProposalDocumentHistory>;
  create(command: CreateQuoteProposalCommand): Promise<PendingQuoteProposal>;
  decide(
    quoteRequestId: string,
    command: DecideQuoteProposalCommand,
  ): Promise<PendingQuoteProposal>;
  updateStatus(
    quoteRequestId: string,
    command: UpdateQuoteProposalStatusCommand,
  ): Promise<PendingQuoteProposal>;
  uploadDocument(
    quoteRequestId: string,
    command: UploadQuoteProposalDocumentCommand,
  ): Promise<QuoteProposalDocument>;
  sendDocument(
    quoteRequestId: string,
    command: SendQuoteProposalDocumentCommand,
  ): Promise<SubmittedQuoteProposal>;
  downloadDocument(
    quoteRequestId: string,
    documentId: string,
  ): Promise<QuoteProposalDocumentContent>;
}
