import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  forwardWhatsAppConversationAction,
  markWhatsAppConversationAsReadAction,
  returnWhatsAppConversationToBotAction,
  sendHumanWhatsAppMessageAction,
  takeOverWhatsAppConversationAction,
} from '../actions';
import type { WhatsAppConversation } from '../domain';
import { createWhatsAppConversationFixture } from '../testing/whatsapp-conversation-fixture';
import { ConversationWorkspace } from './conversation-workspace';

jest.mock('../actions', () => ({
  forwardWhatsAppConversationAction: jest.fn(),
  markWhatsAppConversationAsReadAction: jest.fn(),
  returnWhatsAppConversationToBotAction: jest.fn(),
  sendHumanWhatsAppMessageAction: jest.fn(),
  takeOverWhatsAppConversationAction: jest.fn(),
}));

const mockedForward = jest.mocked(forwardWhatsAppConversationAction);
const mockedMarkAsRead = jest.mocked(markWhatsAppConversationAsReadAction);
const mockedReturnToBot = jest.mocked(returnWhatsAppConversationToBotAction);
const mockedSendMessage = jest.mocked(sendHumanWhatsAppMessageAction);
const mockedTakeOver = jest.mocked(takeOverWhatsAppConversationAction);
const originalFetch = global.fetch;

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function mockFetchDetail(conversation: WhatsAppConversation) {
  return jest.mocked(global.fetch).mockResolvedValue(response({ conversation }));
}

describe('ConversationWorkspace', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    global.fetch = originalFetch;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('shows canonical dimensions, bot blocking, confirmed quote, second contact and complete history', async () => {
    const summary = createWhatsAppConversationFixture({
      conversationState: 'bot-active',
      flowStep: 'commercial-follow-up-menu',
      requestStatus: 'under-review',
      messages: [],
    });
    const detail = createWhatsAppConversationFixture({
      ...summary,
      messages: [
        {
          id: '00000000-0000-4000-8000-000000000501',
          direction: 'outbound',
          deliveryStatus: 'failed',
          kind: 'document',
          text: 'Segue a proposta.',
          attachment: {
            mimeType: 'application/pdf',
            size: 2048,
            url: 'https://files.example.test/proposta.pdf',
            fileName: 'proposta.pdf',
            metadata: {},
          },
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
        },
      ],
      transitions: [
        {
          id: '00000000-0000-4000-8000-000000000901',
          commandId: '00000000-0000-4000-8000-000000000902',
          name: 'confirm-quote',
          expectedVersion: 7,
          resultingVersion: 8,
          actorType: 'service',
          actorUserId: null,
          from: {
            department: 'commercial',
            conversationState: 'waiting-for-customer',
            flowStep: 'quote-summary-confirmation',
            requestStatus: 'waiting-for-customer',
          },
          to: {
            department: 'commercial',
            conversationState: 'bot-active',
            flowStep: 'commercial-follow-up-menu',
            requestStatus: 'under-review',
          },
          metadata: {},
          createdAt: '2026-07-21T13:44:00.000Z',
        },
      ],
    });
    mockFetchDetail(detail);

    render(<ConversationWorkspace initialConversations={[summary]} />);

    expect(screen.getAllByText('Departamento')).toHaveLength(2);
    expect(screen.getByText('Estado da conversa')).toBeInTheDocument();
    expect(screen.getByText('Etapa do fluxo')).toBeInTheDocument();
    expect(screen.getAllByText('Status da solicitação')).toHaveLength(2);
    expect(screen.getByText('Bot autorizado')).toBeInTheDocument();
    expect(
      screen.getByText('Segundo contato retomado no acompanhamento comercial.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Resumo confirmado')).toBeInTheDocument();
    expect(await screen.findByText('proposta.pdf')).toBeInTheDocument();
    expect(screen.getByText('Falha no envio')).toBeInTheDocument();
    expect(screen.getByText(/PROVIDER_TIMEOUT/)).toBeInTheDocument();
    expect(screen.getByText('confirm-quote')).toBeInTheDocument();
    expect(screen.getByText('versão 7 → 8')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir anexo' })).toHaveAttribute(
      'href',
      'https://files.example.test/proposta.pdf',
    );
  });

  it('sends expectedVersion when taking over and reloads after success', async () => {
    const conversation = createWhatsAppConversationFixture({ unreadCount: 0 });
    const updated = createWhatsAppConversationFixture({
      unreadCount: 0,
      conversationState: 'human-active',
      flowStep: 'human-service',
      version: 4,
      assignedTo: { id: 'employee-001', name: 'Usuário Comercial' },
    });
    mockFetchDetail(conversation);
    mockedTakeOver.mockResolvedValue({ success: true, conversation: updated });
    const user = userEvent.setup();
    render(<ConversationWorkspace initialConversations={[conversation]} />);

    await user.click(screen.getByRole('button', { name: 'Assumir' }));

    await waitFor(() => {
      expect(mockedTakeOver).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: 3,
      });
    });
    expect(await screen.findByText('Atendimento humano assumido com sucesso.')).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it('uses the dedicated return-to-bot operation with the current version', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      version: 8,
      unreadCount: 0,
    });
    const returned = createWhatsAppConversationFixture({
      conversationState: 'bot-active',
      flowStep: 'commercial-follow-up-menu',
      version: 9,
      unreadCount: 0,
    });
    mockFetchDetail(conversation);
    mockedReturnToBot.mockResolvedValue({ success: true, conversation: returned });
    const user = userEvent.setup();
    render(<ConversationWorkspace initialConversations={[conversation]} />);

    await user.click(screen.getByRole('button', { name: 'Devolver ao bot' }));

    await waitFor(() => {
      expect(mockedReturnToBot).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: 8,
      });
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it('shows a conflict and replaces stale state with the reloaded conversation', async () => {
    const conversation = createWhatsAppConversationFixture({
      unreadCount: 0,
      version: 3,
    });
    const latest = createWhatsAppConversationFixture({
      unreadCount: 0,
      version: 4,
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo: { id: 'employee-002', name: 'Outro atendente' },
    });
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(response({ conversation }))
      .mockResolvedValue(response({ conversation: latest }));
    mockedTakeOver.mockResolvedValue({
      success: false,
      code: 'conflict',
      message: 'Conflito: atendimento recarregado.',
      conversation: latest,
    });
    const user = userEvent.setup();
    render(<ConversationWorkspace initialConversations={[conversation]} />);
    await screen.findByText('Esta conversa ainda não possui mensagens persistidas.');

    await user.click(screen.getByRole('button', { name: 'Assumir' }));

    expect(await screen.findByText('Conflito: atendimento recarregado.')).toBeInTheDocument();
    expect(await screen.findByText('Responsável: Outro atendente')).toBeInTheDocument();
    expect(screen.getAllByText('Bot bloqueado')).toHaveLength(2);
  });

  it('renders empty and initial error states and retries the list request', async () => {
    jest
      .mocked(global.fetch)
      .mockResolvedValue(response({ conversations: [createWhatsAppConversationFixture()] }));
    const user = userEvent.setup();
    render(
      <ConversationWorkspace initialConversations={[]} initialError="Tenant API indisponível." />,
    );

    expect(screen.getByText('Nenhuma conversa encontrada')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Tenant API indisponível.');

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Ana Paula')).toBeInTheDocument();
  });

  it('shows detail loading, error and retry without inventing data', async () => {
    const conversation = createWhatsAppConversationFixture({ messages: [] });
    let resolveFirstRequest: ((value: Response) => void) | undefined;
    jest
      .mocked(global.fetch)
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveFirstRequest = resolve;
          }),
      )
      .mockResolvedValueOnce(response({ conversation }));
    const user = userEvent.setup();
    render(<ConversationWorkspace initialConversations={[conversation]} />);

    expect(await screen.findByText('Carregando histórico completo...')).toBeInTheDocument();
    await act(async () => {
      resolveFirstRequest?.(response({ message: 'Falha temporária.' }, 503));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.');

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByText('Esta conversa ainda não possui mensagens persistidas.'),
    ).toBeInTheDocument();
  });

  it('keeps unsupported waiting, close and cancel actions disabled', async () => {
    const conversation = createWhatsAppConversationFixture({ unreadCount: 0 });
    mockFetchDetail(conversation);
    render(<ConversationWorkspace initialConversations={[conversation]} />);
    await screen.findByText('Esta conversa ainda não possui mensagens persistidas.');

    expect(screen.getByRole('button', { name: 'Aguardar cliente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(mockedForward).not.toHaveBeenCalled();
    expect(mockedMarkAsRead).not.toHaveBeenCalled();
  });

  it('sends a human message with optimistic version and shows its pending state', async () => {
    const assignedTo = { id: 'employee-001', name: 'Usuário Comercial' };
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo,
      version: 8,
      unreadCount: 0,
      messages: [],
    });
    const message = {
      id: '00000000-0000-4000-8000-000000000701',
      direction: 'outbound' as const,
      deliveryStatus: 'pending' as const,
      kind: 'text' as const,
      text: 'Seu orçamento está em análise.',
      attachment: null,
      occurredAt: '2026-07-26T12:00:00.000Z',
      attempts: [],
    };
    const updated = createWhatsAppConversationFixture({
      ...conversation,
      version: 9,
      lastMessagePreview: message.text,
      lastMessageAt: message.occurredAt,
      lastOutboundAt: message.occurredAt,
      messages: [message],
    });
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(response({ conversation }))
      .mockResolvedValue(response({ conversation: updated }));
    mockedSendMessage.mockResolvedValue({
      success: true,
      conversation: { ...updated, messages: [] },
      message,
    });
    const user = userEvent.setup();
    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId={assignedTo.id} />,
    );
    await screen.findByText('Esta conversa ainda não possui mensagens persistidas.');

    const input = screen.getByRole('textbox', {
      name: `Mensagem para ${conversation.contact.name}`,
    });
    await user.type(input, message.text);
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() => {
      expect(mockedSendMessage).toHaveBeenCalledWith({
        conversationId: conversation.id,
        commandId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
        expectedVersion: 8,
        text: message.text,
      });
    });
    expect(await screen.findAllByText(message.text)).toHaveLength(2);
    expect(screen.getByText('Envio pendente')).toBeInTheDocument();
    expect(
      screen.getByText('Mensagem registrada. Aguardando confirmação de envio pelo provedor.'),
    ).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('preserves the draft and idempotency identifiers after a send conflict', async () => {
    const assignedTo = { id: 'employee-001', name: 'Usuário Comercial' };
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo,
      version: 4,
      unreadCount: 0,
    });
    const latest = createWhatsAppConversationFixture({
      ...conversation,
      assignedTo,
      version: 5,
    });
    mockFetchDetail(latest);
    mockedSendMessage
      .mockResolvedValueOnce({
        success: false,
        code: 'conflict',
        message: 'Conflito: o rascunho foi preservado.',
        conversation: latest,
      })
      .mockResolvedValueOnce({
        success: false,
        code: 'service-unavailable',
        message: 'Falha temporária; tente novamente.',
      });
    const user = userEvent.setup();
    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId={assignedTo.id} />,
    );
    const input = screen.getByRole('textbox', {
      name: `Mensagem para ${conversation.contact.name}`,
    });
    await user.type(input, 'Rascunho importante');

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText('Conflito: o rascunho foi preservado.')).toBeInTheDocument();
    expect(input).toHaveValue('Rascunho importante');

    const firstInput = mockedSendMessage.mock.calls[0][0];
    const retryButton = await screen.findByRole('button', { name: 'Enviar mensagem' });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await user.click(retryButton);
    await waitFor(() => expect(mockedSendMessage).toHaveBeenCalledTimes(2));
    const secondInput = mockedSendMessage.mock.calls[1][0];

    expect(secondInput).toMatchObject({
      commandId: firstInput.commandId,
      idempotencyKey: firstInput.idempotencyKey,
      expectedVersion: 5,
      text: firstInput.text,
    });
    expect(input).toHaveValue('Rascunho importante');
    expect(await screen.findByText('Falha temporária; tente novamente.')).toBeInTheDocument();
  });

  it('preserves the original version after an ambiguous send failure', async () => {
    const assignedTo = { id: 'employee-001', name: 'Usuário Comercial' };
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo,
      version: 8,
      unreadCount: 0,
      messages: [],
    });
    const polledConversation = createWhatsAppConversationFixture({
      ...conversation,
      version: 9,
      updatedAt: '2026-07-26T12:05:00.000Z',
    });
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(response({ conversation }))
      .mockResolvedValueOnce(response({ conversations: [polledConversation] }))
      .mockResolvedValueOnce(response({ conversation: polledConversation }));
    mockedSendMessage
      .mockResolvedValueOnce({
        success: false,
        code: 'service-unavailable',
        message: 'A resposta da API se perdeu; o resultado é incerto.',
      })
      .mockResolvedValueOnce({
        success: false,
        code: 'service-unavailable',
        message: 'Falha temporária.',
      });
    const user = userEvent.setup();
    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId={assignedTo.id} />,
    );
    await screen.findByText('Esta conversa ainda não possui mensagens persistidas.');

    const input = screen.getByRole('textbox', {
      name: `Mensagem para ${conversation.contact.name}`,
    });
    await user.type(input, 'Mensagem com confirmação incerta');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(
      await screen.findByText('A resposta da API se perdeu; o resultado é incerto.'),
    ).toBeInTheDocument();

    const firstInput = mockedSendMessage.mock.calls[0][0];
    await user.click(screen.getByRole('button', { name: 'Atualizar' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await waitFor(() => expect(mockedSendMessage).toHaveBeenCalledTimes(2));

    expect(mockedSendMessage.mock.calls[1][0]).toMatchObject({
      commandId: firstInput.commandId,
      idempotencyKey: firstInput.idempotencyKey,
      expectedVersion: 8,
      text: firstInput.text,
    });
  });

  it('refreshes a pending delivery even when the conversation version did not change', async () => {
    const pendingMessage = {
      id: '00000000-0000-4000-8000-000000000711',
      direction: 'outbound' as const,
      deliveryStatus: 'pending' as const,
      kind: 'text' as const,
      text: 'Mensagem aguardando Evolution.',
      attachment: null,
      occurredAt: '2026-07-26T12:00:00.000Z',
      attempts: [],
    };
    const failedMessage = {
      ...pendingMessage,
      deliveryStatus: 'failed' as const,
      attempts: [
        {
          id: '00000000-0000-4000-8000-000000000712',
          attemptNumber: 1,
          status: 'failed' as const,
          providerMessageId: null,
          errorCode: 'EVOLUTION_UNAVAILABLE',
          errorMessage: 'Evolution indisponível.',
          startedAt: '2026-07-26T12:00:00.000Z',
          completedAt: '2026-07-26T12:00:05.000Z',
        },
      ],
    };
    const summary = createWhatsAppConversationFixture({
      unreadCount: 0,
      version: 8,
      messages: [],
    });
    const pendingDetail = createWhatsAppConversationFixture({
      ...summary,
      messages: [pendingMessage],
    });
    const failedDetail = createWhatsAppConversationFixture({
      ...summary,
      messages: [failedMessage],
    });
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(response({ conversation: pendingDetail }))
      .mockResolvedValueOnce(response({ conversations: [summary] }))
      .mockResolvedValueOnce(response({ conversation: failedDetail }));
    const user = userEvent.setup();
    render(<ConversationWorkspace initialConversations={[summary]} />);

    expect(await screen.findByText('Envio pendente')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('Falha no envio')).toBeInTheDocument();
    expect(screen.getByText(/EVOLUTION_UNAVAILABLE/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('blocks the composer until the current user owns a human-active conversation', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo: { id: 'employee-002', name: 'Outro atendente' },
      unreadCount: 0,
    });
    mockFetchDetail(conversation);
    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId="employee-001" />,
    );

    expect(
      screen.getByRole('textbox', { name: `Mensagem para ${conversation.contact.name}` }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
    expect(
      screen.getByText('Somente o atendente responsável pode responder nesta conversa.'),
    ).toBeInTheDocument();
  });

  it('polls only when visible and applies backoff after a failure', async () => {
    jest.useFakeTimers();
    const conversation = createWhatsAppConversationFixture({
      unreadCount: 0,
      messages: [],
    });
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(response({ conversation }))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(response({ conversations: [conversation] }));
    render(<ConversationWorkspace initialConversations={[conversation]} />);

    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(4_000);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(7_999);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    await act(async () => {
      jest.advanceTimersByTime(4_000);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});
