/** @jest-environment node */

import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { LumeApiWhatsAppConversationRepository } from './tenant-api-whatsapp-conversation-repository';

const conversationId = '00000000-0000-4000-8000-000000000101';
const command = {
  commandId: '00000000-0000-4000-8000-000000000701',
  idempotencyKey: '00000000-0000-4000-8000-000000000702',
  expectedVersion: 7,
  text: 'O orçamento está em análise.',
};

function contractConversation() {
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
    conversationState: 'human-active',
    flowStep: 'human-service',
    requestStatus: 'under-review',
    resumeState: null,
    assignedTo: {
      id: '00000000-0000-4000-8000-000000000801',
      name: 'Atendente Comercial',
    },
    unreadCount: 0,
    version: 8,
    lastInboundAt: '2026-07-26T11:58:00.000Z',
    lastOutboundAt: null,
    lastMessagePreview: command.text,
    closedAt: null,
    createdAt: '2026-07-26T11:00:00.000Z',
    updatedAt: '2026-07-26T12:00:00.000Z',
    currentQuoteRequest: null,
  };
}

function contractMessage() {
  return {
    id: '00000000-0000-4000-8000-000000000501',
    conversationId,
    providerMessageId: null,
    direction: 'outbound',
    deliveryStatus: 'pending',
    kind: 'text',
    text: command.text,
    media: null,
    correlationId: 'human-outbound:contract-smoke',
    occurredAt: '2026-07-26T12:00:00.000Z',
    attempts: [
      {
        id: '00000000-0000-4000-8000-000000000601',
        attemptNumber: 1,
        status: 'pending',
        providerMessageId: null,
        errorCode: null,
        errorMessage: null,
        dispatchState: 'ready',
        dispatchClaimedAt: null,
        dispatchLeaseUntil: null,
        startedAt: '2026-07-26T12:00:00.000Z',
        completedAt: null,
      },
    ],
    createdAt: '2026-07-26T12:00:00.000Z',
    updatedAt: '2026-07-26T12:00:00.000Z',
    idempotent: false,
  };
}

describe('Tenant API WhatsApp adapter HTTP smoke', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    const closingServer = server;
    server = undefined;
    closingServer.close();
    await once(closingServer, 'close');
  });

  it('sends the real human-message contract over HTTP and parses the persisted result', async () => {
    let receivedRequest:
      | {
          readonly method: string | undefined;
          readonly url: string | undefined;
          readonly authorization: string | undefined;
          readonly contentType: string | undefined;
          readonly body: unknown;
        }
      | undefined;

    server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        receivedRequest = {
          method: request.method,
          url: request.url,
          authorization: request.headers.authorization,
          contentType: request.headers['content-type'],
          body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown,
        };
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({
            message: contractMessage(),
            conversation: contractConversation(),
            idempotent: false,
          }),
        );
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    const repository = new LumeApiWhatsAppConversationRepository(
      `http://127.0.0.1:${address.port}/api/v1`,
      'contract-smoke-token',
      fetch,
      2_000,
    );

    await expect(repository.sendHumanMessage(conversationId, command)).resolves.toMatchObject({
      conversation: {
        id: conversationId,
        version: 8,
        conversationState: 'human-active',
      },
      message: {
        deliveryStatus: 'pending',
        text: command.text,
        attempts: [expect.objectContaining({ status: 'pending' })],
      },
    });
    expect(receivedRequest).toEqual({
      method: 'POST',
      url: `/api/v1/whatsapp/conversations/${conversationId}/messages`,
      authorization: 'Bearer contract-smoke-token',
      contentType: 'application/json',
      body: command,
    });
  });
});
