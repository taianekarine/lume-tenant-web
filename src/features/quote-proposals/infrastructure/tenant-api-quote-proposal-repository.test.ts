/** @jest-environment node */

import { QuoteProposalRepositoryError } from '../application';
import { LumeApiQuoteProposalRepository } from './tenant-api-quote-proposal-repository';

const quoteRequestId = '00000000-0000-4000-8000-000000000401';
const conversationId = '00000000-0000-4000-8000-000000000101';
const documentId = '00000000-0000-4000-8000-000000000501';
const messageId = '00000000-0000-4000-8000-000000000601';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function apiDocument(status = 'uploaded') {
  return {
    id: documentId,
    status,
    fileName: 'orcamento.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 128,
    sha256: 'a'.repeat(64),
    providerMessageId: status === 'sent' ? 'provider-message-001' : null,
    queuedAt: status === 'uploaded' ? null : '2026-07-27T15:48:00.000Z',
    sentAt: status === 'sent' ? '2026-07-27T15:49:00.000Z' : null,
    createdAt: '2026-07-27T15:47:00.000Z',
    updatedAt: '2026-07-27T15:49:00.000Z',
  };
}

function apiConversation(version = 8) {
  return {
    id: conversationId,
    version,
    conversationState: 'sent-to-human',
    department: 'commercial',
    flowStep: 'quote-send-pending',
    requestStatus: 'under-review',
    contact: {
      id: '00000000-0000-4000-8000-000000000301',
      phone: '5534999999999',
      displayName: 'Ana Paula',
    },
  };
}

function apiQueueItem() {
  return {
    id: quoteRequestId,
    stage: 'pending',
    quoteRequest: {
      id: quoteRequestId,
      sequence: 2,
      status: 'under-review',
      contactName: 'Ana Paula',
      document: '12345678900',
      email: 'ana@example.test',
      serviceType: 'Fretamento eventual',
      origin: 'Uberlândia',
      destination: 'Goiânia',
      departureDate: '2026-08-01',
      departureAt: '2026-08-01T10:00:00.000Z',
      returnDate: null,
      returnAt: null,
      passengerCount: 30,
      vehicleType: 'Ônibus',
      vehicleAtDisposal: true,
      localTransfers: false,
      notes: 'Resumo confirmado.',
      structuredData: { tripType: 'one-way' },
      confirmedAt: '2026-07-27T15:47:00.000Z',
      createdAt: '2026-07-27T15:47:00.000Z',
      version: 3,
      updatedAt: '2026-07-27T15:47:00.000Z',
    },
    conversation: apiConversation(),
    proposalDocument: null,
  };
}

describe('LumeApiQuoteProposalRepository', () => {
  it('maps and aggregates the paginated pending queue', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [apiQueueItem()],
          page: 1,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              ...apiQueueItem(),
              id: '00000000-0000-4000-8000-000000000402',
              quoteRequest: {
                ...apiQueueItem().quoteRequest,
                id: '00000000-0000-4000-8000-000000000402',
              },
            },
          ],
          page: 2,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        }),
      );
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1/',
      'access-token',
      fetcher,
    );

    const queue = await repository.getPending(1, 1);

    expect(queue.total).toBe(2);
    expect(queue.items).toHaveLength(2);
    expect(queue.items[0]).toMatchObject({
      quoteRequestId,
      conversationId,
      conversationVersion: 8,
      conversationState: 'sent-to-human',
      contact: { name: 'Ana Paula', phone: '5534999999999' },
      summary: { origin: 'Uberlândia', destination: 'Goiânia', passengerCount: 30 },
      proposalDocument: null,
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'http://tenant.test/api/v1/whatsapp/quote-proposals?stage=pending&page=1&pageSize=1',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('reads the pending total without loading the remaining pages', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        items: [apiQueueItem()],
        page: 1,
        pageSize: 1,
        total: 37,
        totalPages: 37,
      }),
    );
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1/',
      'access-token',
      fetcher,
    );

    await expect(repository.countPending()).resolves.toBe(37);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      'http://tenant.test/api/v1/whatsapp/quote-proposals?stage=pending&page=1&pageSize=1',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('loads every PDF linked to one quote request detail', async () => {
    const secondDocument = {
      ...apiDocument('sent'),
      id: '00000000-0000-4000-8000-000000000502',
      fileName: 'alternativa.pdf',
      sha256: 'b'.repeat(64),
    };
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        id: quoteRequestId,
        quoteRequest: apiQueueItem().quoteRequest,
        conversation: apiConversation(),
        proposalDocument: secondDocument,
        documents: [secondDocument, apiDocument('sent')],
      }),
    );
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1/',
      'access-token',
      fetcher,
    );

    await expect(repository.getDocumentHistory(quoteRequestId)).resolves.toMatchObject({
      quoteRequestId,
      documents: [
        { id: secondDocument.id, fileName: 'alternativa.pdf' },
        { id: documentId, fileName: 'orcamento.pdf' },
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      `http://tenant.test/api/v1/whatsapp/quote-proposals/${quoteRequestId}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('aggregates every page from the sent history as well', async () => {
    const firstItem = { ...apiQueueItem(), stage: 'sent' as const };
    const secondItem = {
      ...firstItem,
      id: '00000000-0000-4000-8000-000000000402',
      quoteRequest: {
        ...firstItem.quoteRequest,
        id: '00000000-0000-4000-8000-000000000402',
      },
    };
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [firstItem],
          page: 1,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [secondItem],
          page: 2,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        }),
      );
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1/',
      'access-token',
      fetcher,
    );

    const queue = await repository.getSent(1, 1);

    expect(queue.items).toHaveLength(2);
    expect(queue.total).toBe(2);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'http://tenant.test/api/v1/whatsapp/quote-proposals?stage=sent&page=2&pageSize=1',
      expect.any(Object),
    );
  });

  it('reads the authoritative stage summary and cancelled queue', async () => {
    const cancelledItem = {
      ...apiQueueItem(),
      stage: 'cancelled' as const,
      quoteRequest: {
        ...apiQueueItem().quoteRequest,
        status: 'rejected' as const,
        decision: {
          status: 'rejected' as const,
          reason: 'Data indisponível',
          decidedAt: '2026-07-29T12:00:00.000Z',
          decidedBy: null,
        },
      },
    };
    const summary = {
      pending: 4,
      sent: 9,
      approved: 3,
      cancelled: 1,
      cancellationReasons: [{ reason: 'Data indisponível', count: 1 }],
    };
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse({
        items: [cancelledItem],
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1,
        summary,
        filters: {
          search: null,
          createdFrom: null,
          createdTo: null,
        },
      }),
    );
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1/',
      'access-token',
      fetcher,
    );

    await expect(repository.getCancelled()).resolves.toMatchObject({
      total: 1,
      summary,
      items: [
        expect.objectContaining({
          stage: 'cancelled',
          requestStatus: 'rejected',
        }),
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://tenant.test/api/v1/whatsapp/quote-proposals?stage=cancelled&page=1&pageSize=100',
      expect.any(Object),
    );
  });

  it('uploads a PDF as multipart without overriding its content type', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          proposalDocument: apiDocument(),
          conversation: { id: conversationId, version: 8 },
          idempotent: false,
        },
        201,
      ),
    );
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1',
      'access-token',
      fetcher,
    );

    await expect(
      repository.uploadDocument(quoteRequestId, {
        commandId: '00000000-0000-4000-8000-000000000701',
        expectedVersion: 8,
        file: {
          fileName: 'orcamento.pdf',
          mimeType: 'application/pdf',
          bytes: new TextEncoder().encode('%PDF-1.7\n%%EOF'),
        },
      }),
    ).resolves.toMatchObject({ id: documentId, status: 'uploaded' });

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(request.headers).not.toHaveProperty('Content-Type');
    expect(request.body).toBeInstanceOf(FormData);
    const formData = request.body as FormData;
    expect(formData.get('commandId')).toBe('00000000-0000-4000-8000-000000000701');
    expect(formData.get('expectedVersion')).toBe('8');
    expect(formData.get('file')).toBeInstanceOf(File);
  });

  it('queues the persisted document through the JSON send contract', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          message: { id: messageId, deliveryStatus: 'pending' },
          conversation: { ...apiConversation(9), conversationState: 'sent-to-human' },
          proposalDocument: apiDocument('queued'),
          idempotent: false,
        },
        201,
      ),
    );
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1',
      'access-token',
      fetcher,
    );

    await expect(
      repository.sendDocument(quoteRequestId, {
        commandId: '00000000-0000-4000-8000-000000000702',
        proposalDocumentId: documentId,
        batchId: '00000000-0000-4000-8000-000000000700',
        batchDocumentIds: [documentId],
        expectedVersion: 8,
      }),
    ).resolves.toEqual({
      proposalDocument: apiDocument('queued'),
      conversationId,
      conversationVersion: 9,
      conversationState: 'sent-to-human',
      messageId,
      deliveryStatus: 'pending',
      idempotent: false,
    });

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(request.body))).toEqual({
      commandId: '00000000-0000-4000-8000-000000000702',
      proposalDocumentId: documentId,
      batchId: '00000000-0000-4000-8000-000000000700',
      batchDocumentIds: [documentId],
      expectedVersion: 8,
    });
  });

  it('creates a new attendant request and persists proposal decisions', async () => {
    const createdItem = {
      ...apiQueueItem(),
      quoteRequest: {
        ...apiQueueItem().quoteRequest,
        requestedBy: {
          id: '00000000-0000-4000-8000-000000000801',
          name: 'Atendente Comercial',
          type: 'attendant',
        },
        decision: {
          status: 'pending',
          reason: null,
          decidedAt: null,
          decidedBy: null,
        },
      },
    };
    const decidedItem = {
      ...createdItem,
      stage: 'sent',
      proposalDocument: apiDocument('sent'),
      quoteRequest: {
        ...createdItem.quoteRequest,
        status: 'rejected',
        decision: {
          status: 'rejected',
          reason: 'Cliente alterou a data da viagem.',
          decidedAt: '2026-07-28T12:00:00.000Z',
          decidedBy: {
            id: '00000000-0000-4000-8000-000000000801',
            name: 'Atendente Comercial',
          },
        },
      },
    };
    const statusItem = {
      ...createdItem,
      stage: 'cancelled',
      conversation: {
        ...apiConversation(12),
        requestStatus: 'cancelled',
      },
      quoteRequest: {
        ...createdItem.quoteRequest,
        status: 'cancelled',
        decision: {
          status: 'cancelled',
          reason: 'Cliente desistiu do atendimento.',
          decidedAt: '2026-07-28T13:00:00.000Z',
          decidedBy: {
            id: '00000000-0000-4000-8000-000000000801',
            name: 'Atendente Comercial',
          },
        },
      },
    };
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(createdItem, 201))
      .mockResolvedValueOnce(jsonResponse(decidedItem))
      .mockResolvedValueOnce(jsonResponse(statusItem));
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1',
      'access-token',
      fetcher,
    );

    await expect(
      repository.create({
        commandId: '00000000-0000-4000-8000-000000000703',
        expectedVersion: 9,
        conversationId,
        contactName: 'Ana Paula',
        serviceType: 'Fretamento eventual',
        origin: 'Uberlândia',
        destination: 'Goiânia',
        departureDate: '2026-08-01',
        departureAt: '2026-08-01T10:00:00.000Z',
        passengerCount: 30,
        vehicleAtDisposal: false,
        localTransfers: false,
      }),
    ).resolves.toMatchObject({
      stage: 'pending',
      requestedBy: { name: 'Atendente Comercial' },
      decision: { status: 'pending' },
    });

    await expect(
      repository.decide(quoteRequestId, {
        commandId: '00000000-0000-4000-8000-000000000704',
        expectedVersion: 10,
        decision: 'rejected',
        reason: 'Cliente alterou a data da viagem.',
      }),
    ).resolves.toMatchObject({
      stage: 'sent',
      decision: {
        status: 'rejected',
        reason: 'Cliente alterou a data da viagem.',
      },
    });
    await expect(
      repository.updateStatus(quoteRequestId, {
        commandId: '00000000-0000-4000-8000-000000000705',
        expectedVersion: 11,
        status: 'cancelled',
        reason: 'Cliente desistiu do atendimento.',
      }),
    ).resolves.toMatchObject({
      stage: 'cancelled',
      requestStatus: 'cancelled',
      decision: {
        status: 'cancelled',
        reason: 'Cliente desistiu do atendimento.',
      },
    });
    expect(JSON.parse(String(fetcher.mock.calls[0][1].body))).toMatchObject({
      conversationId,
      expectedVersion: 9,
    });
    expect(JSON.parse(String(fetcher.mock.calls[1][1].body))).toEqual({
      commandId: '00000000-0000-4000-8000-000000000704',
      expectedVersion: 10,
      decision: 'rejected',
      reason: 'Cliente alterou a data da viagem.',
    });
    expect(fetcher.mock.calls[2][0]).toBe(
      `http://tenant.test/api/v1/whatsapp/quote-proposals/${quoteRequestId}/status`,
    );
    expect(JSON.parse(String(fetcher.mock.calls[2][1].body))).toEqual({
      commandId: '00000000-0000-4000-8000-000000000705',
      expectedVersion: 11,
      status: 'cancelled',
      reason: 'Cliente desistiu do atendimento.',
    });
  });

  it('downloads the authenticated PDF without exposing the Tenant API token', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.7\n%%EOF');
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/pdf',
        'content-disposition':
          'inline; filename="proposta.pdf"; filename*=UTF-8\'\'proposta-final.pdf',
      }),
      arrayBuffer: jest.fn().mockResolvedValue(bytes.buffer),
    } as unknown as Response);
    const repository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1',
      'access-token',
      fetcher,
    );

    await expect(repository.downloadDocument(quoteRequestId, documentId)).resolves.toMatchObject({
      fileName: 'proposta-final.pdf',
      mimeType: 'application/pdf',
      bytes,
    });
    expect(fetcher).toHaveBeenCalledWith(
      `http://tenant.test/api/v1/whatsapp/quote-proposals/${quoteRequestId}/documents/${documentId}/content`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('propagates conflict details and rejects incompatible responses', async () => {
    const conflictFetcher = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          message: 'A conversa foi alterada.',
          details: { currentVersion: 10 },
        },
        409,
      ),
    );
    const conflictRepository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1',
      'token',
      conflictFetcher,
    );

    await expect(conflictRepository.getPending()).rejects.toMatchObject({
      code: 'conflict',
      currentVersion: 10,
      message: 'A conversa foi alterada.',
    });

    const invalidRepository = new LumeApiQuoteProposalRepository(
      'http://tenant.test/api/v1',
      'token',
      jest.fn().mockResolvedValue(jsonResponse({ items: [] })),
    );
    await expect(invalidRepository.getPending()).rejects.toBeInstanceOf(
      QuoteProposalRepositoryError,
    );
  });
});
