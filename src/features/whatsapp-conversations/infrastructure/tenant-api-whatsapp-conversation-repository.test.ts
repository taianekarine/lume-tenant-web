/** @jest-environment node */

import { WhatsAppConversationRepositoryError } from '../application';
import { LumeApiWhatsAppConversationRepository } from './tenant-api-whatsapp-conversation-repository';

const conversationId = '00000000-0000-4000-8000-000000000101';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function apiQuote() {
  return {
    id: '00000000-0000-4000-8000-000000000401',
    sequence: 2,
    status: 'under-review',
    contactName: 'Ana Paula',
    document: '04252011000110',
    email: 'ana@example.test',
    serviceType: 'Evento',
    origin: 'Belo Horizonte',
    destination: 'Contagem',
    departureDate: '2026-08-01',
    departureAt: '2026-08-01T10:00:00.000Z',
    returnDate: null,
    returnAt: null,
    passengerCount: 20,
    vehicleType: 'Ônibus',
    vehicleAtDisposal: true,
    localTransfers: false,
    notes: 'Resumo confirmado.',
    structuredData: { eventType: 'Congresso' },
    version: 3,
    createdAt: '2026-07-21T13:36:00.000Z',
    updatedAt: '2026-07-21T13:40:00.000Z',
  };
}

function apiConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: conversationId,
    companyId: '00000000-0000-4000-8000-000000000001',
    channel: {
      id: '00000000-0000-4000-8000-000000000201',
      name: 'WhatsApp Comercial',
      phoneNumber: '5531999990000',
    },
    contact: {
      id: '00000000-0000-4000-8000-000000000301',
      phone: '5531999991001',
      displayName: 'Ana Paula',
      profilePictureUrl: null,
    },
    department: 'commercial',
    conversationState: 'sent-to-human',
    flowStep: 'quote-send-pending',
    requestStatus: 'under-review',
    resumeState: null,
    assignedTo: null,
    unreadCount: 2,
    version: 7,
    lastInboundAt: '2026-07-21T13:42:00.000Z',
    lastOutboundAt: '2026-07-21T13:38:00.000Z',
    lastMessagePreview: 'Resumo confirmado.',
    closedAt: null,
    createdAt: '2026-07-21T13:35:00.000Z',
    updatedAt: '2026-07-21T13:42:00.000Z',
    currentQuoteRequest: apiQuote(),
    ...overrides,
  };
}

function apiMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000501',
    conversationId,
    providerMessageId: null,
    direction: 'outbound',
    deliveryStatus: 'failed',
    kind: 'document',
    text: 'Segue a proposta.',
    sentBy: {
      id: '00000000-0000-4000-8000-000000000801',
      name: 'Usuário Comercial',
    },
    media: {
      mimeType: 'application/pdf',
      size: 2048,
      url: 'https://files.example.test/proposta.pdf',
      fileName: 'proposta.pdf',
    },
    correlationId: 'outbound:hash',
    occurredAt: '2026-07-21T13:45:00.000Z',
    attempts: [
      {
        id: '00000000-0000-4000-8000-000000000601',
        attemptNumber: 1,
        status: 'failed',
        providerMessageId: null,
        errorCode: 'PROVIDER_TIMEOUT',
        errorMessage: 'Evolution não respondeu.',
        startedAt: '2026-07-21T13:45:00.000Z',
        completedAt: '2026-07-21T13:45:05.000Z',
      },
    ],
    createdAt: '2026-07-21T13:45:00.000Z',
    updatedAt: '2026-07-21T13:45:05.000Z',
    ...overrides,
  };
}

function apiTransition() {
  return {
    id: '00000000-0000-4000-8000-000000000901',
    commandId: '00000000-0000-4000-8000-000000000902',
    name: 'take-over',
    expectedVersion: 6,
    resultingVersion: 7,
    actorType: 'user',
    actorUserId: '00000000-0000-4000-8000-000000000801',
    from: {
      department: 'commercial',
      conversationState: 'sent-to-human',
      flowStep: 'human-service',
      requestStatus: 'under-review',
    },
    to: {
      department: 'commercial',
      conversationState: 'human-active',
      flowStep: 'human-service',
      requestStatus: 'under-review',
    },
    metadata: {},
    createdAt: '2026-07-21T13:44:00.000Z',
  };
}

describe('LumeApiWhatsAppConversationRepository', () => {
  it('maps and validates the paginated list returned by the Tenant API', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [apiConversation()],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        summary: {
          total: 1,
          botActive: 0,
          attendantActive: 0,
          automationPaused: 1,
          unreadMessages: 2,
          unreadConversations: 1,
        },
      }),
    );
    const repository = new LumeApiWhatsAppConversationRepository(
      'http://localhost:3333/api/v1/',
      'access-token',
      fetcher,
      1_500,
    );

    const [conversation] = await repository.getConversations({
      search: 'Ana',
      department: 'commercial',
      state: 'sent-to-human',
      control: 'paused',
      requestStatus: 'under-review',
    });

    expect(conversation).toMatchObject({
      id: conversationId,
      version: 7,
      contact: { name: 'Ana Paula', phone: '5531999991001' },
      flowStep: 'quote-send-pending',
      currentQuoteRequest: { sequence: 2, status: 'under-review' },
      messages: [],
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/whatsapp/conversations?page=1&pageSize=100&search=Ana&department=commercial&state=sent-to-human&control=paused&requestStatus=under-review',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('loads only the requested page even when the tenant has thousands of conversations', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [apiConversation()],
        meta: { page: 3, pageSize: 25, total: 12_560, totalPages: 503 },
        summary: {
          total: 12_560,
          botActive: 10,
          attendantActive: 20,
          automationPaused: 30,
          unreadMessages: 40,
          unreadConversations: 5,
        },
      }),
    );
    const repository = new LumeApiWhatsAppConversationRepository(
      'http://localhost:3333/api/v1/',
      'access-token',
      fetcher,
      1_500,
    );

    await expect(
      repository.getConversationPage({ page: 3, pageSize: 25, department: 'controlling' }),
    ).resolves.toMatchObject({
      conversations: [{ id: conversationId }],
      page: 3,
      pageSize: 25,
      total: 12_560,
      totalPages: 503,
      metrics: {
        botActive: 10,
        attendantActive: 20,
        automationPaused: 30,
        unreadMessages: 40,
        unreadConversations: 5,
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/whatsapp/conversations?page=3&pageSize=25&department=controlling',
      expect.any(Object),
    );
  });

  it('uses the dedicated server-scoped endpoint for dashboard indicators', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [apiConversation({ department: 'operations' })],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      }),
    );
    const repository = new LumeApiWhatsAppConversationRepository(
      'http://localhost:3333/api/v1/',
      'access-token',
      fetcher,
      1_500,
    );

    await repository.getDashboardConversations({ department: 'operations' });

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/whatsapp/conversations/dashboard?page=1&pageSize=100&department=operations',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('loads one message page and the transition history with delivery attempts', async () => {
    const historicalRecoveryTransition = {
      ...apiTransition(),
      commandId: 'local-recovery-20382581-b462-4373-a288-e265aea0dca3',
      name: 'repair-retry-routing',
    };
    const automaticInboundTransition = {
      ...apiTransition(),
      id: '00000000-0000-4000-8000-000000000903',
      commandId: `inbound:${'9c'.repeat(32)}`,
      name: 'resume-awaited-reply',
      expectedVersion: 7,
      resultingVersion: 8,
    };
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(apiConversation()))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [apiMessage()],
          meta: { page: 3, pageSize: 100, total: 250, totalPages: 3 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [historicalRecoveryTransition, automaticInboundTransition],
          meta: { page: 1, pageSize: 100, total: 2, totalPages: 1 },
        }),
      );
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    const conversation = await repository.getConversationById(conversationId, 3);

    expect(conversation?.messages).toEqual([
      expect.objectContaining({
        deliveryStatus: 'failed',
        sentBy: {
          id: '00000000-0000-4000-8000-000000000801',
          name: 'Usuário Comercial',
        },
        attachment: expect.objectContaining({
          fileName: 'proposta.pdf',
          url: `/api/whatsapp-conversations/${conversationId}/messages/00000000-0000-4000-8000-000000000501/content`,
        }),
        attempts: [
          expect.objectContaining({
            status: 'failed',
            errorCode: 'PROVIDER_TIMEOUT',
          }),
        ],
      }),
    ]);
    expect(conversation?.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'repair-retry-routing',
          commandId: 'local-recovery-20382581-b462-4373-a288-e265aea0dca3',
          expectedVersion: 6,
          resultingVersion: 7,
          actorType: 'user',
        }),
        expect.objectContaining({
          name: 'resume-awaited-reply',
          commandId: `inbound:${'9c'.repeat(32)}`,
          expectedVersion: 7,
          resultingVersion: 8,
        }),
      ]),
    );
    expect(conversation?.messageHistory).toEqual({
      page: 3,
      pageSize: 100,
      total: 250,
      totalPages: 3,
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `https://tenant.example/api/v1/whatsapp/conversations/${conversationId}/messages?page=3&pageSize=100`,
      expect.any(Object),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      `https://tenant.example/api/v1/whatsapp/conversations/${conversationId}/transitions?page=1&pageSize=100`,
      expect.any(Object),
    );
  });

  it('maps an oversized retained message without exposing a broken content URL', async () => {
    const oversizedVideo = apiMessage({
      direction: 'inbound',
      deliveryStatus: 'received',
      kind: 'video',
      text: null,
      media: {
        mimeType: 'video/mp4',
        size: 52_428_801,
        fileName: 'video-grande.mp4',
        retentionStatus: 'too-large',
      },
      attempts: [],
    });
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(apiConversation()))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [oversizedVideo],
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [],
          meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        }),
      );
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    const conversation = await repository.getConversationById(conversationId);

    expect(conversation?.messages[0]?.attachment).toMatchObject({
      fileName: 'video-grande.mp4',
      retentionStatus: 'too-large',
      url: null,
    });
  });

  it('does not expose internal dispatch claims or transition persistence fields', async () => {
    const message = apiMessage();
    const transition = apiTransition();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(apiConversation()))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              ...message,
              attempts: message.attempts.map((attempt) => ({
                ...attempt,
                dispatchClaimId: '00000000-0000-4000-8000-000000000699',
                dispatchFingerprint: 'internal-dispatch-fingerprint',
                dispatchClaimedAt: '2026-07-21T13:45:01.000Z',
                dispatchState: 'leased',
                dispatchOwnerId: 'n8n-worker-01',
                dispatchLeaseUntil: '2026-07-21T13:50:01.000Z',
              })),
            },
          ],
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              ...transition,
              companyId: '00000000-0000-4000-8000-000000000001',
              payloadHash: 'internal-hash',
              from: { ...transition.from, resumeState: 'bot-active' },
              to: { ...transition.to, resumeState: null },
            },
          ],
          meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
        }),
      );
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    const conversation = await repository.getConversationById(conversationId);
    const attempt = conversation?.messages[0]?.attempts[0];
    const mappedTransition = conversation?.transitions[0];

    expect(attempt).toBeDefined();
    expect(attempt).not.toHaveProperty('dispatchClaimId');
    expect(attempt).not.toHaveProperty('dispatchFingerprint');
    expect(attempt).not.toHaveProperty('dispatchClaimedAt');
    expect(attempt).not.toHaveProperty('dispatchState');
    expect(attempt).not.toHaveProperty('dispatchOwnerId');
    expect(attempt).not.toHaveProperty('dispatchLeaseUntil');
    expect(mappedTransition).toBeDefined();
    expect(mappedTransition).not.toHaveProperty('companyId');
    expect(mappedTransition).not.toHaveProperty('payloadHash');
    expect(mappedTransition?.from).not.toHaveProperty('resumeState');
    expect(mappedTransition?.to).not.toHaveProperty('resumeState');
  });

  it('sends expectedVersion and a unique commandId in every real panel action', async () => {
    const fetcher = jest.fn().mockResolvedValue(jsonResponse(apiConversation({ version: 8 })));
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    await repository.takeOverConversation(conversationId, 7);
    await repository.returnConversationToBot(conversationId, 8);
    await repository.forwardConversation(conversationId, 'operations', 9);
    await repository.markConversationAsRead(conversationId, 10);
    await repository.closeConversationAfterRejection(conversationId, 11);
    await repository.closeConversation(conversationId, 12, 'Solicitação concluída.');

    const requests = fetcher.mock.calls.map(
      ([url, init]) => [url, JSON.parse((init as RequestInit).body as string)] as const,
    );
    expect(requests.map(([url]) => url)).toEqual([
      expect.stringContaining('/actions/take-over'),
      expect.stringContaining('/actions/return-to-bot'),
      expect.stringContaining('/actions/forward'),
      expect.stringContaining('/actions/mark-read'),
      expect.stringContaining('/actions/close-after-rejection'),
      expect.stringContaining('/actions/close'),
    ]);
    expect(requests.map(([, body]) => body.expectedVersion)).toEqual([7, 8, 9, 10, 11, 12]);
    expect(requests[2][1]).toMatchObject({ targetDepartment: 'operations' });
    expect(requests[5][1]).toMatchObject({ reason: 'Solicitação concluída.' });
    expect(requests.every(([, body]) => /^[0-9a-f-]{36}$/.test(body.commandId))).toBe(true);
  });

  it('starts a canonical human conversation by phone', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse(
        apiConversation({
          conversationState: 'human-active',
          flowStep: 'human-service',
          assignedTo: {
            id: '00000000-0000-4000-8000-000000000801',
            name: 'Atendente Comercial',
          },
        }),
      ),
    );
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    await expect(repository.startConversation('5534987654321')).resolves.toMatchObject({
      id: conversationId,
      conversationState: 'human-active',
      assignedTo: { name: 'Atendente Comercial' },
    });

    expect(fetcher).toHaveBeenCalledWith(
      'https://tenant.example/api/v1/whatsapp/conversations',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    );
    const requestBody = JSON.parse(
      (fetcher.mock.calls[0]?.[1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(requestBody).toMatchObject({ phone: '5534987654321' });
    expect(requestBody.commandId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('maps HTTP 409 and details.currentVersion to a typed conflict', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          code: 'CONFLICT',
          message: 'A conversa foi alterada por outro comando.',
          details: { currentVersion: 12 },
        },
        409,
      ),
    );
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    await expect(repository.takeOverConversation(conversationId, 7)).rejects.toEqual(
      expect.objectContaining<Partial<WhatsAppConversationRepositoryError>>({
        code: 'conflict',
        currentVersion: 12,
      }),
    );
  });

  it('maps HTTP 429 without converting throttling into service unavailability', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'Aguarde alguns instantes antes de atualizar novamente.' }, 429),
      );
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    await expect(repository.getConversationPage()).rejects.toMatchObject({
      code: 'too-many-requests',
    });
  });

  it('posts an idempotent human message to the JWT panel endpoint', async () => {
    const message = apiMessage({
      kind: 'text',
      text: 'O seu orçamento está em análise.',
      media: null,
      deliveryStatus: 'pending',
      attempts: [],
    });
    const conversation = apiConversation({
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo: {
        id: '00000000-0000-4000-8000-000000000801',
        name: 'Atendente Comercial',
      },
      version: 8,
    });
    const fetcher = jest.fn().mockResolvedValue(jsonResponse({ message, conversation }));
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );
    const command = {
      commandId: '00000000-0000-4000-8000-000000000701',
      idempotencyKey: '00000000-0000-4000-8000-000000000702',
      expectedVersion: 7,
      text: 'O seu orçamento está em análise.',
    };

    await expect(repository.sendHumanMessage(conversationId, command)).resolves.toMatchObject({
      conversation: { id: conversationId, version: 8 },
      message: { deliveryStatus: 'pending', text: command.text },
    });
    expect(fetcher).toHaveBeenCalledWith(
      `https://tenant.example/api/v1/whatsapp/conversations/${conversationId}/messages`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(command),
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('rejects a success payload outside the real DTO contract', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [{ ...apiConversation(), version: '7' }],
        meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
      }),
    );
    const repository = new LumeApiWhatsAppConversationRepository(
      'https://tenant.example/api/v1',
      'token',
      fetcher,
    );

    await expect(repository.getConversations()).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });
});
