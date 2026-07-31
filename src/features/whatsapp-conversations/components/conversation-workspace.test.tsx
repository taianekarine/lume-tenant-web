import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  closeWhatsAppConversationAction,
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
  closeWhatsAppConversationAction: jest.fn(),
  forwardWhatsAppConversationAction: jest.fn(),
  markWhatsAppConversationAsReadAction: jest.fn(),
  returnWhatsAppConversationToBotAction: jest.fn(),
  sendHumanWhatsAppMessageAction: jest.fn(),
  takeOverWhatsAppConversationAction: jest.fn(),
}));

const mockedForward = jest.mocked(forwardWhatsAppConversationAction);
const mockedClose = jest.mocked(closeWhatsAppConversationAction);
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

async function openMessages(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Mensagens e anexos/ }));
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

  it('keeps the selected contact identity and last interaction in a compact responsive row', () => {
    const conversation = createWhatsAppConversationFixture({
      contact: {
        id: '00000000-0000-4000-8000-000000000301',
        name: 'Taiane Karine',
        phone: '553496305110',
        profilePictureUrl: null,
      },
      lastMessageAt: '2026-07-29T19:50:00.000Z',
    });
    mockFetchDetail(conversation);

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    const contactHeading = screen.getByRole('heading', {
      level: 3,
      name: 'Taiane Karine',
    });
    const identityRow = contactHeading.parentElement;
    const detailHeader = contactHeading.closest('header');

    expect(identityRow).toHaveClass('flex', 'flex-col', 'items-start');
    expect(detailHeader).toHaveClass('px-4', 'py-2', 'bg-emerald-50/70');
    expect(screen.getAllByText('553496305110')).toHaveLength(2);
    expect(screen.getByText(/Última interação: 29\/07\/2026, 16:50/)).toBeInTheDocument();
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
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[summary]} />);

    expect(screen.getAllByText('Departamento')).toHaveLength(2);
    expect(screen.getByText('Estado da conversa')).toBeInTheDocument();
    expect(screen.getByText('Etapa do fluxo')).toBeInTheDocument();
    expect(screen.getAllByText('Status comercial')).toHaveLength(2);
    expect(screen.getByText('Bot autorizado')).toBeInTheDocument();
    expect(
      screen.getByText('Segundo contato retomado no acompanhamento comercial.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Orçamentos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lista de orçamentos' })).toBeInTheDocument();
    expect(screen.queryByText('Resumo confirmado')).not.toBeInTheDocument();
    await openMessages(user);
    expect(await screen.findByText('proposta.pdf')).toBeInTheDocument();
    expect(screen.getByText(/· Falha no envio$/)).toBeInTheDocument();
    expect(screen.getByText('Evolution não respondeu.')).toBeInTheDocument();
    expect(screen.queryByText(/PROVIDER_TIMEOUT/)).not.toBeInTheDocument();
    expect(screen.queryByText('Dados adicionais confirmados')).not.toBeInTheDocument();
    expect(screen.queryByText('Auditoria essencial')).not.toBeInTheDocument();
    expect(screen.queryByText('confirm-quote')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      'https://files.example.test/proposta.pdf',
    );
  });

  it('renders WhatsApp media inline without treating it as text', async () => {
    const summary = createWhatsAppConversationFixture({ messages: [] });
    const media = [
      {
        id: '00000000-0000-4000-8000-000000000511',
        kind: 'image' as const,
        url: 'https://files.example.test/imagem.jpg',
        mimeType: 'image/jpeg',
        fileName: 'imagem.jpg',
      },
      {
        id: '00000000-0000-4000-8000-000000000512',
        kind: 'video' as const,
        url: 'https://files.example.test/video.mp4',
        mimeType: 'video/mp4',
        fileName: 'video.mp4',
      },
      {
        id: '00000000-0000-4000-8000-000000000513',
        kind: 'audio' as const,
        url: 'https://files.example.test/audio.ogg',
        mimeType: 'audio/ogg',
        fileName: 'audio.ogg',
      },
      {
        id: '00000000-0000-4000-8000-000000000514',
        kind: 'document' as const,
        url: 'https://files.example.test/arquivo.pdf',
        mimeType: 'application/pdf',
        fileName: 'arquivo.pdf',
      },
      {
        id: '00000000-0000-4000-8000-000000000515',
        kind: 'sticker' as const,
        url: 'https://files.example.test/figurinha.webp',
        mimeType: 'image/webp',
        fileName: 'figurinha.webp',
      },
    ];
    const detail = createWhatsAppConversationFixture({
      ...summary,
      messages: media.map((item, index) => ({
        id: item.id,
        direction: 'inbound',
        deliveryStatus: 'delivered',
        kind: item.kind,
        text: null,
        attachment: {
          mimeType: item.mimeType,
          size: 1_024 + index,
          url: item.url,
          fileName: item.fileName,
          metadata: {},
        },
        occurredAt: `2026-07-30T1${index}:00:00.000Z`,
        attempts: [],
      })),
    });
    mockFetchDetail(detail);
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[summary]} />);
    await openMessages(user);

    expect(await screen.findByAltText('imagem.jpg')).toHaveAttribute(
      'src',
      'https://files.example.test/imagem.jpg',
    );
    expect(screen.getByAltText('Figurinha recebida')).toHaveAttribute(
      'src',
      'https://files.example.test/figurinha.webp',
    );
    expect(screen.getByLabelText('video.mp4')).toHaveAttribute('controls');
    expect(screen.getByLabelText('audio.ogg')).toHaveAttribute('controls');
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      'https://files.example.test/arquivo.pdf',
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
    expect(await screen.findByText('Atendimento assumido com sucesso.')).toBeInTheDocument();
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

  it('does not allow a second take-over and enables return when an attendant is already assigned', () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'sent-to-human',
      flowStep: 'human-service',
      assignedTo: { id: 'employee-002', name: 'Outro atendente' },
      unreadCount: 0,
    });
    mockFetchDetail(conversation);

    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId="employee-001" />,
    );

    expect(screen.getByRole('button', { name: 'Assumir' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Devolver ao bot' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Marcar como lid[ao]/i })).not.toBeInTheDocument();
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
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Assumir' }));

    expect(await screen.findByText('Conflito: atendimento recarregado.')).toBeInTheDocument();
    expect(await screen.findByText('Responsável: Outro atendente')).toBeInTheDocument();
    expect(screen.getAllByText('Bot bloqueado')).toHaveLength(1);
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

  it('exibe rótulos legíveis e somente os nove departamentos do MVP nos filtros', async () => {
    const conversation = createWhatsAppConversationFixture({
      department: 'personnel-department',
      requestStatus: 'not-started',
      currentQuoteRequest: null,
      unreadCount: 0,
    });
    mockFetchDetail(conversation);
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    expect(screen.queryByText('personnel-department')).not.toBeInTheDocument();
    const departmentFilter = screen.getByRole('combobox', { name: 'Departamento' });
    expect(departmentFilter).toHaveTextContent('Todos');
    await user.click(departmentFilter);

    expect(await screen.findAllByRole('option')).toHaveLength(10);
    expect(await screen.findByRole('option', { name: 'Departamento Pessoal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Operacional' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Recursos Humanos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Limpeza' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Tecnologia da Informação' }),
    ).not.toBeInTheDocument();
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
    await openMessages(user);

    expect(await screen.findByText('Carregando histórico completo...')).toBeInTheDocument();
    await act(async () => {
      resolveFirstRequest?.(response({ message: 'Falha temporária.' }, 503));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.');

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Nenhuma mensagem registrada')).toBeInTheDocument();
  });

  it('abre o Message com largura dobrada no desktop e sem rolagem horizontal', async () => {
    const conversation = createWhatsAppConversationFixture({ messages: [], unreadCount: 0 });
    mockFetchDetail(conversation);
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);
    await openMessages(user);

    const messageSheet = screen.getByRole('dialog');
    expect(messageSheet).toHaveClass(
      'w-full',
      'overflow-x-hidden',
      'data-[side=right]:w-full',
      'sm:data-[side=right]:w-[min(84rem,calc(100vw-2rem))]',
      'sm:max-w-none',
    );
    expect(messageSheet).not.toHaveClass('sm:max-w-2xl');
  });

  it('mantém o encerramento indisponível enquanto existe proposta em andamento', async () => {
    const conversation = createWhatsAppConversationFixture({ unreadCount: 0 });
    mockFetchDetail(conversation);
    render(<ConversationWorkspace initialConversations={[conversation]} />);

    expect(screen.getByRole('button', { name: 'Encerrar' })).toBeDisabled();
    expect(mockedForward).not.toHaveBeenCalled();
    expect(mockedMarkAsRead).not.toHaveBeenCalled();
  });

  it('confirma e encerra um atendimento cuja proposta foi recusada', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      requestStatus: 'rejected',
      unreadCount: 0,
      version: 6,
    });
    const closed = createWhatsAppConversationFixture({
      ...conversation,
      conversationState: 'closed',
      flowStep: 'closed',
      assignedTo: null,
      closedAt: '2026-07-28T12:00:00.000Z',
      version: 7,
    });
    mockFetchDetail(conversation);
    mockedClose.mockResolvedValue({ success: true, conversation: closed });
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    await user.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Quando o cliente enviar uma nova mensagem, o bot iniciará outro atendimento',
    );
    const confirmButton = screen.getByRole('button', { name: 'Confirmar encerramento' });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo do encerramento/ }), {
      target: { value: 'Cliente recusou o valor da proposta.' },
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockedClose).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: 6,
        reason: 'Cliente recusou o valor da proposta.',
      });
    });
    expect(
      await screen.findByText(/Atendimento encerrado\. O próximo contato/),
    ).toBeInTheDocument();
  });

  it('permite encerrar uma conversa sem proposta em andamento', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      requestStatus: 'not-started',
      currentQuoteRequest: null,
      unreadCount: 0,
      version: 4,
    });
    const closed = createWhatsAppConversationFixture({
      ...conversation,
      conversationState: 'closed',
      flowStep: 'closed',
      assignedTo: null,
      closedAt: '2026-07-28T13:00:00.000Z',
      version: 5,
    });
    mockFetchDetail(conversation);
    mockedClose.mockResolvedValue({ success: true, conversation: closed });
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    const closeButton = screen.getByRole('button', { name: 'Encerrar' });
    expect(closeButton).toBeEnabled();
    await user.click(closeButton);
    await user.click(screen.getByRole('button', { name: 'Confirmar encerramento' }));

    await waitFor(() => {
      expect(mockedClose).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: 4,
        reason: undefined,
      });
    });
  });

  it('permite ao painel comercial encerrar atendimento encaminhado a outro departamento', async () => {
    const conversation = createWhatsAppConversationFixture({
      department: 'operations',
      conversationState: 'sent-to-human',
      flowStep: 'human-service',
      requestStatus: 'not-started',
      currentQuoteRequest: null,
      unreadCount: 0,
      version: 10,
    });
    const closed = createWhatsAppConversationFixture({
      ...conversation,
      conversationState: 'closed',
      flowStep: 'closed',
      closedAt: '2026-07-31T16:00:00.000Z',
      version: 11,
    });
    mockFetchDetail(conversation);
    mockedClose.mockResolvedValue({ success: true, conversation: closed });
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    const closeButton = screen.getByRole('button', { name: 'Encerrar' });
    expect(closeButton).toBeEnabled();
    await user.click(closeButton);
    await user.click(screen.getByRole('button', { name: 'Confirmar encerramento' }));

    await waitFor(() => {
      expect(mockedClose).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: 10,
        reason: undefined,
      });
    });
  });

  it('permite encerrar no MVP mesmo quando existe proposta aprovada', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      requestStatus: 'approved',
      hasApprovedQuoteRequest: true,
      unreadCount: 0,
      version: 8,
    });
    const closed = createWhatsAppConversationFixture({
      ...conversation,
      conversationState: 'closed',
      flowStep: 'closed',
      assignedTo: null,
      closedAt: '2026-07-29T13:00:00.000Z',
      version: 9,
    });
    mockFetchDetail(conversation);
    mockedClose.mockResolvedValue({ success: true, conversation: closed });
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    const closeButton = screen.getByRole('button', { name: 'Encerrar' });
    expect(closeButton).toBeEnabled();
    await user.click(closeButton);
    await user.click(screen.getByRole('button', { name: 'Confirmar encerramento' }));

    await waitFor(() => {
      expect(mockedClose).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: 8,
        reason: undefined,
      });
    });
  });

  it('mantém o estado autoritativo quando a API recusa o encerramento aprovado', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      requestStatus: 'approved',
      hasApprovedQuoteRequest: true,
      unreadCount: 0,
      version: 8,
    });
    mockFetchDetail(conversation);
    mockedClose.mockResolvedValue({
      success: false,
      code: 'conflict',
      message: 'A Tenant API recusou o encerramento.',
      conversation,
    });
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    await user.click(screen.getByRole('button', { name: 'Encerrar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar encerramento' }));

    expect(await screen.findAllByText('A Tenant API recusou o encerramento.')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Confirmar encerramento' })).toBeInTheDocument();
    expect(screen.queryByText(/Atendimento encerrado\. O próximo contato/)).not.toBeInTheDocument();
  });

  it('exibe data, responsável e motivo no histórico de encerramentos', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'closed',
      flowStep: 'closed',
      requestStatus: 'rejected',
      closedAt: '2026-07-28T13:00:00.000Z',
      unreadCount: 0,
      transitions: [
        {
          id: '00000000-0000-4000-8000-000000000911',
          commandId: '00000000-0000-4000-8000-000000000912',
          name: 'close',
          expectedVersion: 7,
          resultingVersion: 8,
          actorType: 'user',
          actorUserId: '00000000-0000-4000-8000-000000000913',
          actor: {
            type: 'user',
            user: {
              id: '00000000-0000-4000-8000-000000000913',
              name: 'Maria Atendente',
            },
          },
          from: {
            department: 'commercial',
            conversationState: 'human-active',
            flowStep: 'human-service',
            requestStatus: 'rejected',
          },
          to: {
            department: 'commercial',
            conversationState: 'closed',
            flowStep: 'closed',
            requestStatus: 'rejected',
          },
          metadata: { reason: 'Cliente recusou o valor.' },
          createdAt: '2026-07-28T13:00:00.000Z',
        },
      ],
    });
    mockFetchDetail(conversation);

    const user = userEvent.setup();
    render(<ConversationWorkspace initialConversations={[conversation]} />);

    expect(screen.getByText('Encerrado por: Maria Atendente')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Histórico de ações' }));
    expect(
      screen.getByRole('heading', { name: 'Histórico de ações da conversa' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Atendimento encerrado')).toBeInTheDocument();
    expect(screen.getByText('Maria Atendente')).toBeInTheDocument();
    expect(screen.getByText('Cliente recusou o valor.')).toBeInTheDocument();
    expect(screen.getByText(/28\/07\/2026/)).toBeInTheDocument();
  });

  it('never offers the current department as a forwarding destination', async () => {
    const conversation = createWhatsAppConversationFixture({
      department: 'commercial',
      unreadCount: 0,
    });
    const forwarded = createWhatsAppConversationFixture({
      ...conversation,
      department: 'operations',
      conversationState: 'sent-to-human',
      version: 4,
    });
    mockFetchDetail(conversation);
    mockedForward.mockResolvedValue({ success: true, conversation: forwarded });
    const user = userEvent.setup();

    render(<ConversationWorkspace initialConversations={[conversation]} />);

    await user.click(screen.getByRole('button', { name: 'Encaminhar' }));
    const destination = screen.getByRole('combobox', { name: 'Departamento de destino' });
    await user.click(destination);
    const operationsOption = await screen.findByRole('option', { name: /Opera/ });
    expect(screen.queryByRole('option', { name: 'Comercial' })).not.toBeInTheDocument();
    await user.click(operationsOption);
    await user.click(screen.getByRole('button', { name: 'Confirmar encaminhamento' }));

    await waitFor(() => {
      expect(mockedForward).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: conversation.version,
        targetDepartment: 'operations',
      });
    });
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
    await openMessages(user);
    await screen.findByText('Nenhuma mensagem registrada');

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
    expect(screen.getByText(/· Envio pendente$/)).toBeInTheDocument();
    expect(
      screen.getAllByText('Mensagem registrada. Aguardando confirmação de envio pelo provedor.'),
    ).not.toHaveLength(0);
    expect(input).toHaveValue('');
  });

  it('sends through main Enter and numpad Enter while preserving Shift+Enter for a new line', async () => {
    const assignedTo = { id: 'employee-001', name: 'Usuário Comercial' };
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'human-active',
      flowStep: 'human-service',
      assignedTo,
      version: 8,
      unreadCount: 0,
      messages: [],
    });
    const firstMessage = {
      id: '00000000-0000-4000-8000-000000000721',
      direction: 'outbound' as const,
      deliveryStatus: 'pending' as const,
      kind: 'text' as const,
      text: 'Mensagem pelo Enter',
      attachment: null,
      sentBy: assignedTo,
      occurredAt: '2026-07-28T22:47:00.000Z',
      attempts: [],
    };
    const secondMessage = {
      ...firstMessage,
      id: '00000000-0000-4000-8000-000000000722',
      text: 'Mensagem pelo numpad',
      occurredAt: '2026-07-28T22:48:00.000Z',
    };
    const firstUpdated = createWhatsAppConversationFixture({
      ...conversation,
      version: 9,
      messages: [firstMessage],
    });
    const secondUpdated = createWhatsAppConversationFixture({
      ...conversation,
      version: 10,
      messages: [firstMessage, secondMessage],
    });
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(response({ conversation }))
      .mockResolvedValue(response({ conversation: secondUpdated }));
    mockedSendMessage
      .mockResolvedValueOnce({
        success: true,
        conversation: firstUpdated,
        message: firstMessage,
      })
      .mockResolvedValueOnce({
        success: true,
        conversation: secondUpdated,
        message: secondMessage,
      });
    const user = userEvent.setup();
    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId={assignedTo.id} />,
    );
    await openMessages(user);
    const input = screen.getByRole('textbox', {
      name: `Mensagem para ${conversation.contact.name}`,
    });

    await user.type(input, firstMessage.text);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(mockedSendMessage).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(mockedSendMessage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(input).toBeEnabled());

    await user.type(input, secondMessage.text);
    fireEvent.keyDown(input, { key: 'Enter', code: 'NumpadEnter' });
    await waitFor(() => expect(mockedSendMessage).toHaveBeenCalledTimes(2));
    const firstMetadata = await screen.findByText(
      '28/07/2026, 19:47 · Usuário Comercial · Envio pendente',
    );
    expect(firstMetadata).toHaveClass(
      'w-full',
      'min-w-0',
      'max-w-full',
      'whitespace-normal',
      'break-words',
      'text-center',
      '[overflow-wrap:anywhere]',
    );
    expect(firstMetadata).not.toHaveClass('min-w-max', 'whitespace-nowrap');
    expect(firstMetadata.parentElement).toHaveClass(
      'w-full',
      'max-w-full',
      'min-w-0',
      'justify-center',
    );
    expect(firstMetadata.parentElement).not.toHaveClass('overflow-x-auto', 'whitespace-nowrap');
    expect(
      await screen.findByText('28/07/2026, 19:48 · Usuário Comercial · Envio pendente'),
    ).toBeInTheDocument();
  });

  it('allows an unassigned conversation to be taken over inside Message', async () => {
    const conversation = createWhatsAppConversationFixture({
      conversationState: 'sent-to-human',
      flowStep: 'human-service',
      assignedTo: null,
      unreadCount: 0,
    });
    const updated = createWhatsAppConversationFixture({
      ...conversation,
      conversationState: 'human-active',
      assignedTo: { id: 'employee-001', name: 'Usuário Comercial' },
      version: conversation.version + 1,
    });
    mockFetchDetail(conversation);
    mockedTakeOver.mockResolvedValue({ success: true, conversation: updated });
    const user = userEvent.setup();
    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId="employee-001" />,
    );
    await openMessages(user);
    const characterCounter = screen.getByText(/0\s*\/\s*10\.000 caracteres/);
    const takeOverButton = screen.getByRole('button', { name: 'Assumir atendimento' });
    const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' });
    const actions = takeOverButton.parentElement;

    expect(characterCounter).toHaveClass('whitespace-nowrap');
    expect(actions).toBe(sendButton.parentElement);
    expect(actions).toHaveClass(
      'grid',
      'w-full',
      'min-w-0',
      'max-w-full',
      'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
      'overflow-x-hidden',
    );
    expect(takeOverButton).toHaveClass('w-full', 'min-w-0', 'max-w-full', 'overflow-hidden');
    expect(sendButton).toHaveClass('w-full', 'min-w-0', 'max-w-full', 'overflow-hidden');

    await user.click(takeOverButton);

    await waitFor(() =>
      expect(mockedTakeOver).toHaveBeenCalledWith({
        conversationId: conversation.id,
        expectedVersion: conversation.version,
      }),
    );
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
    await openMessages(user);
    const input = screen.getByRole('textbox', {
      name: `Mensagem para ${conversation.contact.name}`,
    });
    await user.type(input, 'Rascunho importante');

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findAllByText('Conflito: o rascunho foi preservado.')).not.toHaveLength(0);
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
    expect(await screen.findAllByText('Falha temporária; tente novamente.')).not.toHaveLength(0);
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
    await openMessages(user);
    await screen.findByText('Nenhuma mensagem registrada');

    const input = screen.getByRole('textbox', {
      name: `Mensagem para ${conversation.contact.name}`,
    });
    await user.type(input, 'Mensagem com confirmação incerta');
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(
      await screen.findAllByText('A resposta da API se perdeu; o resultado é incerto.'),
    ).not.toHaveLength(0);

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
    await openMessages(user);

    expect(await screen.findByText(/· Envio pendente$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText(/· Falha no envio$/)).toBeInTheDocument();
    expect(screen.getByText('Evolution indisponível.')).toBeInTheDocument();
    expect(screen.queryByText(/EVOLUTION_UNAVAILABLE/)).not.toBeInTheDocument();
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
    const user = userEvent.setup();
    render(
      <ConversationWorkspace initialConversations={[conversation]} currentUserId="employee-001" />,
    );
    await openMessages(user);

    expect(
      screen.getByRole('textbox', { name: `Mensagem para ${conversation.contact.name}` }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
    expect(screen.getByText('Assuma esta conversa para responder ao cliente.')).toBeInTheDocument();
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
