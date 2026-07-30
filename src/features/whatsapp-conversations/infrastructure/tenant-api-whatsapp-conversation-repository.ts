import 'server-only';

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  WhatsAppConversationRepositoryError,
  type GetWhatsAppConversationsFilters,
  type SendHumanWhatsAppMessageCommand,
  type SendHumanWhatsAppMessageResult,
  type WhatsAppConversationRepository,
  type WhatsAppConversationRepositoryErrorCode,
} from '../application';
import {
  WHATSAPP_CONVERSATION_DEPARTMENTS,
  WHATSAPP_CONVERSATION_FLOW_STEPS,
  WHATSAPP_CONVERSATION_STATES,
  WHATSAPP_MESSAGE_DELIVERY_STATUSES,
  WHATSAPP_MESSAGE_DIRECTIONS,
  WHATSAPP_MESSAGE_KINDS,
  WHATSAPP_REQUEST_STATUSES,
  type WhatsAppConversation,
  type WhatsAppConversationDepartment,
  type WhatsAppConversationTransition,
  type WhatsAppMessage,
  type WhatsAppMessageAttachment,
  type WhatsAppQuoteRequest,
} from '../domain';

type Fetcher = typeof fetch;

const isoDateSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const nullableIsoDateSchema = isoDateSchema.nullable();
const nullableCivilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const jsonObjectSchema = z.record(z.string(), z.unknown());

const quoteRequestSchema = z.object({
  id: z.string().uuid(),
  sequence: z.number().int().positive(),
  status: z.enum(WHATSAPP_REQUEST_STATUSES),
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
  version: z.number().int().positive(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const conversationSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  channel: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    phoneNumber: z.string().min(1),
  }),
  contact: z.object({
    id: z.string().uuid(),
    phone: z.string().min(1),
    displayName: z.string().nullable(),
    profilePictureUrl: z.string().url().nullable(),
  }),
  department: z.enum(WHATSAPP_CONVERSATION_DEPARTMENTS),
  conversationState: z.enum(WHATSAPP_CONVERSATION_STATES),
  flowStep: z.enum(WHATSAPP_CONVERSATION_FLOW_STEPS),
  requestStatus: z.enum(WHATSAPP_REQUEST_STATUSES),
  resumeState: z.enum(WHATSAPP_CONVERSATION_STATES).nullable(),
  assignedTo: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
    })
    .nullable(),
  unreadCount: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  lastInboundAt: nullableIsoDateSchema,
  lastOutboundAt: nullableIsoDateSchema,
  lastMessagePreview: z.string().nullable(),
  closedAt: nullableIsoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  currentQuoteRequest: quoteRequestSchema.nullable(),
  hasApprovedQuoteRequest: z.boolean().default(false),
});

const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const conversationListSchema = z.object({
  data: z.array(conversationSchema),
  meta: paginationSchema,
});

const messageAttemptSchema = z.object({
  id: z.string().uuid(),
  attemptNumber: z.number().int().positive(),
  status: z.enum(['pending', 'succeeded', 'failed']),
  providerMessageId: z.string().nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: isoDateSchema,
  completedAt: nullableIsoDateSchema,
});

const mediaSchema = z
  .object({
    mimeType: z.string().min(1).optional(),
    size: z.number().nonnegative().optional(),
    url: z
      .string()
      .url()
      .refine((value) => value.startsWith('https://'))
      .optional(),
    fileName: z.string().min(1).optional(),
  })
  .catchall(z.unknown())
  .nullable();

const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  providerMessageId: z.string().nullable(),
  direction: z.enum(WHATSAPP_MESSAGE_DIRECTIONS),
  deliveryStatus: z.enum(WHATSAPP_MESSAGE_DELIVERY_STATUSES),
  kind: z.enum(WHATSAPP_MESSAGE_KINDS),
  text: z.string().nullable(),
  media: mediaSchema,
  sentBy: z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1),
    })
    .nullable()
    .optional(),
  correlationId: z.string().min(1),
  occurredAt: isoDateSchema,
  attempts: z.array(messageAttemptSchema),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const messageListSchema = z.object({
  data: z.array(messageSchema),
  meta: paginationSchema,
});

const humanMessageResultSchema = z.object({
  message: messageSchema,
  conversation: conversationSchema,
});

const conversationSnapshotSchema = z.object({
  department: z.enum(WHATSAPP_CONVERSATION_DEPARTMENTS),
  conversationState: z.enum(WHATSAPP_CONVERSATION_STATES),
  flowStep: z.enum(WHATSAPP_CONVERSATION_FLOW_STEPS),
  requestStatus: z.enum(WHATSAPP_REQUEST_STATUSES),
});

const transitionSchema = z.object({
  id: z.string().uuid(),
  commandId: z.string().min(1).max(120),
  name: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  resultingVersion: z.number().int().positive(),
  actorType: z.string().min(1),
  actorUserId: z.string().uuid().nullable(),
  actor: z
    .object({
      type: z.string().min(1),
      user: z
        .object({
          id: z.string().uuid(),
          name: z.string().min(1),
        })
        .nullable(),
    })
    .optional(),
  from: conversationSnapshotSchema,
  to: conversationSnapshotSchema,
  metadata: jsonObjectSchema,
  createdAt: isoDateSchema,
});

const transitionListSchema = z.object({
  data: z.array(transitionSchema),
  meta: paginationSchema,
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

type ApiConversation = z.infer<typeof conversationSchema>;
type ApiMessage = z.infer<typeof messageSchema>;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function filtersToQuery(filters?: GetWhatsAppConversationsFilters): string {
  const params = new URLSearchParams({
    page: String(filters?.page ?? 1),
    pageSize: String(filters?.pageSize ?? 100),
  });

  if (filters?.search?.trim()) params.set('search', filters.search.trim());
  if (filters?.department) params.set('department', filters.department);
  if (filters?.state) params.set('state', filters.state);
  if (filters?.requestStatus) params.set('requestStatus', filters.requestStatus);

  return `?${params.toString()}`;
}

function latestConversationActivity(conversation: ApiConversation): string {
  const candidates = [
    conversation.lastInboundAt,
    conversation.lastOutboundAt,
    conversation.updatedAt,
  ].filter((value): value is string => value !== null);

  return candidates.reduce((latest, value) =>
    Date.parse(value) > Date.parse(latest) ? value : latest,
  );
}

function mapQuoteRequest(
  quoteRequest: ApiConversation['currentQuoteRequest'],
): WhatsAppQuoteRequest | null {
  if (quoteRequest === null) return null;

  return {
    ...quoteRequest,
    structuredData: quoteRequest.structuredData,
  };
}

function mapAttachment(media: ApiMessage['media']): WhatsAppMessageAttachment | null {
  if (media === null) return null;

  return {
    mimeType: typeof media.mimeType === 'string' ? media.mimeType : null,
    size: typeof media.size === 'number' ? media.size : null,
    url: typeof media.url === 'string' ? media.url : null,
    fileName: typeof media.fileName === 'string' ? media.fileName : null,
    metadata: media,
  };
}

function mapMessage(message: ApiMessage): WhatsAppMessage {
  return {
    id: message.id,
    direction: message.direction,
    deliveryStatus: message.deliveryStatus,
    kind: message.kind,
    text: message.text,
    attachment: mapAttachment(message.media),
    sentBy: message.sentBy ?? null,
    occurredAt: message.occurredAt,
    attempts: message.attempts,
  };
}

function mapConversation(
  conversation: ApiConversation,
  messages: readonly WhatsAppMessage[] = [],
  transitions: readonly WhatsAppConversationTransition[] = [],
): WhatsAppConversation {
  return {
    id: conversation.id,
    companyId: conversation.companyId,
    channel: conversation.channel,
    contact: {
      id: conversation.contact.id,
      name: conversation.contact.displayName?.trim() || conversation.contact.phone,
      phone: conversation.contact.phone,
      profilePictureUrl: conversation.contact.profilePictureUrl,
    },
    department: conversation.department,
    conversationState: conversation.conversationState,
    flowStep: conversation.flowStep,
    requestStatus: conversation.requestStatus,
    resumeState: conversation.resumeState,
    assignedTo: conversation.assignedTo,
    unreadCount: conversation.unreadCount,
    version: conversation.version,
    lastInboundAt: conversation.lastInboundAt,
    lastOutboundAt: conversation.lastOutboundAt,
    lastMessagePreview: conversation.lastMessagePreview ?? '',
    lastMessageAt: latestConversationActivity(conversation),
    closedAt: conversation.closedAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    currentQuoteRequest: mapQuoteRequest(conversation.currentQuoteRequest),
    hasApprovedQuoteRequest: conversation.hasApprovedQuoteRequest,
    messages,
    transitions,
  };
}

function responseStatusToErrorCode(status: number): WhatsAppConversationRepositoryErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  return 'service-unavailable';
}

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new WhatsAppConversationRepositoryError(
      'invalid-response',
      'A Tenant API retornou dados de WhatsApp incompatíveis com o contrato.',
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

export class LumeApiWhatsAppConversationRepository implements WhatsAppConversationRepository {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 5_000,
  ) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  async getConversations(
    filters?: GetWhatsAppConversationsFilters,
  ): Promise<readonly WhatsAppConversation[]> {
    return this.getConversationCollection('/whatsapp/conversations', filters);
  }

  async getDashboardConversations(
    filters?: GetWhatsAppConversationsFilters,
  ): Promise<readonly WhatsAppConversation[]> {
    return this.getConversationCollection('/whatsapp/conversations/dashboard', filters);
  }

  private async getConversationCollection(
    path: string,
    filters?: GetWhatsAppConversationsFilters,
  ): Promise<readonly WhatsAppConversation[]> {
    const firstPage = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 100;
    const response = parseResponse(
      conversationListSchema,
      await this.request(
        `${path}${filtersToQuery({
          ...filters,
          page: firstPage,
          pageSize,
        })}`,
      ),
    );

    if (filters?.page || response.meta.totalPages <= firstPage) {
      return response.data.map((conversation) => mapConversation(conversation));
    }

    const remainingPages = await Promise.all(
      Array.from(
        { length: response.meta.totalPages - firstPage },
        (_unused, index) => firstPage + index + 1,
      ).map(async (page) =>
        parseResponse(
          conversationListSchema,
          await this.request(
            `${path}${filtersToQuery({
              ...filters,
              page,
              pageSize,
            })}`,
          ),
        ),
      ),
    );

    return [response, ...remainingPages].flatMap((page) =>
      page.data.map((conversation) => mapConversation(conversation)),
    );
  }

  async getConversationById(conversationId: string): Promise<WhatsAppConversation | null> {
    let conversationValue: unknown;

    try {
      conversationValue = await this.request(
        `/whatsapp/conversations/${encodeURIComponent(conversationId)}`,
      );
    } catch (error) {
      if (error instanceof WhatsAppConversationRepositoryError && error.code === 'not-found') {
        return null;
      }
      throw error;
    }

    const conversation = parseResponse(conversationSchema, conversationValue);
    const [messages, transitions] = await Promise.all([
      this.getAllMessages(conversationId),
      this.getAllTransitions(conversationId),
    ]);

    return mapConversation(conversation, messages, transitions);
  }

  async takeOverConversation(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return this.executeVersionedAction(conversationId, 'take-over', expectedVersion);
  }

  async returnConversationToBot(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return this.executeVersionedAction(conversationId, 'return-to-bot', expectedVersion);
  }

  async forwardConversation(
    conversationId: string,
    targetDepartment: WhatsAppConversationDepartment,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return this.executeVersionedAction(conversationId, 'forward', expectedVersion, {
      targetDepartment,
    });
  }

  async markConversationAsRead(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return this.executeVersionedAction(conversationId, 'mark-read', expectedVersion);
  }

  async closeConversationAfterRejection(
    conversationId: string,
    expectedVersion: number,
  ): Promise<WhatsAppConversation> {
    return this.executeVersionedAction(conversationId, 'close-after-rejection', expectedVersion);
  }

  async closeConversation(
    conversationId: string,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<WhatsAppConversation> {
    return this.executeVersionedAction(conversationId, 'close', expectedVersion, {
      reason: reason?.trim() || null,
    });
  }

  async sendHumanMessage(
    conversationId: string,
    command: SendHumanWhatsAppMessageCommand,
  ): Promise<SendHumanWhatsAppMessageResult> {
    const response = parseResponse(
      humanMessageResultSchema,
      await this.request(`/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: command,
      }),
    );

    return {
      conversation: mapConversation(response.conversation),
      message: mapMessage(response.message),
    };
  }

  private async getAllMessages(conversationId: string): Promise<readonly WhatsAppMessage[]> {
    const path = `/whatsapp/conversations/${encodeURIComponent(conversationId)}/messages`;
    const firstPage = parseResponse(
      messageListSchema,
      await this.request(`${path}?page=1&pageSize=100`),
    );
    const messages = [...firstPage.data];

    for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
      const result = parseResponse(
        messageListSchema,
        await this.request(`${path}?page=${page}&pageSize=100`),
      );
      messages.push(...result.data);
    }

    return messages
      .sort((first, second) => {
        const difference = Date.parse(first.occurredAt) - Date.parse(second.occurredAt);
        return difference === 0 ? first.id.localeCompare(second.id) : difference;
      })
      .map(mapMessage);
  }

  private async getAllTransitions(
    conversationId: string,
  ): Promise<readonly WhatsAppConversationTransition[]> {
    const path = `/whatsapp/conversations/${encodeURIComponent(conversationId)}/transitions`;
    const firstPage = parseResponse(
      transitionListSchema,
      await this.request(`${path}?page=1&pageSize=100`),
    );
    const transitions = [...firstPage.data];

    for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
      const result = parseResponse(
        transitionListSchema,
        await this.request(`${path}?page=${page}&pageSize=100`),
      );
      transitions.push(...result.data);
    }

    return transitions.sort((first, second) => {
      const difference = second.resultingVersion - first.resultingVersion;
      return difference === 0 ? second.id.localeCompare(first.id) : difference;
    });
  }

  private async executeVersionedAction(
    conversationId: string,
    action:
      'take-over' | 'return-to-bot' | 'forward' | 'mark-read' | 'close' | 'close-after-rejection',
    expectedVersion: number,
    extra: Readonly<Record<string, unknown>> = {},
  ): Promise<WhatsAppConversation> {
    const response = parseResponse(
      conversationSchema,
      await this.request(
        `/whatsapp/conversations/${encodeURIComponent(conversationId)}/actions/${action}`,
        {
          method: 'POST',
          body: {
            commandId: randomUUID(),
            expectedVersion,
            ...extra,
          },
        },
      ),
    );

    return mapConversation(response);
  }

  private async request(
    path: string,
    input: { readonly method?: string; readonly body?: unknown } = {},
  ): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: input.method ?? 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...(input.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new WhatsAppConversationRepositoryError(
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

      const parsedError = parseErrorResponse(errorBody);
      throw new WhatsAppConversationRepositoryError(
        responseStatusToErrorCode(response.status),
        parsedError.message ?? `A Tenant API respondeu com o status ${response.status}.`,
        parsedError.currentVersion,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new WhatsAppConversationRepositoryError(
        'invalid-response',
        'A Tenant API retornou uma resposta de WhatsApp que não é JSON.',
      );
    }
  }
}

export { LumeApiWhatsAppConversationRepository as TenantApiWhatsAppConversationRepository };
