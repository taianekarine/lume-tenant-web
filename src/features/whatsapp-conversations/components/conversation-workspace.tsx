'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  AlertCircle,
  Bot,
  Building2,
  CheckCheck,
  CircleStop,
  Clock3,
  FileText,
  Forward,
  Headset,
  Inbox,
  LoaderCircle,
  MessageSquareWarning,
  Paperclip,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  UserRound,
} from 'lucide-react';

import {
  forwardWhatsAppConversationAction,
  markWhatsAppConversationAsReadAction,
  returnWhatsAppConversationToBotAction,
  sendHumanWhatsAppMessageAction,
  takeOverWhatsAppConversationAction,
  type SendHumanWhatsAppMessageActionResult,
  type WhatsAppConversationActionResult,
} from '../actions';
import { HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH } from '../application';
import {
  canForwardWhatsAppConversation,
  canMarkWhatsAppConversationAsRead,
  canReturnWhatsAppConversationToBot,
  canSendHumanWhatsAppMessage,
  canTakeOverWhatsAppConversation,
  isWhatsAppAwaitingProposal,
  isWhatsAppBotBlocked,
  isWhatsAppConversationDepartment,
  isWhatsAppHumanActive,
  isWhatsAppQuoteSummaryConfirmed,
  WHATSAPP_CONVERSATION_DEPARTMENTS,
  WHATSAPP_REQUEST_STATUSES,
  type WhatsAppConversation,
  type WhatsAppConversationDepartment,
  type WhatsAppRequestStatus,
} from '../domain';
import {
  CONVERSATION_STATE_LABELS,
  DELIVERY_STATUS_LABELS,
  DEPARTMENT_LABELS,
  FLOW_STEP_LABELS,
  getConversationControl,
  getConversationControlLabel,
  getRequestStatusTone,
  MESSAGE_KIND_LABELS,
  REQUEST_STATUS_LABELS,
  type ConversationControl,
} from './conversation-labels';
import { conversationWorkspaceStyles as styles } from './conversation-workspace.styles';

export interface ConversationWorkspaceProps {
  readonly initialConversations: readonly WhatsAppConversation[];
  readonly initialError?: string | null;
  readonly currentUserId?: string | null;
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const POLLING_BASE_DELAY_MS = 4_000;
const POLLING_MAX_DELAY_MS = 30_000;

interface HumanMessageSubmission {
  readonly conversationId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedVersion: number;
  readonly text: string;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function conversationMatchesSearch(
  conversation: WhatsAppConversation,
  normalizedQuery: string,
): boolean {
  const searchableContent = [
    conversation.contact.name,
    conversation.contact.phone,
    conversation.lastMessagePreview,
    DEPARTMENT_LABELS[conversation.department],
    CONVERSATION_STATE_LABELS[conversation.conversationState],
    FLOW_STEP_LABELS[conversation.flowStep],
    REQUEST_STATUS_LABELS[conversation.requestStatus],
    conversation.assignedTo?.name ?? '',
  ].join(' ');

  return normalizeSearchValue(searchableContent).includes(normalizedQuery);
}

function formatDateTime(value: string | null): string {
  return value ? DATE_TIME_FORMATTER.format(new Date(value)) : 'Não registrado';
}

function formatFileSize(size: number | null): string {
  if (size === null) return 'Tamanho não informado';
  if (size < 1_024) return `${size} bytes`;
  if (size < 1_048_576) return `${(size / 1_024).toFixed(1)} KB`;
  return `${(size / 1_048_576).toFixed(1)} MB`;
}

function getContactInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?';
}

function preserveLoadedMessages(
  current: readonly WhatsAppConversation[],
  incoming: readonly WhatsAppConversation[],
): WhatsAppConversation[] {
  return incoming.map((conversation) => {
    const existing = current.find((candidate) => candidate.id === conversation.id);
    return {
      ...conversation,
      messages: existing?.messages ?? conversation.messages,
      transitions: existing?.transitions ?? conversation.transitions,
    };
  });
}

function hasPendingOutboundMessage(conversation: WhatsAppConversation): boolean {
  return conversation.messages.some(
    (message) => message.direction === 'outbound' && message.deliveryStatus === 'pending',
  );
}

function quoteValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const value = (await response.json()) as { readonly message?: unknown };
    return typeof value.message === 'string'
      ? value.message
      : `Consulta falhou com status ${response.status}.`;
  } catch {
    return `Consulta falhou com status ${response.status}.`;
  }
}

export function ConversationWorkspace({
  initialConversations,
  initialError = null,
  currentUserId = null,
}: ConversationWorkspaceProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialConversations[0]?.id ?? null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<WhatsAppConversationDepartment | 'all'>(
    'all',
  );
  const [controlFilter, setControlFilter] = useState<ConversationControl | 'all'>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<WhatsAppRequestStatus | 'all'>(
    'all',
  );
  const [targetDepartment, setTargetDepartment] = useState<WhatsAppConversationDepartment>(
    initialConversations[0]?.department ?? 'commercial',
  );
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [messageDraft, setMessageDraft] = useState('');
  const [listError, setListError] = useState(initialError ?? '');
  const [detailError, setDetailError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [loadedConversationIds, setLoadedConversationIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [isUpdatingConversation, startConversationTransition] = useTransition();
  const [isSendingMessage, startMessageTransition] = useTransition();
  const [, startReadTransition] = useTransition();
  const conversationsRef = useRef(conversations);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const pollingFailureCountRef = useRef(0);
  const humanMessageSubmissionRef = useRef<HumanMessageSubmission | null>(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const replaceConversation = useCallback(
    (updatedConversation: WhatsAppConversation, preserveExistingMessages = true) => {
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === updatedConversation.id
            ? {
                ...updatedConversation,
                messages:
                  !preserveExistingMessages || updatedConversation.messages.length > 0
                    ? updatedConversation.messages
                    : conversation.messages,
                transitions:
                  !preserveExistingMessages || updatedConversation.transitions.length > 0
                    ? updatedConversation.transitions
                    : conversation.transitions,
              }
            : conversation,
        ),
      );
    },
    [],
  );

  const loadConversationDetail = useCallback(
    async (conversationId: string): Promise<void> => {
      setIsLoadingDetail(true);
      setDetailError('');

      try {
        const response = await fetch(
          `/api/whatsapp-conversations?conversationId=${encodeURIComponent(conversationId)}`,
          { cache: 'no-store' },
        );

        if (response.status === 401) {
          window.location.assign('/auth/session-expired');
          return;
        }
        if (!response.ok) throw new Error(await responseMessage(response));

        const body = (await response.json()) as {
          readonly conversation?: WhatsAppConversation;
        };
        if (!body.conversation) throw new Error('A conversa retornada é inválida.');

        replaceConversation(body.conversation, false);
        setLoadedConversationIds((current) => new Set([...current, body.conversation!.id]));
      } catch (error) {
        setDetailError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o histórico completo.',
        );
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [replaceConversation],
  );

  const refreshList = useCallback(
    async (showProgress = false): Promise<void> => {
      if (showProgress) setIsRefreshing(true);

      try {
        const response = await fetch('/api/whatsapp-conversations', {
          cache: 'no-store',
        });

        if (response.status === 401) {
          window.location.assign('/auth/session-expired');
          return;
        }
        if (!response.ok) throw new Error(await responseMessage(response));

        const body = (await response.json()) as {
          readonly conversations?: readonly WhatsAppConversation[];
        };
        if (!Array.isArray(body.conversations)) {
          throw new Error('A lista de conversas retornada é inválida.');
        }

        const previous = conversationsRef.current;
        const selectedId = selectedConversationIdRef.current;
        const previousSelected = previous.find((conversation) => conversation.id === selectedId);
        const incomingSelected = body.conversations.find(
          (conversation) => conversation.id === selectedId,
        );

        setConversations((current) => preserveLoadedMessages(current, body.conversations ?? []));
        setListError('');

        if (
          selectedId &&
          incomingSelected &&
          (!previousSelected ||
            incomingSelected.version !== previousSelected.version ||
            incomingSelected.updatedAt !== previousSelected.updatedAt ||
            hasPendingOutboundMessage(previousSelected))
        ) {
          await loadConversationDetail(selectedId);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a lista de conversas.';
        setListError(message);
        throw error;
      } finally {
        if (showProgress) setIsRefreshing(false);
      }
    },
    [loadConversationDetail],
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = (delay: number) => {
      timeout = setTimeout(runPolling, delay);
    };

    const runPolling = async () => {
      if (stopped) return;

      if (document.visibilityState === 'hidden') {
        schedule(POLLING_MAX_DELAY_MS);
        return;
      }

      try {
        await refreshList();
        pollingFailureCountRef.current = 0;
      } catch {
        pollingFailureCountRef.current += 1;
      }

      const delay = Math.min(
        POLLING_BASE_DELAY_MS * 2 ** pollingFailureCountRef.current,
        POLLING_MAX_DELAY_MS,
      );
      schedule(delay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (timeout) clearTimeout(timeout);
      void runPolling();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    schedule(POLLING_BASE_DELAY_MS);

    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshList]);

  useEffect(() => {
    if (selectedConversationId && !loadedConversationIds.has(selectedConversationId)) {
      const timeout = setTimeout(() => {
        void loadConversationDetail(selectedConversationId);
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [loadConversationDetail, loadedConversationIds, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchTerm);

    return conversations.filter((conversation) => {
      const matchesDepartment =
        departmentFilter === 'all' || conversation.department === departmentFilter;
      const matchesControl =
        controlFilter === 'all' ||
        getConversationControl(conversation.conversationState) === controlFilter;
      const matchesRequestStatus =
        requestStatusFilter === 'all' || conversation.requestStatus === requestStatusFilter;
      const matchesSearch =
        normalizedQuery.length === 0 || conversationMatchesSearch(conversation, normalizedQuery);

      return matchesDepartment && matchesControl && matchesRequestStatus && matchesSearch;
    });
  }, [conversations, controlFilter, departmentFilter, requestStatusFilter, searchTerm]);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const canCurrentUserSendMessage =
    selectedConversation !== null &&
    canSendHumanWhatsAppMessage(selectedConversation) &&
    selectedConversation.assignedTo?.id === currentUserId;

  function applyActionResult(result: WhatsAppConversationActionResult, successMessage: string) {
    if (result.conversation) {
      replaceConversation(result.conversation, result.success);
      setTargetDepartment(result.conversation.department);
    }
    setFeedbackMessage(result.success ? successMessage : result.message);
    setFeedbackTone(result.success ? 'success' : 'error');

    if (result.conversation) {
      void loadConversationDetail(result.conversation.id);
    }
  }

  function handleConversationSelection(conversation: WhatsAppConversation) {
    setSelectedConversationId(conversation.id);
    setTargetDepartment(conversation.department);
    setFeedbackMessage('');
    setFeedbackTone('neutral');
    setDetailError('');
    setMessageDraft('');
    humanMessageSubmissionRef.current = null;

    if (conversation.unreadCount === 0) return;

    startReadTransition(async () => {
      const result = await markWhatsAppConversationAsReadAction({
        conversationId: conversation.id,
        expectedVersion: conversation.version,
      });
      applyActionResult(result, 'Conversa marcada como lida.');
    });
  }

  function handleVersionedAction(
    action: (input: {
      readonly conversationId: unknown;
      readonly expectedVersion: unknown;
    }) => Promise<WhatsAppConversationActionResult>,
    successMessage: string,
  ) {
    if (!selectedConversation) return;
    setFeedbackMessage('');
    setFeedbackTone('neutral');

    startConversationTransition(async () => {
      const result = await action({
        conversationId: selectedConversation.id,
        expectedVersion: selectedConversation.version,
      });
      applyActionResult(result, successMessage);
    });
  }

  function handleForward() {
    if (!selectedConversation) return;
    setFeedbackMessage('');
    setFeedbackTone('neutral');

    startConversationTransition(async () => {
      const result = await forwardWhatsAppConversationAction({
        conversationId: selectedConversation.id,
        expectedVersion: selectedConversation.version,
        targetDepartment,
      });
      applyActionResult(result, 'Atendimento encaminhado com sucesso.');
    });
  }

  function applyHumanMessageResult(result: SendHumanWhatsAppMessageActionResult): void {
    if (!result.success) {
      if (result.conversation) {
        replaceConversation(result.conversation, false);
        setTargetDepartment(result.conversation.department);

        if (
          result.code === 'conflict' &&
          humanMessageSubmissionRef.current?.conversationId === result.conversation.id
        ) {
          humanMessageSubmissionRef.current = {
            ...humanMessageSubmissionRef.current,
            expectedVersion: result.conversation.version,
          };
        }
      }
      setFeedbackMessage(result.message);
      setFeedbackTone('error');
      return;
    }

    setConversations((currentConversations) =>
      currentConversations.map((conversation) => {
        if (conversation.id !== result.conversation.id) return conversation;

        const existingMessages =
          result.conversation.messages.length > 0
            ? [...result.conversation.messages]
            : [...conversation.messages];
        const existingIndex = existingMessages.findIndex(
          (message) => message.id === result.message.id,
        );

        if (existingIndex >= 0) {
          existingMessages[existingIndex] = result.message;
        } else {
          existingMessages.push(result.message);
        }

        existingMessages.sort((first, second) => {
          const difference = Date.parse(first.occurredAt) - Date.parse(second.occurredAt);
          return difference === 0 ? first.id.localeCompare(second.id) : difference;
        });

        return {
          ...result.conversation,
          messages: existingMessages,
          transitions:
            result.conversation.transitions.length > 0
              ? result.conversation.transitions
              : conversation.transitions,
        };
      }),
    );
    setTargetDepartment(result.conversation.department);
    setMessageDraft('');
    humanMessageSubmissionRef.current = null;
    setFeedbackMessage('Mensagem registrada. Aguardando confirmação de envio pelo provedor.');
    setFeedbackTone('success');
    setLoadedConversationIds((current) => new Set([...current, result.conversation.id]));
    void loadConversationDetail(result.conversation.id);
  }

  function handleSendHumanMessage(): void {
    if (!selectedConversation || !canCurrentUserSendMessage || isSendingMessage) return;

    const text = messageDraft.trim();
    if (text.length === 0 || text.length > HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH) {
      setFeedbackMessage(
        text.length === 0
          ? 'Digite uma mensagem antes de enviar.'
          : `A mensagem deve ter no máximo ${HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH.toLocaleString(
              'pt-BR',
            )} caracteres.`,
      );
      setFeedbackTone('error');
      return;
    }

    let submission = humanMessageSubmissionRef.current;
    if (
      submission === null ||
      submission.conversationId !== selectedConversation.id ||
      submission.text !== text
    ) {
      submission = {
        conversationId: selectedConversation.id,
        commandId: globalThis.crypto.randomUUID(),
        idempotencyKey: globalThis.crypto.randomUUID(),
        expectedVersion: selectedConversation.version,
        text,
      };
      humanMessageSubmissionRef.current = submission;
    }

    setFeedbackMessage('');
    setFeedbackTone('neutral');

    startMessageTransition(async () => {
      const result = await sendHumanWhatsAppMessageAction({
        conversationId: submission!.conversationId,
        commandId: submission!.commandId,
        idempotencyKey: submission!.idempotencyKey,
        expectedVersion: submission!.expectedVersion,
        text: submission!.text,
      });
      applyHumanMessageResult(result);
    });
  }

  return (
    <section aria-labelledby="conversation-workspace-title" className={styles.section()}>
      <h2 id="conversation-workspace-title" className={styles.visuallyHidden()}>
        Caixa de entrada de conversas
      </h2>

      <aside className={styles.sidebar()}>
        <div className={styles.sidebarHeader()}>
          <div className={styles.sidebarHeading()}>
            <div>
              <p className={styles.sidebarEyebrow()}>Caixa de entrada</p>
              <p className={styles.sidebarTitle()}>{filteredConversations.length} conversas</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshList(true)}
              disabled={isRefreshing}
              className={styles.refreshButton()}
            >
              <RefreshCw aria-hidden="true" />
              {isRefreshing ? 'Atualizando' : 'Atualizar'}
            </button>
          </div>

          {listError ? (
            <div role="alert" className={styles.errorBanner()}>
              <AlertCircle aria-hidden="true" />
              <span>{listError}</span>
              <button type="button" onClick={() => void refreshList(true)}>
                Tentar novamente
              </button>
            </div>
          ) : null}

          <div className={styles.searchContainer()}>
            <Search aria-hidden="true" className={styles.searchIcon()} />
            <label htmlFor="conversation-search" className={styles.visuallyHidden()}>
              Buscar conversas
            </label>
            <input
              id="conversation-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nome, telefone, mensagem ou etapa"
              className={styles.searchInput()}
            />
          </div>

          <div className={styles.filters()}>
            <div>
              <label htmlFor="department-filter" className={styles.filterLabel()}>
                Departamento
              </label>
              <select
                id="department-filter"
                value={departmentFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setDepartmentFilter(isWhatsAppConversationDepartment(value) ? value : 'all');
                }}
                className={styles.filterSelect()}
              >
                <option value="all">Todos</option>
                {WHATSAPP_CONVERSATION_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {DEPARTMENT_LABELS[department]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="control-filter" className={styles.filterLabel()}>
                Condução
              </label>
              <select
                id="control-filter"
                value={controlFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setControlFilter(
                    value === 'bot' || value === 'human' || value === 'paused' || value === 'closed'
                      ? value
                      : 'all',
                  );
                }}
                className={styles.filterSelect()}
              >
                <option value="all">Todas</option>
                <option value="bot">Bot ativo</option>
                <option value="human">Humano ativo</option>
                <option value="paused">Bot bloqueado</option>
                <option value="closed">Encerrada</option>
              </select>
            </div>

            <div className={styles.wideFilter()}>
              <label htmlFor="request-status-filter" className={styles.filterLabel()}>
                Status da solicitação
              </label>
              <select
                id="request-status-filter"
                value={requestStatusFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setRequestStatusFilter(
                    (WHATSAPP_REQUEST_STATUSES as readonly string[]).includes(value)
                      ? (value as WhatsAppRequestStatus)
                      : 'all',
                  );
                }}
                className={styles.filterSelect()}
              >
                <option value="all">Todos os status</option>
                {WHATSAPP_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {REQUEST_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.conversationList()}>
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversation?.id;
              const control = getConversationControl(conversation.conversationState);

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleConversationSelection(conversation)}
                  className={styles.conversationButton({ selected: isSelected })}
                  aria-pressed={isSelected}
                >
                  <span className={styles.avatar()}>
                    {getContactInitial(conversation.contact.name)}
                  </span>
                  <span className={styles.conversationSummary()}>
                    <span className={styles.conversationHeading()}>
                      <strong className={styles.contactName()}>{conversation.contact.name}</strong>
                      <time className={styles.conversationTime()}>
                        {formatDateTime(conversation.lastMessageAt)}
                      </time>
                    </span>
                    <span className={styles.phonePreview()}>{conversation.contact.phone}</span>
                    <span className={styles.previewRow()}>
                      <span className={styles.preview()}>
                        {conversation.lastMessagePreview || 'Sem prévia de mensagem'}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span
                          className={styles.unreadBadge()}
                          aria-label={`${conversation.unreadCount} mensagens não lidas`}
                        >
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                    <span className={styles.listMetadata()}>
                      <span className={styles.departmentBadge()}>
                        {DEPARTMENT_LABELS[conversation.department]}
                      </span>
                      <span className={styles.controlBadge({ control })}>
                        {getConversationControlLabel(conversation.conversationState)}
                      </span>
                      <span
                        className={styles.requestBadge({
                          tone: getRequestStatusTone(conversation.requestStatus),
                        })}
                      >
                        {REQUEST_STATUS_LABELS[conversation.requestStatus]}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className={styles.emptyList()}>
              <Inbox aria-hidden="true" className={styles.emptyIcon()} />
              <p className={styles.emptyTitle()}>Nenhuma conversa encontrada</p>
              <p className={styles.emptyDescription()}>
                {listError
                  ? 'A lista será restaurada quando a Tenant API responder.'
                  : 'Altere a busca ou os filtros selecionados.'}
              </p>
            </div>
          )}
        </div>
      </aside>

      <div className={styles.detail()}>
        {selectedConversation !== null ? (
          <>
            <header className={styles.detailHeader()}>
              <div className={styles.contactBlock()}>
                <span className={styles.detailAvatar()}>
                  {getContactInitial(selectedConversation.contact.name)}
                </span>
                <div>
                  <h3 className={styles.detailTitle()}>{selectedConversation.contact.name}</h3>
                  <p className={styles.phone()}>
                    <Phone aria-hidden="true" />
                    {selectedConversation.contact.phone}
                  </p>
                  <p className={styles.lastInteraction()}>
                    Última interação: {formatDateTime(selectedConversation.lastMessageAt)}
                  </p>
                </div>
              </div>
              <div className={styles.versionBadge()}>versão {selectedConversation.version}</div>
            </header>

            <div className={styles.highlightGrid()}>
              <div
                className={styles.highlight({
                  tone: isWhatsAppBotBlocked(selectedConversation) ? 'danger' : 'success',
                })}
              >
                {isWhatsAppBotBlocked(selectedConversation) ? (
                  <ShieldAlert aria-hidden="true" />
                ) : (
                  <Bot aria-hidden="true" />
                )}
                <span>
                  <strong>
                    {isWhatsAppBotBlocked(selectedConversation)
                      ? 'Bot bloqueado'
                      : 'Bot autorizado'}
                  </strong>
                  <small>
                    {isWhatsAppBotBlocked(selectedConversation)
                      ? 'A automação não pode responder neste estado.'
                      : 'A Tenant API permite a automação neste estado.'}
                  </small>
                </span>
              </div>
              <div
                className={styles.highlight({
                  tone: isWhatsAppHumanActive(selectedConversation) ? 'info' : 'neutral',
                })}
              >
                <Headset aria-hidden="true" />
                <span>
                  <strong>
                    {isWhatsAppHumanActive(selectedConversation)
                      ? 'Humano ativo'
                      : 'Sem humano ativo'}
                  </strong>
                  <small>
                    {selectedConversation.assignedTo?.name ??
                      'Nenhum responsável assumiu o atendimento.'}
                  </small>
                </span>
              </div>
              <div
                className={styles.highlight({
                  tone: isWhatsAppAwaitingProposal(selectedConversation) ? 'warning' : 'neutral',
                })}
              >
                <FileText aria-hidden="true" />
                <span>
                  <strong>
                    {isWhatsAppAwaitingProposal(selectedConversation)
                      ? 'Aguardando proposta'
                      : 'Sem proposta pendente'}
                  </strong>
                  <small>
                    {selectedConversation.flowStep === 'commercial-follow-up-menu'
                      ? 'Segundo contato retomado no acompanhamento comercial.'
                      : FLOW_STEP_LABELS[selectedConversation.flowStep]}
                  </small>
                </span>
              </div>
            </div>

            <div className={styles.dimensionGrid()}>
              <div className={styles.dimensionItem()}>
                <Building2 aria-hidden="true" />
                <span>
                  <small>Departamento</small>
                  <strong>{DEPARTMENT_LABELS[selectedConversation.department]}</strong>
                </span>
              </div>
              <div className={styles.dimensionItem()}>
                <Bot aria-hidden="true" />
                <span>
                  <small>Estado da conversa</small>
                  <strong>
                    {CONVERSATION_STATE_LABELS[selectedConversation.conversationState]}
                  </strong>
                </span>
              </div>
              <div className={styles.dimensionItem()}>
                <RotateCcw aria-hidden="true" />
                <span>
                  <small>Etapa do fluxo</small>
                  <strong>{FLOW_STEP_LABELS[selectedConversation.flowStep]}</strong>
                </span>
              </div>
              <div className={styles.dimensionItem()}>
                <Clock3 aria-hidden="true" />
                <span>
                  <small>Status da solicitação</small>
                  <strong>{REQUEST_STATUS_LABELS[selectedConversation.requestStatus]}</strong>
                </span>
              </div>
            </div>

            <div className={styles.assignment()}>
              <UserRound aria-hidden="true" />
              <span>
                {selectedConversation.assignedTo === null
                  ? 'Nenhum atendente humano responsável'
                  : `Responsável: ${selectedConversation.assignedTo.name}`}
              </span>
              <small>Canal: {selectedConversation.channel.name}</small>
            </div>

            <div className={styles.actionsPanel()}>
              <p className={styles.actionsTitle()}>Ações reais pela Tenant API</p>
              <div className={styles.actions()}>
                <button
                  type="button"
                  onClick={() =>
                    handleVersionedAction(
                      takeOverWhatsAppConversationAction,
                      'Atendimento humano assumido com sucesso.',
                    )
                  }
                  disabled={
                    isUpdatingConversation || !canTakeOverWhatsAppConversation(selectedConversation)
                  }
                  className={styles.actionButton({ action: 'human' })}
                >
                  <Headset aria-hidden="true" />
                  Assumir
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleVersionedAction(
                      returnWhatsAppConversationToBotAction,
                      'Conversa devolvida ao bot na etapa permitida.',
                    )
                  }
                  disabled={
                    isUpdatingConversation ||
                    !canReturnWhatsAppConversationToBot(selectedConversation)
                  }
                  className={styles.actionButton({ action: 'bot' })}
                >
                  <Bot aria-hidden="true" />
                  Devolver ao bot
                </button>
                <button
                  type="button"
                  onClick={() => handleConversationSelection(selectedConversation)}
                  disabled={
                    isUpdatingConversation ||
                    !canMarkWhatsAppConversationAsRead(selectedConversation)
                  }
                  className={styles.actionButton({ action: 'read' })}
                >
                  <CheckCheck aria-hidden="true" />
                  Marcar como lida
                </button>
              </div>

              <div className={styles.forwardRow()}>
                <label htmlFor="forward-department">Encaminhar para</label>
                <select
                  id="forward-department"
                  value={targetDepartment}
                  onChange={(event) => {
                    if (isWhatsAppConversationDepartment(event.target.value)) {
                      setTargetDepartment(event.target.value);
                    }
                  }}
                  disabled={
                    isUpdatingConversation || !canForwardWhatsAppConversation(selectedConversation)
                  }
                  className={styles.compactSelect()}
                >
                  {WHATSAPP_CONVERSATION_DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {DEPARTMENT_LABELS[department]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleForward}
                  disabled={
                    isUpdatingConversation || !canForwardWhatsAppConversation(selectedConversation)
                  }
                  className={styles.actionButton({ action: 'forward' })}
                >
                  <Forward aria-hidden="true" />
                  Encaminhar
                </button>
              </div>

              <div className={styles.unavailableActions()}>
                <span>Não publicados pela matriz do painel:</span>
                <button type="button" disabled title="Sem endpoint real no contrato atual.">
                  <Clock3 aria-hidden="true" />
                  Aguardar cliente
                </button>
                <button type="button" disabled title="Sem endpoint real no contrato atual.">
                  <CircleStop aria-hidden="true" />
                  Fechar
                </button>
                <button type="button" disabled title="Sem endpoint real no contrato atual.">
                  <MessageSquareWarning aria-hidden="true" />
                  Cancelar
                </button>
              </div>
            </div>

            <section aria-labelledby="quote-request-title" className={styles.quotePanel()}>
              <div className={styles.panelHeading()}>
                <div>
                  <p className={styles.panelEyebrow()}>Solicitação estruturada</p>
                  <h4 id="quote-request-title">Orçamento atual</h4>
                </div>
                {isWhatsAppQuoteSummaryConfirmed(selectedConversation) ? (
                  <span className={styles.confirmedBadge()}>
                    <CheckCheck aria-hidden="true" />
                    Resumo confirmado
                  </span>
                ) : null}
              </div>

              {selectedConversation.currentQuoteRequest ? (
                <>
                  <dl className={styles.quoteGrid()}>
                    {[
                      ['Sequência', selectedConversation.currentQuoteRequest.sequence],
                      ['Contato', selectedConversation.currentQuoteRequest.contactName],
                      ['Documento', selectedConversation.currentQuoteRequest.document],
                      ['E-mail', selectedConversation.currentQuoteRequest.email],
                      ['Serviço', selectedConversation.currentQuoteRequest.serviceType],
                      ['Origem', selectedConversation.currentQuoteRequest.origin],
                      ['Destino', selectedConversation.currentQuoteRequest.destination],
                      [
                        'Saída',
                        selectedConversation.currentQuoteRequest.departureAt
                          ? formatDateTime(selectedConversation.currentQuoteRequest.departureAt)
                          : null,
                      ],
                      [
                        'Retorno',
                        selectedConversation.currentQuoteRequest.returnAt
                          ? formatDateTime(selectedConversation.currentQuoteRequest.returnAt)
                          : null,
                      ],
                      ['Passageiros', selectedConversation.currentQuoteRequest.passengerCount],
                      ['Veículo', selectedConversation.currentQuoteRequest.vehicleType],
                      ['À disposição', selectedConversation.currentQuoteRequest.vehicleAtDisposal],
                      ['Traslados locais', selectedConversation.currentQuoteRequest.localTransfers],
                      ['Observações', selectedConversation.currentQuoteRequest.notes],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <dt>{label}</dt>
                        <dd>{quoteValue(value)}</dd>
                      </div>
                    ))}
                  </dl>
                  {Object.keys(selectedConversation.currentQuoteRequest.structuredData).length >
                  0 ? (
                    <div className={styles.structuredData()}>
                      <strong>Dados adicionais confirmados</strong>
                      <dl>
                        {Object.entries(
                          selectedConversation.currentQuoteRequest.structuredData,
                        ).map(([key, value]) => (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>{quoteValue(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className={styles.emptyPanelText()}>
                  Nenhuma solicitação de orçamento vinculada a esta conversa.
                </p>
              )}
            </section>

            <section aria-labelledby="audit-title" className={styles.auditPanel()}>
              <div>
                <p className={styles.panelEyebrow()}>Auditoria essencial</p>
                <h4 id="audit-title">Concorrência e atividade</h4>
              </div>
              <dl>
                <div>
                  <dt>Versão otimista</dt>
                  <dd>{selectedConversation.version}</dd>
                </div>
                <div>
                  <dt>Atualizada em</dt>
                  <dd>{formatDateTime(selectedConversation.updatedAt)}</dd>
                </div>
                <div>
                  <dt>Último inbound</dt>
                  <dd>{formatDateTime(selectedConversation.lastInboundAt)}</dd>
                </div>
                <div>
                  <dt>Último outbound</dt>
                  <dd>{formatDateTime(selectedConversation.lastOutboundAt)}</dd>
                </div>
                <div>
                  <dt>Encerrada em</dt>
                  <dd>{formatDateTime(selectedConversation.closedAt)}</dd>
                </div>
              </dl>
              {selectedConversation.transitions.length > 0 ? (
                <ol className={styles.transitionList()}>
                  {selectedConversation.transitions.map((transition) => (
                    <li key={transition.id}>
                      <div>
                        <strong>{transition.name}</strong>
                        <span>
                          versão {transition.expectedVersion} → {transition.resultingVersion}
                        </span>
                      </div>
                      <p>
                        {CONVERSATION_STATE_LABELS[transition.from.conversationState]} →{' '}
                        {CONVERSATION_STATE_LABELS[transition.to.conversationState]} ·{' '}
                        {FLOW_STEP_LABELS[transition.to.flowStep]}
                      </p>
                      <small>
                        {transition.actorType}
                        {transition.actorUserId ? ` · ${transition.actorUserId}` : ''} ·{' '}
                        {formatDateTime(transition.createdAt)}
                      </small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>Nenhuma transição foi registrada para esta conversa.</p>
              )}
            </section>

            <section aria-labelledby="message-history-title" className={styles.history()}>
              <div className={styles.historyHeader()}>
                <div>
                  <p className={styles.panelEyebrow()}>Histórico completo</p>
                  <h4 id="message-history-title">Mensagens e anexos</h4>
                </div>
                <span>{selectedConversation.messages.length} mensagens</span>
              </div>

              {isLoadingDetail && !loadedConversationIds.has(selectedConversation.id) ? (
                <div className={styles.loadingState()} role="status">
                  <LoaderCircle aria-hidden="true" />
                  Carregando histórico completo...
                </div>
              ) : detailError ? (
                <div className={styles.detailError()} role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>{detailError}</span>
                  <button
                    type="button"
                    onClick={() => void loadConversationDetail(selectedConversation.id)}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : selectedConversation.messages.length > 0 ? (
                <div className={styles.messages()}>
                  {selectedConversation.messages.map((message) => {
                    const failedAttempt = [...message.attempts]
                      .reverse()
                      .find((attempt) => attempt.status === 'failed');

                    return (
                      <article
                        key={message.id}
                        className={styles.messageRow({
                          direction: message.direction,
                        })}
                      >
                        <div
                          className={styles.messageBubble({
                            direction: message.direction,
                          })}
                        >
                          <div className={styles.messageMeta()}>
                            <strong>
                              {message.direction === 'inbound'
                                ? selectedConversation.contact.name
                                : 'Atendimento'}
                            </strong>
                            <span>{DELIVERY_STATUS_LABELS[message.deliveryStatus]}</span>
                          </div>
                          {message.text ? (
                            <p className={styles.messageContent()}>{message.text}</p>
                          ) : null}
                          {message.attachment ? (
                            <div className={styles.attachment()}>
                              <Paperclip aria-hidden="true" />
                              <span>
                                <strong>
                                  {message.attachment.fileName ?? MESSAGE_KIND_LABELS[message.kind]}
                                </strong>
                                <small>
                                  {message.attachment.mimeType ?? MESSAGE_KIND_LABELS[message.kind]}{' '}
                                  · {formatFileSize(message.attachment.size)}
                                </small>
                              </span>
                              {message.attachment.url ? (
                                <a href={message.attachment.url} target="_blank" rel="noreferrer">
                                  Abrir anexo
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                          {failedAttempt ? (
                            <p className={styles.failureReason()}>
                              <AlertCircle aria-hidden="true" />
                              {failedAttempt.errorCode ? `${failedAttempt.errorCode}: ` : ''}
                              {failedAttempt.errorMessage ??
                                'Falha registrada sem motivo detalhado.'}
                            </p>
                          ) : null}
                          <time className={styles.messageTime()}>
                            {formatDateTime(message.occurredAt)}
                          </time>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyPanelText()}>
                  Esta conversa ainda não possui mensagens persistidas.
                </p>
              )}
            </section>

            <section aria-labelledby="human-message-title" className={styles.composer()}>
              <div className={styles.composerHeading()}>
                <div>
                  <p className={styles.panelEyebrow()}>Atendimento humano</p>
                  <h4 id="human-message-title">Responder pelo painel</h4>
                </div>
                <span
                  className={styles.composerStatus({
                    enabled: canCurrentUserSendMessage,
                  })}
                >
                  {canCurrentUserSendMessage ? 'Envio autorizado' : 'Envio bloqueado'}
                </span>
              </div>
              <label htmlFor="human-message" className={styles.visuallyHidden()}>
                Mensagem para {selectedConversation.contact.name}
              </label>
              <textarea
                id="human-message"
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                maxLength={HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH}
                rows={4}
                disabled={!canCurrentUserSendMessage || isSendingMessage}
                placeholder={
                  canCurrentUserSendMessage
                    ? `Responder para ${selectedConversation.contact.name}`
                    : 'Assuma esta conversa para responder ao cliente.'
                }
                className={styles.composerInput()}
              />
              <div className={styles.composerFooter()}>
                <p>
                  {canCurrentUserSendMessage
                    ? `${messageDraft.length.toLocaleString('pt-BR')} / ${HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH.toLocaleString(
                        'pt-BR',
                      )} caracteres`
                    : selectedConversation.conversationState !== 'human-active'
                      ? 'O bot permanece bloqueado somente depois que um atendente assume.'
                      : 'Somente o atendente responsável pode responder nesta conversa.'}
                </p>
                <button
                  type="button"
                  onClick={handleSendHumanMessage}
                  disabled={
                    !canCurrentUserSendMessage ||
                    isSendingMessage ||
                    messageDraft.trim().length === 0
                  }
                  className={styles.sendButton()}
                >
                  {isSendingMessage ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                  {isSendingMessage ? 'Registrando...' : 'Enviar mensagem'}
                </button>
              </div>
            </section>

            <footer className={styles.detailFooter()}>
              <p className={styles.integrationNotice()}>
                <CheckCheck aria-hidden="true" />
                Atualização por polling da rota server-side com backoff. O painel controla a
                automação somente pela Tenant API.
              </p>
              <p
                aria-live="polite"
                className={styles.feedback({
                  tone: feedbackTone,
                })}
              >
                {isUpdatingConversation
                  ? 'Atualizando conversa com expectedVersion...'
                  : feedbackMessage}
              </p>
            </footer>
          </>
        ) : (
          <div className={styles.emptyDetail()}>
            <Inbox aria-hidden="true" className={styles.emptyDetailIcon()} />
            <p className={styles.emptyDetailTitle()}>Selecione uma conversa</p>
            <p className={styles.emptyDetailDescription()}>
              O histórico, as quatro dimensões e as ações reais aparecerão aqui.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
