export const QUOTE_PROPOSAL_PDF_MIME_TYPE = 'application/pdf';
export const QUOTE_PROPOSAL_PDF_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface QuoteProposalContact {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
}

export interface QuoteProposalSummary {
  readonly sequence: number;
  readonly contactName: string | null;
  readonly document: string | null;
  readonly email: string | null;
  readonly serviceType: string | null;
  readonly origin: string | null;
  readonly destination: string | null;
  readonly departureDate: string | null;
  readonly departureAt: string | null;
  readonly returnDate: string | null;
  readonly returnAt: string | null;
  readonly passengerCount: number | null;
  readonly vehicleType: string | null;
  readonly vehicleAtDisposal: boolean | null;
  readonly localTransfers: boolean | null;
  readonly notes: string | null;
  readonly structuredData: Readonly<Record<string, unknown>>;
}

export interface QuoteProposalActor {
  readonly id: string | null;
  readonly name: string;
  readonly type?: 'customer' | 'attendant';
}

export interface QuoteProposalDecision {
  readonly status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  readonly reason: string | null;
  readonly decidedAt: string | null;
  readonly decidedBy: QuoteProposalActor | null;
}

export interface PendingQuoteProposal {
  readonly stage: QuoteProposalCategory;
  readonly conversationState:
    'bot-active' | 'waiting-for-customer' | 'sent-to-human' | 'human-active' | 'closed';
  readonly requestStatus:
    | 'not-started'
    | 'collecting-information'
    | 'waiting-for-customer'
    | 'under-review'
    | 'approved'
    | 'rejected'
    | 'cancelled';
  readonly quoteRequestId: string;
  readonly quoteRequestVersion: number;
  readonly conversationId: string;
  readonly conversationVersion: number;
  readonly contact: QuoteProposalContact;
  readonly summary: QuoteProposalSummary;
  readonly proposalDocument: QuoteProposalDocument | null;
  readonly requestedAt: string;
  readonly requestedBy: QuoteProposalActor;
  readonly decision: QuoteProposalDecision;
  readonly updatedAt: string;
}

export const QUOTE_PROPOSAL_CATEGORIES = ['pending', 'sent', 'approved', 'cancelled'] as const;

export type QuoteProposalCategory = (typeof QUOTE_PROPOSAL_CATEGORIES)[number];

const QUOTE_SERVICE_TYPE_LABELS: Readonly<Record<string, string>> = {
  eventual: 'Fretamento eventual',
  charter: 'Fretamento eventual',
  'eventual-charter': 'Fretamento eventual',
  continuous: 'Viagem contínua',
  'continuous-charter': 'Viagem contínua',
  transfer: 'Traslado',
  'local-transfer': 'Traslado',
};

export function formatQuoteProposalServiceType(value: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  const contractKey = normalized.toLocaleLowerCase('pt-BR').replaceAll('_', '-');
  const knownLabel = QUOTE_SERVICE_TYPE_LABELS[contractKey];
  if (knownLabel) return knownLabel;

  if (!/[-_]/.test(normalized)) return normalized;

  const readable = normalized.replaceAll(/[-_]+/g, ' ').toLocaleLowerCase('pt-BR');
  return readable.charAt(0).toLocaleUpperCase('pt-BR') + readable.slice(1);
}

export function getQuoteProposalCategory(proposal: PendingQuoteProposal): QuoteProposalCategory {
  if (proposal.stage !== 'sent') return proposal.stage;
  if (proposal.requestStatus === 'approved' || proposal.decision.status === 'approved') {
    return 'approved';
  }
  if (
    ['rejected', 'cancelled'].includes(proposal.requestStatus) ||
    proposal.decision.status === 'rejected'
  ) {
    return 'cancelled';
  }
  return 'sent';
}

export function filterQuoteProposalsByCategory(
  proposals: readonly PendingQuoteProposal[],
  category: QuoteProposalCategory,
): PendingQuoteProposal[] {
  return proposals.filter((proposal) => getQuoteProposalCategory(proposal) === category);
}

export interface QuoteProposalDashboardMetrics {
  readonly pending: number;
  readonly sent: number;
  readonly approved: number;
  readonly cancelled: number;
  readonly delivered: number;
  readonly cancellationReasons: readonly {
    readonly reason: string;
    readonly count: number;
  }[];
}

export interface QuoteProposalStageSummary {
  readonly pending: number;
  readonly sent: number;
  readonly approved: number;
  readonly cancelled: number;
  readonly cancellationReasons: readonly {
    readonly reason: string;
    readonly count: number;
  }[];
}

export function getQuoteProposalDashboardMetrics(
  pendingProposals: readonly PendingQuoteProposal[],
  sentProposals: readonly PendingQuoteProposal[],
  approvedProposals: readonly PendingQuoteProposal[] = [],
  cancelledProposals: readonly PendingQuoteProposal[] = [],
  summary?: QuoteProposalStageSummary,
): QuoteProposalDashboardMetrics {
  const sent = filterQuoteProposalsByCategory(sentProposals, 'sent');
  const approved =
    approvedProposals.length > 0
      ? filterQuoteProposalsByCategory(approvedProposals, 'approved')
      : filterQuoteProposalsByCategory(sentProposals, 'approved');
  const cancelled =
    cancelledProposals.length > 0
      ? filterQuoteProposalsByCategory(cancelledProposals, 'cancelled')
      : filterQuoteProposalsByCategory(sentProposals, 'cancelled');
  const reasonTotals = new Map<string, number>();

  for (const proposal of cancelled) {
    const reason = proposal.decision.reason?.trim() || 'Motivo não informado';
    reasonTotals.set(reason, (reasonTotals.get(reason) ?? 0) + 1);
  }

  return {
    pending: summary?.pending ?? pendingProposals.length,
    sent: summary?.sent ?? sent.length,
    approved: summary?.approved ?? approved.length,
    cancelled: summary?.cancelled ?? cancelled.length,
    delivered:
      summary !== undefined
        ? summary.sent + summary.approved + summary.cancelled
        : sent.length + approved.length + cancelled.length,
    cancellationReasons: (
      summary?.cancellationReasons ??
      [...reasonTotals.entries()].map(([reason, count]) => ({ reason, count }))
    ).toSorted(
      (left, right) => right.count - left.count || left.reason.localeCompare(right.reason),
    ),
  };
}

export interface QuoteProposalPdfMetadata {
  readonly fileName: string;
  readonly mimeType: typeof QUOTE_PROPOSAL_PDF_MIME_TYPE;
  readonly sizeBytes: number;
}

export interface QuoteProposalDocument extends QuoteProposalPdfMetadata {
  readonly id: string;
  readonly status: 'uploaded' | 'queued' | 'sent' | 'failed';
  readonly sha256: string;
  readonly providerMessageId?: string | null;
  readonly queuedAt?: string | null;
  readonly sentAt?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly uploadedBy?: QuoteProposalActor | null;
  readonly sentBy?: QuoteProposalActor | null;
}

export interface QuoteProposalDocumentContent {
  readonly fileName: string;
  readonly mimeType: typeof QUOTE_PROPOSAL_PDF_MIME_TYPE;
  readonly bytes: Uint8Array;
}

export interface SubmittedQuoteProposal {
  readonly proposalDocument: QuoteProposalDocument;
  readonly conversationId: string;
  readonly conversationVersion: number;
  readonly conversationState: string;
  readonly messageId: string;
  readonly deliveryStatus: string;
  readonly idempotent: boolean;
}

export type QuoteProposalPdfValidationResult =
  | {
      readonly valid: true;
      readonly metadata: QuoteProposalPdfMetadata;
    }
  | {
      readonly valid: false;
      readonly message: string;
    };

interface PdfFileCandidate {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  slice(start?: number, end?: number): Blob;
}

function isPdfFileName(fileName: string): boolean {
  return fileName.trim().toLocaleLowerCase('pt-BR').endsWith('.pdf');
}

export async function validateQuoteProposalPdf(
  file: PdfFileCandidate,
): Promise<QuoteProposalPdfValidationResult> {
  if (!isPdfFileName(file.name) || file.type !== QUOTE_PROPOSAL_PDF_MIME_TYPE) {
    return {
      valid: false,
      message: 'Selecione um arquivo PDF com a extensão .pdf.',
    };
  }

  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return {
      valid: false,
      message: 'O PDF selecionado está vazio.',
    };
  }

  if (file.size > QUOTE_PROPOSAL_PDF_MAX_SIZE_BYTES) {
    return {
      valid: false,
      message: 'O PDF deve ter no máximo 10 MB.',
    };
  }

  try {
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const signature = String.fromCharCode(...header);

    if (signature !== '%PDF-') {
      return {
        valid: false,
        message: 'O conteúdo do arquivo não corresponde a um PDF válido.',
      };
    }
  } catch {
    return {
      valid: false,
      message: 'Não foi possível validar o conteúdo do PDF.',
    };
  }

  return {
    valid: true,
    metadata: {
      fileName: file.name,
      mimeType: QUOTE_PROPOSAL_PDF_MIME_TYPE,
      sizeBytes: file.size,
    },
  };
}

export function formatQuoteProposalPdfSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(sizeBytes / 1024)} KB`;
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
    sizeBytes / (1024 * 1024),
  )} MB`;
}
