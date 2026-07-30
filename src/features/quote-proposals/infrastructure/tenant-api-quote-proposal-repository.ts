import 'server-only';

import { z } from 'zod';

import {
  QuoteProposalRepositoryError,
  type CreateQuoteProposalCommand,
  type DecideQuoteProposalCommand,
  type PendingQuoteProposalQueue,
  type QuoteProposalDocumentHistory,
  type QuoteProposalRepository,
  type QuoteProposalRepositoryErrorCode,
  type SendQuoteProposalDocumentCommand,
  type UpdateQuoteProposalStatusCommand,
  type UploadQuoteProposalDocumentCommand,
} from '../application';
import type {
  PendingQuoteProposal,
  QuoteProposalCategory,
  QuoteProposalDocument,
  QuoteProposalDocumentContent,
  SubmittedQuoteProposal,
} from '../domain';

type Fetcher = typeof fetch;

const isoDateSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const nullableIsoDateSchema = isoDateSchema.nullable();
const nullableCivilDateSchema = z.iso.date().nullable();
const jsonObjectSchema = z.record(z.string(), z.unknown());
const actorSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().min(1),
  type: z.enum(['customer', 'attendant']).optional(),
});

const proposalDocumentSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['uploaded', 'queued', 'sent', 'failed']),
  fileName: z.string().min(1),
  mimeType: z.literal('application/pdf'),
  sizeBytes: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  providerMessageId: z.string().nullable(),
  queuedAt: nullableIsoDateSchema,
  sentAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  uploadedBy: actorSchema.nullable().optional(),
  sentBy: actorSchema.nullable().optional(),
});

const quoteRequestSchema = z.object({
  id: z.string().uuid(),
  sequence: z.number().int().positive(),
  status: z.enum([
    'not-started',
    'collecting-information',
    'waiting-for-customer',
    'under-review',
    'approved',
    'rejected',
    'cancelled',
  ]),
  contactName: z.string().nullable(),
  document: z.string().nullable(),
  email: z.string().nullable(),
  serviceType: z.string().nullable(),
  origin: z.string().nullable(),
  destination: z.string().nullable(),
  departureDate: nullableCivilDateSchema,
  departureAt: nullableIsoDateSchema,
  returnDate: nullableCivilDateSchema,
  returnAt: nullableIsoDateSchema,
  passengerCount: z.number().int().positive().nullable(),
  vehicleType: z.string().nullable(),
  vehicleAtDisposal: z.boolean().nullable(),
  localTransfers: z.boolean().nullable(),
  notes: z.string().nullable(),
  structuredData: jsonObjectSchema,
  confirmedAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  version: z.number().int().positive(),
  updatedAt: isoDateSchema,
  requestedBy: actorSchema.optional(),
  decision: z
    .object({
      status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
      reason: z.string().nullable(),
      decidedAt: nullableIsoDateSchema,
      decidedBy: actorSchema.nullable(),
    })
    .optional(),
});

const conversationSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  conversationState: z.enum([
    'bot-active',
    'waiting-for-customer',
    'sent-to-human',
    'human-active',
    'closed',
  ]),
  department: z.string().min(1),
  flowStep: z.string().min(1),
  requestStatus: z.enum([
    'not-started',
    'collecting-information',
    'waiting-for-customer',
    'under-review',
    'approved',
    'rejected',
    'cancelled',
  ]),
  contact: z.object({
    id: z.string().uuid(),
    phone: z.string().min(1),
    displayName: z.string().nullable(),
  }),
});

const queueItemSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(['pending', 'sent', 'approved', 'cancelled']),
  quoteRequest: quoteRequestSchema,
  conversation: conversationSchema,
  proposalDocument: proposalDocumentSchema.nullable(),
});

const queueSchema = z.object({
  items: z.array(queueItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  summary: z
    .object({
      pending: z.number().int().nonnegative(),
      sent: z.number().int().nonnegative(),
      approved: z.number().int().nonnegative(),
      cancelled: z.number().int().nonnegative(),
      cancellationReasons: z.array(
        z.object({
          reason: z.string().min(1),
          count: z.number().int().positive(),
        }),
      ),
    })
    .optional(),
  filters: z
    .object({
      search: z.string().nullable().optional(),
      createdFrom: z.string().nullable().optional(),
      createdTo: z.string().nullable().optional(),
    })
    .passthrough()
    .optional(),
});

const quoteProposalDetailSchema = z.object({
  id: z.string().uuid(),
  quoteRequest: quoteRequestSchema,
  conversation: conversationSchema,
  proposalDocument: proposalDocumentSchema.nullable(),
  documents: z.array(proposalDocumentSchema),
});

const uploadResultSchema = z.object({
  proposalDocument: proposalDocumentSchema,
  conversation: z.object({
    id: z.string().uuid(),
    version: z.number().int().positive(),
  }),
  idempotent: z.boolean(),
});

const sendResultSchema = z.object({
  message: z.object({
    id: z.string().uuid(),
    deliveryStatus: z.string().min(1),
  }),
  conversation: conversationSchema,
  proposalDocument: proposalDocumentSchema,
  idempotent: z.boolean(),
});

const apiErrorSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
  details: z
    .object({
      currentVersion: z.number().int().positive().optional(),
    })
    .passthrough()
    .optional(),
});

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function responseStatusToErrorCode(status: number): QuoteProposalRepositoryErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 413 || status === 415 || status === 422) return 'validation';
  return 'service-unavailable';
}

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new QuoteProposalRepositoryError(
      'invalid-response',
      'A Tenant API retornou dados de propostas incompatíveis com o contrato.',
    );
  }

  return parsed.data;
}

function parseErrorResponse(value: unknown): {
  readonly message: string | null;
  readonly currentVersion: number | null;
} {
  const parsed = apiErrorSchema.safeParse(value);
  if (!parsed.success) return { message: null, currentVersion: null };

  const rawMessage = parsed.data.message;
  const message = Array.isArray(rawMessage) ? rawMessage.join(' ') : rawMessage;
  return {
    message: message?.trim() || null,
    currentVersion: parsed.data.details?.currentVersion ?? null,
  };
}

function mapProposalDocument(
  document: z.infer<typeof proposalDocumentSchema>,
): QuoteProposalDocument {
  return document;
}

function mapQueueItem(item: z.infer<typeof queueItemSchema>): PendingQuoteProposal {
  const quote = item.quoteRequest;
  const conversation = item.conversation;

  return {
    stage: item.stage,
    conversationState: conversation.conversationState,
    requestStatus: quote.status,
    quoteRequestId: quote.id,
    quoteRequestVersion: quote.version,
    conversationId: conversation.id,
    conversationVersion: conversation.version,
    contact: {
      id: conversation.contact.id,
      name: conversation.contact.displayName?.trim() || conversation.contact.phone,
      phone: conversation.contact.phone,
    },
    summary: {
      sequence: quote.sequence,
      contactName: quote.contactName,
      document: quote.document,
      email: quote.email,
      serviceType: quote.serviceType,
      origin: quote.origin,
      destination: quote.destination,
      departureDate: quote.departureDate,
      departureAt: quote.departureAt,
      returnDate: quote.returnDate,
      returnAt: quote.returnAt,
      passengerCount: quote.passengerCount,
      vehicleType: quote.vehicleType,
      vehicleAtDisposal: quote.vehicleAtDisposal,
      localTransfers: quote.localTransfers,
      notes: quote.notes,
      structuredData: quote.structuredData,
    },
    proposalDocument: item.proposalDocument ? mapProposalDocument(item.proposalDocument) : null,
    requestedAt: quote.confirmedAt ?? quote.createdAt,
    requestedBy: quote.requestedBy ?? {
      id: null,
      name: quote.contactName?.trim() || conversation.contact.displayName?.trim() || 'Cliente',
      type: 'customer',
    },
    decision: quote.decision ?? {
      status:
        quote.status === 'approved'
          ? 'approved'
          : quote.status === 'rejected'
            ? 'rejected'
            : 'pending',
      reason: null,
      decidedAt: null,
      decidedBy: null,
    },
    updatedAt: quote.updatedAt,
  };
}

export class LumeApiQuoteProposalRepository implements QuoteProposalRepository {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 5_000,
    private readonly uploadTimeoutMs = 30_000,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async getPending(page = 1, pageSize = 100): Promise<PendingQuoteProposalQueue> {
    return this.getByStage('pending', page, pageSize);
  }

  async countPending(): Promise<number> {
    const page = parseResponse(
      queueSchema,
      await this.request('/whatsapp/quote-proposals?stage=pending&page=1&pageSize=1'),
    );
    return page.total;
  }

  async getSent(page = 1, pageSize = 100): Promise<PendingQuoteProposalQueue> {
    return this.getByStage('sent', page, pageSize);
  }

  async getApproved(page = 1, pageSize = 100): Promise<PendingQuoteProposalQueue> {
    return this.getByStage('approved', page, pageSize);
  }

  async getCancelled(page = 1, pageSize = 100): Promise<PendingQuoteProposalQueue> {
    return this.getByStage('cancelled', page, pageSize);
  }

  async getDocumentHistory(quoteRequestId: string): Promise<QuoteProposalDocumentHistory> {
    const detail = parseResponse(
      quoteProposalDetailSchema,
      await this.request(`/whatsapp/quote-proposals/${encodeURIComponent(quoteRequestId)}`),
    );

    return {
      quoteRequestId: detail.quoteRequest.id,
      documents: detail.documents.map(mapProposalDocument),
    };
  }

  async create(command: CreateQuoteProposalCommand): Promise<PendingQuoteProposal> {
    const item = parseResponse(
      queueItemSchema,
      await this.request('/whatsapp/quote-proposals', {
        method: 'POST',
        body: command,
      }),
    );
    return mapQueueItem(item);
  }

  async decide(
    quoteRequestId: string,
    command: DecideQuoteProposalCommand,
  ): Promise<PendingQuoteProposal> {
    const item = parseResponse(
      queueItemSchema,
      await this.request(
        `/whatsapp/quote-proposals/${encodeURIComponent(quoteRequestId)}/decision`,
        {
          method: 'PATCH',
          body: command,
        },
      ),
    );
    return mapQueueItem(item);
  }

  async updateStatus(
    quoteRequestId: string,
    command: UpdateQuoteProposalStatusCommand,
  ): Promise<PendingQuoteProposal> {
    const item = parseResponse(
      queueItemSchema,
      await this.request(`/whatsapp/quote-proposals/${encodeURIComponent(quoteRequestId)}/status`, {
        method: 'PATCH',
        body: command,
      }),
    );
    return mapQueueItem(item);
  }

  private async getByStage(
    stage: QuoteProposalCategory,
    page: number,
    pageSize: number,
  ): Promise<PendingQuoteProposalQueue> {
    const first = parseResponse(
      queueSchema,
      await this.request(
        `/whatsapp/quote-proposals?stage=${stage}&page=${page}&pageSize=${pageSize}`,
      ),
    );

    if (first.totalPages <= page) {
      return {
        items: first.items.map(mapQueueItem),
        total: first.total,
        ...(first.summary ? { summary: first.summary } : {}),
      };
    }

    const remaining = await Promise.all(
      Array.from({ length: first.totalPages - page }, (_unused, index) => page + index + 1).map(
        async (currentPage) =>
          parseResponse(
            queueSchema,
            await this.request(
              `/whatsapp/quote-proposals?stage=${stage}&page=${currentPage}&pageSize=${pageSize}`,
            ),
          ),
      ),
    );

    return {
      items: [first, ...remaining].flatMap((result) => result.items.map(mapQueueItem)),
      total: first.total,
      ...(first.summary ? { summary: first.summary } : {}),
    };
  }

  async uploadDocument(
    quoteRequestId: string,
    command: UploadQuoteProposalDocumentCommand,
  ): Promise<QuoteProposalDocument> {
    const body = new FormData();
    const fileBuffer = new ArrayBuffer(command.file.bytes.byteLength);
    new Uint8Array(fileBuffer).set(command.file.bytes);
    body.set('commandId', command.commandId);
    body.set('expectedVersion', String(command.expectedVersion));
    body.set(
      'file',
      new Blob([fileBuffer], { type: command.file.mimeType }),
      command.file.fileName,
    );

    const result = parseResponse(
      uploadResultSchema,
      await this.request(
        `/whatsapp/quote-proposals/${encodeURIComponent(quoteRequestId)}/documents`,
        { method: 'POST', body },
      ),
    );

    return mapProposalDocument(result.proposalDocument);
  }

  async sendDocument(
    quoteRequestId: string,
    command: SendQuoteProposalDocumentCommand,
  ): Promise<SubmittedQuoteProposal> {
    const result = parseResponse(
      sendResultSchema,
      await this.request(`/whatsapp/quote-proposals/${encodeURIComponent(quoteRequestId)}/send`, {
        method: 'POST',
        body: {
          commandId: command.commandId,
          proposalDocumentId: command.proposalDocumentId,
          batchId: command.batchId,
          batchDocumentIds: command.batchDocumentIds,
          expectedVersion: command.expectedVersion,
        },
      }),
    );

    return {
      proposalDocument: mapProposalDocument(result.proposalDocument),
      conversationId: result.conversation.id,
      conversationVersion: result.conversation.version,
      conversationState: result.conversation.conversationState,
      messageId: result.message.id,
      deliveryStatus: result.message.deliveryStatus,
      idempotent: result.idempotent,
    };
  }

  async downloadDocument(
    quoteRequestId: string,
    documentId: string,
  ): Promise<QuoteProposalDocumentContent> {
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.baseUrl}/whatsapp/quote-proposals/${encodeURIComponent(
          quoteRequestId,
        )}/documents/${encodeURIComponent(documentId)}/content`,
        {
          cache: 'no-store',
          headers: {
            Accept: 'application/pdf',
            Authorization: `Bearer ${this.accessToken}`,
          },
          signal: AbortSignal.timeout(this.uploadTimeoutMs),
        },
      );
    } catch {
      throw new QuoteProposalRepositoryError(
        'service-unavailable',
        'Não foi possível baixar o PDF pela Lume Tenant API.',
      );
    }
    if (!response.ok) {
      throw new QuoteProposalRepositoryError(
        responseStatusToErrorCode(response.status),
        `A Tenant API respondeu com o status ${response.status}.`,
      );
    }
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();
    if (contentType !== 'application/pdf') {
      throw new QuoteProposalRepositoryError(
        'invalid-response',
        'A Tenant API retornou um documento incompatível.',
      );
    }
    const disposition = response.headers.get('content-disposition') ?? '';
    const encodedFileName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    return {
      fileName: encodedFileName ? decodeURIComponent(encodedFileName) : 'proposta.pdf',
      mimeType: 'application/pdf',
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  }

  private async request(
    path: string,
    input: {
      readonly method?: string;
      readonly body?: object | FormData;
    } = {},
  ): Promise<unknown> {
    let response: Response;
    const isMultipart = input.body instanceof FormData;

    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: input.method ?? 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...(input.body === undefined || isMultipart
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        body:
          input.body === undefined
            ? undefined
            : isMultipart
              ? input.body
              : JSON.stringify(input.body),
        signal: AbortSignal.timeout(isMultipart ? this.uploadTimeoutMs : this.timeoutMs),
      });
    } catch {
      throw new QuoteProposalRepositoryError(
        'service-unavailable',
        'Não foi possível conectar à Lume Tenant API.',
      );
    }

    if (!response.ok) {
      let errorBody: unknown;

      try {
        errorBody = await response.json();
      } catch {
        errorBody = null;
      }

      const parsed = parseErrorResponse(errorBody);
      throw new QuoteProposalRepositoryError(
        responseStatusToErrorCode(response.status),
        parsed.message ?? `A Tenant API respondeu com o status ${response.status}.`,
        parsed.currentVersion,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new QuoteProposalRepositoryError(
        'invalid-response',
        'A Tenant API retornou uma resposta de propostas que não é JSON.',
      );
    }
  }
}
