'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Building2,
  CircleStop,
  Clock3,
  FileText,
  FileUp,
  Forward,
  Headset,
  History,
  Inbox,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  UserRound,
} from 'lucide-react';

import { updateQuoteProposalStatusAction } from '@/features/quote-proposals/actions';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button, buttonVariants } from '@/shared/ui/button';
import { userFacingMessage } from '@/shared/lib/user-facing-message';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from '@/shared/ui/toast';

import {
  closeWhatsAppConversationAction,
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
  canCloseWhatsAppConversation,
  canForwardWhatsAppConversation,
  canReturnWhatsAppConversationToBot,
  canSendHumanWhatsAppMessage,
  canTakeOverWhatsAppConversation,
  isWhatsAppAwaitingProposal,
  isWhatsAppBotBlocked,
  isWhatsAppConversationDepartment,
  isWhatsAppHumanActive,
  WHATSAPP_ROUTABLE_DEPARTMENTS,
  WHATSAPP_REQUEST_STATUSES,
  type WhatsAppConversation,
  type WhatsAppConversationDepartment,
  type WhatsAppRequestStatus,
} from '../domain';
import {
  CONVERSATION_STATE_LABELS,
  DEPARTMENT_LABELS,
  FLOW_STEP_LABELS,
  getConversationControl,
  getConversationControlLabel,
  getRequestStatusTone,
  REQUEST_STATUS_LABELS,
  type ConversationControl,
} from './conversation-labels';
import { ConversationMessageSheet } from './conversation-message-sheet';
import { ConversationMetricsCards } from './conversation-metrics-cards';
import { ConversationQuoteActions } from './conversation-quote-actions';
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

interface HumanMediaSubmission {
  readonly conversationId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedVersion: number;
  readonly caption: string;
  readonly file: File;
  readonly mediaKind: 'auto' | 'sticker';
}

const MANUAL_COMMERCIAL_STATUSES = [
  'under-review',
  'waiting-for-customer',
  'approved',
  'rejected',
  'cancelled',
] as const;

type ManualCommercialStatus = (typeof MANUAL_COMMERCIAL_STATUSES)[number];

function isManualCommercialStatus(value: unknown): value is ManualCommercialStatus {
  return (
    typeof value === 'string' && (MANUAL_COMMERCIAL_STATUSES as readonly string[]).includes(value)
  );
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

function getContactInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?';
}

function getFlowStepLabel(conversation: WhatsAppConversation): string {
  if (
    conversation.flowStep === 'quote-send-pending' &&
    conversation.requestStatus === 'waiting-for-customer'
  ) {
    return 'Proposta enviada';
  }

  return FLOW_STEP_LABELS[conversation.flowStep];
}

function getDefaultTargetDepartment(
  currentDepartment: WhatsAppConversationDepartment,
): WhatsAppConversationDepartment {
  return (
    WHATSAPP_ROUTABLE_DEPARTMENTS.find((department) => department !== currentDepartment) ??
    currentDepartment
  );
}

export function preserveLoadedConversationHistory(
  current: readonly WhatsAppConversation[],
  incoming: readonly WhatsAppConversation[],
): WhatsAppConversation[] {
  return incoming.map((conversation) => {
    const existing = current.find((candidate) => candidate.id === conversation.id);
    return {
      ...conversation,
      messages: existing?.messages ?? conversation.messages,
      messageHistory: existing?.messageHistory ?? conversation.messageHistory,
      transitions: existing?.transitions ?? conversation.transitions,
    };
  });
}

function hasPendingOutboundMessage(conversation: WhatsAppConversation): boolean {
  return conversation.messages.some(
    (message) => message.direction === 'outbound' && message.deliveryStatus === 'pending',
  );
}

function getClosureReason(transition: WhatsAppConversation['transitions'][number]): string | null {
  const reason = transition.metadata.reason;
  return typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null;
}

function getClosureActor(transition: WhatsAppConversation['transitions'][number]): string {
  if (transition.actor?.user?.name) return transition.actor.user.name;
  if (transition.actorType === 'user') return 'Atendente não identificado';
  return 'Automação';
}

function getLatestClosureTransition(
  transitions: WhatsAppConversation['transitions'],
): WhatsAppConversation['transitions'][number] | null {
  return transitions.reduce<WhatsAppConversation['transitions'][number] | null>(
    (latest, transition) => {
      if (transition.name !== 'close' && transition.name !== 'close-after-rejection') {
        return latest;
      }
      if (latest === null) return transition;
      return new Date(transition.createdAt).valueOf() > new Date(latest.createdAt).valueOf()
        ? transition
        : latest;
    },
    null,
  );
}

const TRANSITION_LABELS: Readonly<Record<string, string>> = {
  'present-main-menu': 'Menu principal apresentado',
  'select-commercial': 'Atendimento comercial selecionado',
  'start-department-contact': 'Contato com departamento iniciado',
  'start-quote': 'Coleta de orçamento iniciada',
  'new-quote-request': 'Novo orçamento solicitado',
  'present-quote-summary': 'Resumo do orçamento apresentado',
  'correct-quote': 'Orçamento corrigido',
  'confirm-quote': 'Resumo do orçamento confirmado',
  'proposal-delivery-confirmed': 'Entrega da proposta confirmada',
  'proposal-response-received': 'Resposta da proposta registrada',
  'return-to-main-menu': 'Retorno ao menu principal',
  'take-over': 'Atendimento assumido',
  'return-to-bot': 'Atendimento devolvido ao bot',
  forward: 'Atendimento encaminhado',
  'mark-read': 'Conversa marcada como lida',
  close: 'Atendimento encerrado',
  'close-after-rejection': 'Atendimento encerrado após recusa',
  'resume-awaited-reply': 'Resposta aguardada retomada',
  'resume-contextual-contact': 'Contato contextual retomado',
};

function getTransitionLabel(name: string): string {
  return TRANSITION_LABELS[name] ?? 'Ação registrada';
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const value = (await response.json()) as { readonly message?: unknown };
    return typeof value.message === 'string'
      ? value.message
      : 'Não foi possível atualizar as conversas.';
  } catch {
    return 'Não foi possível atualizar as conversas.';
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<WhatsAppConversationDepartment | 'all'>(
    'all',
  );
  const [controlFilter, setControlFilter] = useState<ConversationControl | 'all'>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<WhatsAppRequestStatus | 'all'>(
    'all',
  );
  const [targetDepartment, setTargetDepartment] = useState<WhatsAppConversationDepartment>(
    getDefaultTargetDepartment(initialConversations[0]?.department ?? 'commercial'),
  );
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'error'>('neutral');
  const [messageDraft, setMessageDraft] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [selectedAttachmentKind, setSelectedAttachmentKind] = useState<'auto' | 'sticker'>('auto');
  const [listError, setListError] = useState(initialError ?? '');
  const [detailError, setDetailError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [manualCommercialStatus, setManualCommercialStatus] =
    useState<ManualCommercialStatus>('under-review');
  const [manualCommercialStatusReason, setManualCommercialStatusReason] = useState('');
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
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
  const humanMediaSubmissionRef = useRef<HumanMediaSubmission | null>(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (!listError) return;
    toast.add({
      title: 'Conversas não atualizadas',
      description: 'Não foi possível atualizar a lista de conversas.',
      type: 'error',
    });
  }, [listError]);

  useEffect(() => {
    if (feedbackTone !== 'error' || !feedbackMessage) return;
    toast.add({
      title: 'Operação não concluída',
      description: userFacingMessage(feedbackMessage, 'Não foi possível concluir a operação.'),
      type: 'error',
    });
  }, [feedbackMessage, feedbackTone]);

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
                messageHistory:
                  !preserveExistingMessages || updatedConversation.messageHistory
                    ? updatedConversation.messageHistory
                    : conversation.messageHistory,
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
    async (conversationId: string, messagePage = 1): Promise<void> => {
      if (messagePage === 1) setIsLoadingDetail(true);
      else setIsLoadingOlderMessages(true);
      setDetailError('');

      try {
        const response = await fetch(
          `/api/whatsapp-conversations?conversationId=${encodeURIComponent(conversationId)}&messagePage=${messagePage}`,
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

        if (messagePage === 1) {
          replaceConversation(body.conversation, false);
        } else {
          setConversations((currentConversations) =>
            currentConversations.map((currentConversation) => {
              if (currentConversation.id !== body.conversation!.id) {
                return currentConversation;
              }

              const messagesById = new Map(
                currentConversation.messages.map((message) => [message.id, message]),
              );
              body.conversation!.messages.forEach((message) => {
                messagesById.set(message.id, message);
              });
              const messages = [...messagesById.values()].sort((first, second) => {
                const difference = Date.parse(first.occurredAt) - Date.parse(second.occurredAt);
                return difference === 0 ? first.id.localeCompare(second.id) : difference;
              });

              return {
                ...body.conversation!,
                messages,
              };
            }),
          );
        }
        setLoadedConversationIds((current) => new Set([...current, body.conversation!.id]));
      } catch (error) {
        setDetailError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o histórico completo.',
        );
      } finally {
        if (messagePage === 1) setIsLoadingDetail(false);
        else setIsLoadingOlderMessages(false);
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

        setConversations((current) =>
          preserveLoadedConversationHistory(current, body.conversations ?? []),
        );
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
        requestStatusFilter === 'all' ||
        (conversation.department === 'commercial' &&
          conversation.requestStatus === requestStatusFilter);
      const matchesSearch =
        normalizedQuery.length === 0 || conversationMatchesSearch(conversation, normalizedQuery);

      return matchesDepartment && matchesControl && matchesRequestStatus && matchesSearch;
    });
  }, [conversations, controlFilter, departmentFilter, requestStatusFilter, searchTerm]);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const effectiveTargetDepartment =
    selectedConversation !== null && targetDepartment === selectedConversation.department
      ? getDefaultTargetDepartment(selectedConversation.department)
      : targetDepartment;
  const canCurrentUserSendMessage =
    selectedConversation !== null &&
    canSendHumanWhatsAppMessage(selectedConversation) &&
    selectedConversation.assignedTo?.id === currentUserId;
  const actionHistory = selectedConversation?.transitions ?? [];
  const latestClosure = getLatestClosureTransition(actionHistory);

  function applyActionResult(result: WhatsAppConversationActionResult, successMessage: string) {
    if (result.conversation) {
      replaceConversation(result.conversation, result.success);
      setTargetDepartment(getDefaultTargetDepartment(result.conversation.department));
    }
    setFeedbackMessage(result.success ? successMessage : result.message);
    setFeedbackTone(result.success ? 'success' : 'error');

    if (result.conversation) {
      void loadConversationDetail(result.conversation.id);
    }
  }

  function handleConversationSelection(conversation: WhatsAppConversation) {
    setSelectedConversationId(conversation.id);
    setMobileDetailOpen(true);
    setTargetDepartment(getDefaultTargetDepartment(conversation.department));
    setFeedbackMessage('');
    setFeedbackTone('neutral');
    setDetailError('');
    setMessageDraft('');
    setIsCloseDialogOpen(false);
    setIsForwardDialogOpen(false);
    setIsStatusDialogOpen(false);
    setIsHistoryDialogOpen(false);
    setCloseReason('');
    setManualCommercialStatus(
      isManualCommercialStatus(conversation.requestStatus)
        ? conversation.requestStatus
        : 'under-review',
    );
    setManualCommercialStatusReason('');
    setIsMessagesOpen(false);
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
        targetDepartment: effectiveTargetDepartment,
      });
      applyActionResult(result, 'Atendimento encaminhado com sucesso.');
      if (result.success) setIsForwardDialogOpen(false);
    });
  }

  function handleClose() {
    if (!selectedConversation) return;
    setFeedbackMessage('');
    setFeedbackTone('neutral');

    startConversationTransition(async () => {
      const result = await closeWhatsAppConversationAction({
        conversationId: selectedConversation.id,
        expectedVersion: selectedConversation.version,
        reason: closeReason.trim() || undefined,
      });
      const successMessage =
        'Atendimento encerrado. O próximo contato será iniciado pelo bot no menu principal.';
      applyActionResult(result, successMessage);

      toast.add({
        title: result.success ? 'Atendimento encerrado' : 'Não foi possível encerrar',
        description: result.success
          ? successMessage
          : userFacingMessage(
              result.message,
              'Não foi possível encerrar o atendimento. Tente novamente.',
            ),
        type: result.success ? 'success' : 'error',
      });

      if (result.success) {
        setIsCloseDialogOpen(false);
        setCloseReason('');
      }
    });
  }

  function handleManualCommercialStatus() {
    if (!selectedConversation?.currentQuoteRequest) return;
    setFeedbackMessage('');
    setFeedbackTone('neutral');

    startConversationTransition(async () => {
      const result = await updateQuoteProposalStatusAction({
        quoteRequestId: selectedConversation.currentQuoteRequest!.id,
        commandId: crypto.randomUUID(),
        expectedVersion: selectedConversation.version,
        status: manualCommercialStatus,
        reason: manualCommercialStatusReason.trim() || undefined,
      });
      if (!result.success) {
        setFeedbackMessage(result.message);
        setFeedbackTone('error');
        if (result.code === 'conflict') await refreshList(true);
        return;
      }

      setFeedbackMessage('Status comercial atualizado com sucesso.');
      setFeedbackTone('success');
      setManualCommercialStatusReason('');
      await refreshList(true);
      await loadConversationDetail(selectedConversation.id);
      setIsStatusDialogOpen(false);
    });
  }

  function applyHumanMessageResult(result: SendHumanWhatsAppMessageActionResult): void {
    if (!result.success) {
      if (result.conversation) {
        replaceConversation(result.conversation, false);
        setTargetDepartment(getDefaultTargetDepartment(result.conversation.department));

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
    setTargetDepartment(getDefaultTargetDepartment(result.conversation.department));
    setMessageDraft('');
    setSelectedAttachment(null);
    setSelectedAttachmentKind('auto');
    humanMessageSubmissionRef.current = null;
    humanMediaSubmissionRef.current = null;
    setFeedbackMessage('Mensagem salva. Aguardando confirmação de envio.');
    setFeedbackTone('success');
    setLoadedConversationIds((current) => new Set([...current, result.conversation.id]));
    void loadConversationDetail(result.conversation.id);
  }

  function handleSendHumanMessage(): void {
    if (!selectedConversation || !canCurrentUserSendMessage || isSendingMessage) return;

    const text = messageDraft.trim();
    if (
      (text.length === 0 && selectedAttachment === null) ||
      text.length > HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH
    ) {
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

    if (selectedAttachment !== null) {
      let mediaSubmission = humanMediaSubmissionRef.current;
      if (
        mediaSubmission === null ||
        mediaSubmission.conversationId !== selectedConversation.id ||
        mediaSubmission.caption !== text ||
        mediaSubmission.file !== selectedAttachment ||
        mediaSubmission.mediaKind !== selectedAttachmentKind
      ) {
        mediaSubmission = {
          conversationId: selectedConversation.id,
          commandId: globalThis.crypto.randomUUID(),
          idempotencyKey: globalThis.crypto.randomUUID(),
          expectedVersion: selectedConversation.version,
          caption: text,
          file: selectedAttachment,
          mediaKind: selectedAttachmentKind,
        };
        humanMediaSubmissionRef.current = mediaSubmission;
      }

      setFeedbackMessage('');
      setFeedbackTone('neutral');
      startMessageTransition(async () => {
        const formData = new FormData();
        formData.set('file', mediaSubmission!.file);
        formData.set('commandId', mediaSubmission!.commandId);
        formData.set('idempotencyKey', mediaSubmission!.idempotencyKey);
        formData.set('expectedVersion', String(mediaSubmission!.expectedVersion));
        formData.set('mediaKind', mediaSubmission!.mediaKind);
        if (mediaSubmission!.caption) formData.set('caption', mediaSubmission!.caption);

        try {
          const response = await fetch(
            `/api/whatsapp-conversations/${encodeURIComponent(mediaSubmission!.conversationId)}/media`,
            { method: 'POST', body: formData },
          );
          const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
          if (!response.ok) {
            const message = typeof payload?.message === 'string' ? payload.message : '';
            setFeedbackMessage(
              userFacingMessage(message, 'Não foi possível enviar o anexo. Tente novamente.'),
            );
            setFeedbackTone('error');
            if (response.status === 409) await refreshList(true);
            return;
          }

          setMessageDraft('');
          setSelectedAttachment(null);
          setSelectedAttachmentKind('auto');
          humanMediaSubmissionRef.current = null;
          humanMessageSubmissionRef.current = null;
          setFeedbackMessage('Anexo salvo. Aguardando confirmação de envio.');
          setFeedbackTone('success');
          await refreshList(true);
          await loadConversationDetail(mediaSubmission!.conversationId);
        } catch {
          setFeedbackMessage(
            'Não foi possível enviar o anexo. Verifique sua conexão e tente novamente.',
          );
          setFeedbackTone('error');
        }
      });
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
    <>
      <div className="mt-4 flex justify-end">
        <Link
          href="/whatsapp-conversations/import"
          className={buttonVariants({ variant: 'outline' })}
        >
          <FileUp aria-hidden="true" />
          Importar históricos
        </Link>
      </div>
      <ConversationMetricsCards conversations={conversations} className="mt-4" />
      <section aria-labelledby="conversation-workspace-title" className={styles.section()}>
        <h2 id="conversation-workspace-title" className={styles.visuallyHidden()}>
          Caixa de entrada de conversas
        </h2>

        <aside className={cn(styles.sidebar(), mobileDetailOpen ? 'hidden xl:flex' : 'flex')}>
          <div className={styles.sidebarHeader()}>
            <div className={styles.sidebarHeading()}>
              <div>
                <p className={styles.sidebarEyebrow()}>Caixa de entrada</p>
                <p className={styles.sidebarTitle()}>
                  {filteredConversations.length === 1
                    ? '1 conversa'
                    : `${filteredConversations.length} conversas`}
                </p>
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
              <div className={styles.errorBanner()}>
                <AlertCircle aria-hidden="true" />
                <span>A lista não pôde ser atualizada.</span>
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
                <Select
                  value={departmentFilter}
                  onValueChange={(value) => {
                    setDepartmentFilter(isWhatsAppConversationDepartment(value) ? value : 'all');
                  }}
                >
                  <SelectTrigger id="department-filter" className={styles.filterSelect()}>
                    <span>
                      {departmentFilter === 'all' ? 'Todos' : DEPARTMENT_LABELS[departmentFilter]}
                    </span>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="all">Todos</SelectItem>
                    {WHATSAPP_ROUTABLE_DEPARTMENTS.map((department) => (
                      <SelectItem key={department} value={department}>
                        {DEPARTMENT_LABELS[department]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="control-filter" className={styles.filterLabel()}>
                  Condução
                </label>
                <Select
                  value={controlFilter}
                  onValueChange={(value) => {
                    setControlFilter(
                      value === 'bot' ||
                        value === 'human' ||
                        value === 'paused' ||
                        value === 'closed'
                        ? value
                        : 'all',
                    );
                  }}
                >
                  <SelectTrigger id="control-filter" className={styles.filterSelect()}>
                    <span>
                      {controlFilter === 'all'
                        ? 'Todas'
                        : controlFilter === 'bot'
                          ? 'Bot ativo'
                          : controlFilter === 'human'
                            ? 'Atendente ativo'
                            : controlFilter === 'paused'
                              ? 'Bot bloqueado'
                              : 'Encerrada'}
                    </span>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="bot">Bot ativo</SelectItem>
                    <SelectItem value="human">Atendente ativo</SelectItem>
                    <SelectItem value="paused">Bot bloqueado</SelectItem>
                    <SelectItem value="closed">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={styles.wideFilter()}>
                <label htmlFor="request-status-filter" className={styles.filterLabel()}>
                  Status comercial
                </label>
                <Select
                  value={requestStatusFilter}
                  onValueChange={(value) => {
                    setRequestStatusFilter(
                      typeof value === 'string' &&
                        (WHATSAPP_REQUEST_STATUSES as readonly string[]).includes(value)
                        ? (value as WhatsAppRequestStatus)
                        : 'all',
                    );
                  }}
                >
                  <SelectTrigger id="request-status-filter" className={styles.filterSelect()}>
                    <span>
                      {requestStatusFilter === 'all'
                        ? 'Todos os status'
                        : REQUEST_STATUS_LABELS[requestStatusFilter]}
                    </span>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {WHATSAPP_REQUEST_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {REQUEST_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <Avatar className={styles.avatar()}>
                      {conversation.contact.profilePictureUrl ? (
                        <AvatarImage
                          src={conversation.contact.profilePictureUrl}
                          alt={`Foto de ${conversation.contact.name}`}
                        />
                      ) : null}
                      <AvatarFallback>
                        {getContactInitial(conversation.contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={styles.conversationSummary()}>
                      <span className={styles.conversationHeading()}>
                        <strong className={styles.contactName()}>
                          {conversation.contact.name}
                        </strong>
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
                            aria-label={
                              conversation.unreadCount === 1
                                ? '1 mensagem não lida'
                                : `${conversation.unreadCount} mensagens não lidas`
                            }
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
                        {conversation.department === 'commercial' ? (
                          <span
                            className={styles.requestBadge({
                              tone: getRequestStatusTone(conversation.requestStatus),
                            })}
                          >
                            {REQUEST_STATUS_LABELS[conversation.requestStatus]}
                          </span>
                        ) : null}
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
                    ? 'A lista será restaurada quando a conexão for retomada.'
                    : 'Altere a busca ou os filtros selecionados.'}
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className={cn(styles.detail(), mobileDetailOpen ? 'flex' : 'hidden xl:flex')}>
          {selectedConversation !== null ? (
            <>
              <header className={styles.detailHeader()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="xl:hidden"
                  onClick={() => setMobileDetailOpen(false)}
                  aria-label="Voltar para a caixa de entrada"
                >
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <div className={styles.contactBlock()}>
                  <Avatar className={styles.detailAvatar()}>
                    {selectedConversation.contact.profilePictureUrl ? (
                      <AvatarImage
                        src={selectedConversation.contact.profilePictureUrl}
                        alt={`Foto de ${selectedConversation.contact.name}`}
                      />
                    ) : null}
                    <AvatarFallback>
                      {getContactInitial(selectedConversation.contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={styles.contactIdentity()}>
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
                <div className={styles.headerAssignment()}>
                  <UserRound aria-hidden="true" />
                  <span>
                    {selectedConversation.conversationState === 'closed' && latestClosure !== null
                      ? `Encerrado por: ${getClosureActor(latestClosure)}`
                      : selectedConversation.assignedTo === null
                        ? 'Sem atendente responsável'
                        : `Responsável: ${selectedConversation.assignedTo.name}`}
                  </span>
                </div>
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
                        : 'A automação está permitida neste estado.'}
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
                        ? 'Atendente ativo'
                        : 'Sem atendente ativo'}
                    </strong>
                    <small>
                      {selectedConversation.assignedTo?.name ??
                        'Nenhum responsável assumiu o atendimento.'}
                    </small>
                  </span>
                </div>
                {selectedConversation.department === 'commercial' ? (
                  <div
                    className={styles.highlight({
                      tone: isWhatsAppAwaitingProposal(selectedConversation)
                        ? 'warning'
                        : 'neutral',
                    })}
                  >
                    <FileText aria-hidden="true" />
                    <span>
                      <strong>
                        {isWhatsAppAwaitingProposal(selectedConversation)
                          ? 'Aguardando proposta'
                          : selectedConversation.requestStatus === 'waiting-for-customer'
                            ? 'Proposta enviada'
                            : 'Sem proposta pendente'}
                      </strong>
                      <small>
                        {selectedConversation.requestStatus === 'waiting-for-customer'
                          ? 'PDF entregue; aguardando retorno do cliente.'
                          : selectedConversation.flowStep === 'commercial-follow-up-menu'
                            ? 'Segundo contato retomado no acompanhamento comercial.'
                            : getFlowStepLabel(selectedConversation)}
                      </small>
                    </span>
                  </div>
                ) : null}
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
                    <strong>{getFlowStepLabel(selectedConversation)}</strong>
                  </span>
                </div>
                <div className={styles.dimensionItem()}>
                  <MessageCircle aria-hidden="true" />
                  <span>
                    <small>Canal</small>
                    <strong>{selectedConversation.channel.name}</strong>
                  </span>
                </div>
                {selectedConversation.department === 'commercial' ? (
                  <div className={styles.dimensionItem()}>
                    <Clock3 aria-hidden="true" />
                    <span>
                      <small>Status comercial</small>
                      <strong>{REQUEST_STATUS_LABELS[selectedConversation.requestStatus]}</strong>
                    </span>
                  </div>
                ) : null}
              </div>

              <div className={styles.actionsPanel()}>
                <p className={styles.actionsTitle()}>Ações do atendimento</p>
                <div className={styles.actionColumns()}>
                  <div className={styles.actions()}>
                    <button
                      type="button"
                      onClick={() =>
                        handleVersionedAction(
                          takeOverWhatsAppConversationAction,
                          'Atendimento assumido com sucesso.',
                        )
                      }
                      disabled={
                        isUpdatingConversation ||
                        !canTakeOverWhatsAppConversation(selectedConversation)
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
                      onClick={() => setIsCloseDialogOpen(true)}
                      disabled={
                        isUpdatingConversation ||
                        !canCloseWhatsAppConversation(selectedConversation)
                      }
                      className={styles.actionButton({ action: 'close' })}
                    >
                      <CircleStop aria-hidden="true" />
                      Encerrar atendimento
                    </button>
                  </div>
                  <div className={styles.actions()}>
                    <ConversationMessageSheet
                      conversation={selectedConversation}
                      open={isMessagesOpen}
                      onOpenChange={setIsMessagesOpen}
                      isLoading={isLoadingDetail}
                      isLoaded={loadedConversationIds.has(selectedConversation.id)}
                      detailError={detailError}
                      onRetry={() => void loadConversationDetail(selectedConversation.id)}
                      onLoadOlder={() => {
                        const nextPage = (selectedConversation.messageHistory?.page ?? 1) + 1;
                        void loadConversationDetail(selectedConversation.id, nextPage);
                      }}
                      isLoadingOlder={isLoadingOlderMessages}
                      onRefresh={() => void refreshList(true)}
                      messageDraft={messageDraft}
                      onMessageDraftChange={setMessageDraft}
                      selectedAttachment={selectedAttachment}
                      onSelectedAttachmentChange={(file, kind = 'auto') => {
                        setSelectedAttachment(file);
                        setSelectedAttachmentKind(file ? kind : 'auto');
                        humanMediaSubmissionRef.current = null;
                      }}
                      canSendMessage={canCurrentUserSendMessage}
                      canTakeOver={canTakeOverWhatsAppConversation(selectedConversation)}
                      isTakingOver={isUpdatingConversation}
                      onTakeOver={() =>
                        handleVersionedAction(
                          takeOverWhatsAppConversationAction,
                          'Atendimento assumido com sucesso.',
                        )
                      }
                      isSendingMessage={isSendingMessage}
                      onSendMessage={handleSendHumanMessage}
                      feedbackMessage={feedbackTone === 'error' ? '' : feedbackMessage}
                      feedbackTone={feedbackTone}
                    />
                    <button
                      type="button"
                      onClick={() => setIsForwardDialogOpen(true)}
                      disabled={
                        isUpdatingConversation ||
                        !canForwardWhatsAppConversation(selectedConversation)
                      }
                      className={styles.actionButton({ action: 'forward' })}
                    >
                      <Forward aria-hidden="true" />
                      Encaminhar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsStatusDialogOpen(true)}
                      disabled={
                        isUpdatingConversation ||
                        selectedConversation.department !== 'commercial' ||
                        selectedConversation.currentQuoteRequest === null ||
                        selectedConversation.conversationState === 'closed' ||
                        selectedConversation.assignedTo?.id !== currentUserId
                      }
                      className={styles.actionButton({ action: 'read' })}
                    >
                      <Clock3 aria-hidden="true" />
                      Alterar status
                    </button>
                  </div>
                </div>

                <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Encaminhar atendimento</DialogTitle>
                      <DialogDescription>
                        Selecione um departamento diferente do atual.
                      </DialogDescription>
                    </DialogHeader>
                    <Select
                      value={effectiveTargetDepartment}
                      onValueChange={(value) => {
                        if (isWhatsAppConversationDepartment(value)) setTargetDepartment(value);
                      }}
                      disabled={isUpdatingConversation}
                    >
                      <SelectTrigger className="w-full" aria-label="Departamento de destino">
                        <span>{DEPARTMENT_LABELS[effectiveTargetDepartment]}</span>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {WHATSAPP_ROUTABLE_DEPARTMENTS.filter(
                          (department) => department !== selectedConversation.department,
                        ).map((department) => (
                          <SelectItem key={department} value={department}>
                            {DEPARTMENT_LABELS[department]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                      <Button
                        type="button"
                        onClick={handleForward}
                        disabled={isUpdatingConversation}
                      >
                        <Forward aria-hidden="true" />
                        Confirmar encaminhamento
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Alterar status comercial</DialogTitle>
                      <DialogDescription>
                        A alteração será registrada no histórico do atendimento.
                      </DialogDescription>
                    </DialogHeader>
                    <Select
                      value={manualCommercialStatus}
                      onValueChange={(value) => {
                        if (isManualCommercialStatus(value)) {
                          setManualCommercialStatus(value);
                          if (value !== 'rejected' && value !== 'cancelled') {
                            setManualCommercialStatusReason('');
                          }
                        }
                      }}
                      disabled={isUpdatingConversation}
                    >
                      <SelectTrigger className="w-full">
                        <span>{REQUEST_STATUS_LABELS[manualCommercialStatus]}</span>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {MANUAL_COMMERCIAL_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {REQUEST_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {manualCommercialStatus === 'rejected' ||
                    manualCommercialStatus === 'cancelled' ? (
                      <Textarea
                        aria-label="Motivo da alteração do status comercial"
                        value={manualCommercialStatusReason}
                        onChange={(event) => setManualCommercialStatusReason(event.target.value)}
                        minLength={3}
                        maxLength={500}
                        rows={3}
                        placeholder="Informe o motivo para manter a auditoria completa."
                      />
                    ) : null}
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
                      <Button
                        type="button"
                        onClick={handleManualCommercialStatus}
                        disabled={
                          isUpdatingConversation ||
                          manualCommercialStatus === selectedConversation.requestStatus ||
                          ((manualCommercialStatus === 'rejected' ||
                            manualCommercialStatus === 'cancelled') &&
                            manualCommercialStatusReason.trim().length < 3)
                        }
                      >
                        Atualizar status
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Encerrar este atendimento?</DialogTitle>
                      <DialogDescription>
                        A conversa atual será encerrada e preservada no histórico. Quando o cliente
                        enviar uma nova mensagem, o bot iniciará outro atendimento pelo menu
                        principal. O encerramento não é permitido enquanto houver uma proposta em
                        andamento.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <label htmlFor="close-reason" className="text-sm font-medium">
                        Motivo do encerramento
                        {selectedConversation.requestStatus === 'rejected' ? ' (obrigatório)' : ''}
                      </label>
                      <Textarea
                        id="close-reason"
                        value={closeReason}
                        onChange={(event) => setCloseReason(event.target.value)}
                        minLength={3}
                        maxLength={500}
                        required={selectedConversation.requestStatus === 'rejected'}
                        placeholder={
                          selectedConversation.requestStatus === 'rejected'
                            ? 'Informe por que a proposta foi recusada.'
                            : 'Opcional: registre uma observação sobre o encerramento.'
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {closeReason.length}/500 caracteres
                      </p>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>Voltar</DialogClose>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleClose}
                        disabled={
                          isUpdatingConversation ||
                          (selectedConversation.requestStatus === 'rejected' &&
                            closeReason.trim().length < 3)
                        }
                      >
                        {isUpdatingConversation ? 'Encerrando...' : 'Confirmar encerramento'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <section aria-labelledby="quote-request-title" className={styles.quotePanel()}>
                <div className={styles.panelHeading()}>
                  <div>
                    <p className={styles.panelEyebrow()}>Atendimento comercial</p>
                    <h4 id="quote-request-title">Orçamentos</h4>
                  </div>
                  <div className={styles.quoteActions()}>
                    <ConversationQuoteActions
                      conversation={selectedConversation}
                      currentUserId={currentUserId}
                      onChanged={() => {
                        void refreshList(true);
                        void loadConversationDetail(selectedConversation.id);
                      }}
                      onError={(message) => {
                        setFeedbackMessage(message);
                        setFeedbackTone('error');
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsHistoryDialogOpen(true)}
                    >
                      <History aria-hidden="true" />
                      Histórico de ações
                    </Button>
                  </div>
                </div>
              </section>

              <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Histórico de ações da conversa</DialogTitle>
                    <DialogDescription>
                      Alterações de condução, departamento, etapa e status em ordem cronológica.
                    </DialogDescription>
                  </DialogHeader>
                  {actionHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma ação foi registrada nesta conversa.
                    </p>
                  ) : (
                    <div className={styles.closureHistoryList()}>
                      {actionHistory.map((transition) => (
                        <article key={transition.id} className={styles.closureHistoryItem()}>
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <strong>{getTransitionLabel(transition.name)}</strong>
                            <time className="text-xs text-muted-foreground">
                              {formatDateTime(transition.createdAt)}
                            </time>
                          </div>
                          <dl>
                            <div>
                              <dt>Responsável</dt>
                              <dd>{getClosureActor(transition)}</dd>
                            </div>
                            <div>
                              <dt>Departamento</dt>
                              <dd>
                                {DEPARTMENT_LABELS[transition.from.department]} →{' '}
                                {DEPARTMENT_LABELS[transition.to.department]}
                              </dd>
                            </div>
                            <div>
                              <dt>Estado</dt>
                              <dd>
                                {CONVERSATION_STATE_LABELS[transition.from.conversationState]} →{' '}
                                {CONVERSATION_STATE_LABELS[transition.to.conversationState]}
                              </dd>
                            </div>
                            <div>
                              <dt>Motivo</dt>
                              <dd>{getClosureReason(transition) ?? 'Não informado'}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {isUpdatingConversation || (feedbackMessage && feedbackTone !== 'error') ? (
                <footer className={styles.detailFooter()}>
                  <p
                    aria-live="polite"
                    className={styles.feedback({
                      tone: feedbackTone,
                    })}
                  >
                    {isUpdatingConversation ? 'Atualizando atendimento...' : feedbackMessage}
                  </p>
                </footer>
              ) : null}
            </>
          ) : (
            <div className={styles.emptyDetail()}>
              <Inbox aria-hidden="true" className={styles.emptyDetailIcon()} />
              <p className={styles.emptyDetailTitle()}>Selecione uma conversa</p>
              <p className={styles.emptyDetailDescription()}>
                Os detalhes, o histórico e as ações do atendimento aparecerão aqui.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
