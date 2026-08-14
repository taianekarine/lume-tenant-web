'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  AlertCircle,
  Download,
  ExternalLink,
  LoaderCircle,
  MessageCircleMore,
  Paperclip,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';

import { CurrentUserAvatar } from '@/shared/current-user-avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Bubble, BubbleContent } from '@/shared/ui/bubble';
import { Button } from '@/shared/ui/button';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/shared/ui/message';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from '@/shared/ui/toast';

import { HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH } from '../application';
import type {
  WhatsAppConversation,
  WhatsAppMessageAttachment,
  WhatsAppMessageKind,
} from '../domain';
import { resolveConversationHistoryScrollTop } from './conversation-history-scroll';
import { DELIVERY_STATUS_LABELS, MESSAGE_KIND_LABELS } from './conversation-labels';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'text/vcard': '.vcf',
  'text/x-vcard': '.vcf',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function formatFileSize(size: number | null): string {
  if (size === null) return 'Tamanho não informado';
  if (size < 1_024) return `${size} bytes`;
  if (size < 1_048_576) return `${(size / 1_024).toFixed(1)} KB`;
  return `${(size / 1_048_576).toFixed(1)} MB`;
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?';
}

function normalizeAttachmentLabel(
  kind: WhatsAppMessageKind,
  attachment: WhatsAppMessageAttachment,
): string {
  const raw = attachment.fileName?.split(/[\\/]/).pop()?.trim() ?? '';
  const withoutEncryptedSuffix = raw.replace(/\.enc$/i, '');
  const mimeType = attachment.mimeType?.toLowerCase().split(';')[0] ?? '';
  const expectedExtension = MIME_EXTENSIONS[mimeType] ?? '';
  let label = withoutEncryptedSuffix || MESSAGE_KIND_LABELS[kind];
  const currentExtension = /\.[a-z0-9]{1,10}$/i.exec(label)?.[0]?.toLowerCase();

  if (expectedExtension && !currentExtension) {
    label += expectedExtension;
  } else if (expectedExtension && kind !== 'document' && currentExtension !== expectedExtension) {
    label = `${label.slice(0, -(currentExtension?.length ?? 0))}${expectedExtension}`;
  }

  return label;
}

function AttachmentActions({
  contentUrl,
  showOpen = true,
}: {
  readonly contentUrl: string;
  readonly showOpen?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {showOpen ? (
        <a
          href={contentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
          Abrir
        </a>
      ) : null}
      <a
        href={`${contentUrl}?download=1`}
        download
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Download aria-hidden="true" className="size-3.5" />
        Baixar
      </a>
    </span>
  );
}

function MessageAttachmentPreview({
  kind,
  attachment,
}: {
  readonly kind: WhatsAppMessageKind;
  readonly attachment: WhatsAppMessageAttachment;
}) {
  const [contentUnavailable, setContentUnavailable] = useState(false);
  const [contentRequested, setContentRequested] = useState(false);
  const label = normalizeAttachmentLabel(kind, attachment);
  const formatLabel =
    attachment.mimeType === 'application/pdf' ? 'Documento PDF' : MESSAGE_KIND_LABELS[kind];
  const details = `${formatLabel} · ${formatFileSize(attachment.size)}`;

  if (!attachment.url || contentUnavailable) {
    const unavailableReason =
      attachment.retentionStatus === 'too-large'
        ? 'arquivo acima do limite permitido'
        : 'arquivo não está mais disponível';
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/70 p-2 text-foreground">
        <Paperclip aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-xs">{label}</strong>
          <small className="block text-muted-foreground">
            {details} · {unavailableReason}
          </small>
        </span>
      </div>
    );
  }

  const contentUrl = attachment.url;
  const requiresExplicitLoad =
    kind === 'image' || kind === 'sticker' || kind === 'video' || kind === 'audio';

  if (requiresExplicitLoad && !contentRequested) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/70 p-2 text-foreground">
        <Paperclip aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-xs">{label}</strong>
          <small className="block text-muted-foreground">{details}</small>
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setContentRequested(true)}>
          Carregar mídia
        </Button>
      </div>
    );
  }

  if (kind === 'image' || kind === 'sticker') {
    return (
      <div className="overflow-hidden rounded-xl border bg-background/70">
        <a
          href={contentUrl}
          target="_blank"
          rel="noreferrer"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Abrir ${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={contentUrl}
            alt={kind === 'sticker' ? 'Figurinha recebida' : label}
            loading="lazy"
            onError={() => setContentUnavailable(true)}
            className={
              kind === 'sticker'
                ? 'mx-auto max-h-48 w-auto max-w-full object-contain p-2'
                : 'max-h-[28rem] w-full max-w-full object-contain'
            }
          />
        </a>
        <div className="flex min-w-0 items-center justify-between gap-2 border-t px-2 py-1 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{details}</span>
          <AttachmentActions contentUrl={contentUrl} showOpen={false} />
        </div>
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="overflow-hidden rounded-xl border bg-background/70">
        <video
          src={contentUrl}
          controls
          preload="metadata"
          onError={() => setContentUnavailable(true)}
          className="max-h-[28rem] w-full max-w-full bg-black"
          aria-label={label}
        />
        <div className="flex min-w-0 items-center justify-between gap-2 px-2 py-1 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{details}</span>
          <AttachmentActions contentUrl={contentUrl} showOpen={false} />
        </div>
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="min-w-0 rounded-xl border bg-background/70 p-2">
        <audio
          src={contentUrl}
          controls
          preload="metadata"
          onError={() => setContentUnavailable(true)}
          className="h-10 w-full min-w-0"
          aria-label={label}
        />
        <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{details}</span>
          <AttachmentActions contentUrl={contentUrl} showOpen={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/70 p-2 text-foreground">
      <Paperclip aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-xs">{label}</strong>
        <small className="block truncate text-muted-foreground">{details}</small>
      </span>
      <AttachmentActions contentUrl={contentUrl} />
    </div>
  );
}

export interface ConversationMessageSheetProps {
  readonly conversation: WhatsAppConversation;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly isLoading: boolean;
  readonly isLoaded: boolean;
  readonly detailError: string;
  readonly onRetry: () => void;
  readonly onLoadOlder: () => void;
  readonly isLoadingOlder: boolean;
  readonly onRefresh: () => void;
  readonly messageDraft: string;
  readonly onMessageDraftChange: (value: string) => void;
  readonly selectedAttachment: File | null;
  readonly onSelectedAttachmentChange: (file: File | null) => void;
  readonly canSendMessage: boolean;
  readonly canTakeOver: boolean;
  readonly isTakingOver: boolean;
  readonly onTakeOver: () => void;
  readonly isSendingMessage: boolean;
  readonly onSendMessage: () => void;
  readonly feedbackMessage: string;
  readonly feedbackTone: 'neutral' | 'success' | 'error';
}

export function ConversationMessageSheet({
  conversation,
  open,
  onOpenChange,
  isLoading,
  isLoaded,
  detailError,
  onRetry,
  onLoadOlder,
  isLoadingOlder,
  onRefresh,
  messageDraft,
  onMessageDraftChange,
  selectedAttachment,
  onSelectedAttachmentChange,
  canSendMessage,
  canTakeOver,
  isTakingOver,
  onTakeOver,
  isSendingMessage,
  onSendMessage,
  feedbackMessage,
  feedbackTone,
}: ConversationMessageSheetProps) {
  const historyRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const initialScrollFrameRef = useRef<number | null>(null);
  const previousHistoryRef = useRef({
    open: false,
    loaded: false,
    conversationId: '',
    firstId: '',
    lastId: '',
    scrollHeight: 0,
    scrollTop: 0,
    clientHeight: 0,
  });
  const firstMessageId = conversation.messages[0]?.id ?? '';
  const lastMessageId = conversation.messages.at(-1)?.id ?? '';
  const bindHistoryRef = useCallback(
    (history: HTMLDivElement | null) => {
      historyRef.current = history;
      if (initialScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(initialScrollFrameRef.current);
        initialScrollFrameRef.current = null;
      }
      if (!history || !open || !isLoaded) return;

      const scrollToLatestMessage = () => {
        if (historyRef.current !== history) return;
        history.scrollTop = history.scrollHeight;
        previousHistoryRef.current.conversationId = conversation.id;
        previousHistoryRef.current.scrollHeight = history.scrollHeight;
        previousHistoryRef.current.scrollTop = history.scrollTop;
        previousHistoryRef.current.clientHeight = history.clientHeight;
      };

      scrollToLatestMessage();
      initialScrollFrameRef.current = window.requestAnimationFrame(scrollToLatestMessage);
    },
    [conversation.id, isLoaded, open],
  );

  useEffect(() => {
    if (!open || !detailError) return;
    toast.add({
      title: 'Histórico não carregado',
      description: 'Não foi possível carregar as mensagens. Tente novamente.',
      type: 'error',
    });
  }, [detailError, open]);

  useLayoutEffect(() => {
    const history = historyRef.current;
    if (!history || !open || !isLoaded) return;
    const previous = previousHistoryRef.current;
    const openingHistory =
      !previous.open || !previous.loaded || previous.conversationId !== conversation.id;
    const prependedMessages =
      previous.firstId !== '' &&
      previous.firstId !== firstMessageId &&
      previous.lastId === lastMessageId;
    const wasNearBottom = previous.scrollHeight - previous.scrollTop - previous.clientHeight < 80;
    const nextScrollTop = resolveConversationHistoryScrollTop({
      openingHistory,
      prependedMessages,
      appendedMessages: previous.lastId !== lastMessageId,
      wasNearBottom,
      currentScrollHeight: history.scrollHeight,
      previousScrollHeight: previous.scrollHeight,
      previousScrollTop: previous.scrollTop,
    });

    if (nextScrollTop !== null) history.scrollTop = nextScrollTop;

    previousHistoryRef.current = {
      open,
      loaded: isLoaded,
      conversationId: conversation.id,
      firstId: firstMessageId,
      lastId: lastMessageId,
      scrollHeight: history.scrollHeight,
      scrollTop: history.scrollTop,
      clientHeight: history.clientHeight,
    };
  }, [conversation.id, firstMessageId, isLoaded, lastMessageId, open]);

  useEffect(() => {
    const history = historyRef.current;
    if (!history || !open || !isLoaded) return;

    history.scrollTop = history.scrollHeight;
    previousHistoryRef.current.scrollHeight = history.scrollHeight;
    previousHistoryRef.current.scrollTop = history.scrollTop;
    previousHistoryRef.current.clientHeight = history.clientHeight;
  }, [conversation.id, isLoaded, open]);

  useEffect(() => {
    if (open) return;
    previousHistoryRef.current.open = false;
    previousHistoryRef.current.loaded = false;
  }, [open]);

  useEffect(
    () => () => {
      if (initialScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(initialScrollFrameRef.current);
      }
    },
    [],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="h-9 whitespace-nowrap" />
        }
      >
        <MessageCircleMore aria-hidden="true" />
        <span className="sr-only">Mensagens e anexos — </span>
        Abrir chat
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {conversation.messageHistory?.total ?? conversation.messages.length}
        </span>
      </SheetTrigger>

      <SheetContent className="w-full gap-0 overflow-x-hidden data-[side=right]:w-full sm:!max-w-none sm:data-[side=right]:w-[min(60rem,calc(100vw-3rem))]">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Conversa com {conversation.contact.name}</SheetTitle>
          <SheetDescription>
            {conversation.contact.phone} · Mensagens e anexos salvos.
          </SheetDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
            onClick={onRefresh}
          >
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
        </SheetHeader>

        <div
          ref={bindHistoryRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 p-4 sm:p-6"
          onScroll={(event) => {
            const history = event.currentTarget;
            previousHistoryRef.current.scrollHeight = history.scrollHeight;
            previousHistoryRef.current.scrollTop = history.scrollTop;
            previousHistoryRef.current.clientHeight = history.clientHeight;
            if (
              history.scrollTop <= 64 &&
              !isLoadingOlder &&
              conversation.messageHistory &&
              conversation.messageHistory.page < conversation.messageHistory.totalPages
            ) {
              onLoadOlder();
            }
          }}
        >
          {isLoading && !isLoaded ? (
            <div className="space-y-4" role="status">
              <span className="sr-only">Carregando histórico completo...</span>
              <Skeleton className="h-20 w-3/4 rounded-2xl" />
              <Skeleton className="ml-auto h-24 w-2/3 rounded-2xl" />
              <Skeleton className="h-16 w-1/2 rounded-2xl" />
            </div>
          ) : detailError ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">O histórico não pôde ser carregado.</p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Tentar novamente
              </Button>
            </div>
          ) : conversation.messages.length > 0 ? (
            <div className="space-y-5">
              {conversation.messageHistory &&
              conversation.messageHistory.page < conversation.messageHistory.totalPages ? (
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLoadingOlder}
                      onClick={onLoadOlder}
                    >
                      {isLoadingOlder
                        ? 'Carregando mensagens anteriores...'
                        : 'Carregar 100 mensagens anteriores'}
                    </Button>
                    <small className="text-muted-foreground" aria-live="polite">
                      Exibindo {conversation.messages.length.toLocaleString('pt-BR')} de{' '}
                      {conversation.messageHistory.total.toLocaleString('pt-BR')} mensagens
                    </small>
                  </div>
                </div>
              ) : null}
              {conversation.messages.map((message) => {
                const isOutbound = message.direction === 'outbound';
                const failedAttempt = [...message.attempts]
                  .reverse()
                  .find((attempt) => attempt.status === 'failed');
                const messageMetadata = [
                  formatDateTime(message.occurredAt),
                  ...(isOutbound
                    ? [message.sentBy?.name ?? conversation.assignedTo?.name ?? 'Atendente']
                    : []),
                  DELIVERY_STATUS_LABELS[message.deliveryStatus],
                ].join(' · ');

                return (
                  <Message key={message.id} align={isOutbound ? 'end' : 'start'}>
                    <MessageAvatar>
                      {isOutbound ? (
                        <CurrentUserAvatar
                          name={
                            message.sentBy?.name ?? conversation.assignedTo?.name ?? 'Atendimento'
                          }
                          imageAlt="Foto do atendente"
                        />
                      ) : (
                        <Avatar>
                          {conversation.contact.profilePictureUrl ? (
                            <AvatarImage
                              src={conversation.contact.profilePictureUrl}
                              alt={conversation.contact.name}
                            />
                          ) : null}
                          <AvatarFallback>{getInitial(conversation.contact.name)}</AvatarFallback>
                        </Avatar>
                      )}
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader>
                        {isOutbound ? 'Atendimento' : conversation.contact.name}
                      </MessageHeader>
                      <Bubble
                        variant={isOutbound ? 'tinted' : 'secondary'}
                        className="max-w-[88%] sm:max-w-[80%] xl:max-w-[42rem]"
                      >
                        <BubbleContent>
                          <div className="space-y-2">
                            {message.text ? (
                              <p className="whitespace-pre-wrap break-words leading-6 [overflow-wrap:anywhere]">
                                {message.text}
                              </p>
                            ) : null}
                            {message.attachment ? (
                              <MessageAttachmentPreview
                                kind={message.kind}
                                attachment={message.attachment}
                              />
                            ) : null}
                            {failedAttempt ? (
                              <p className="flex items-start gap-1 text-xs text-destructive-emphasis">
                                <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5" />
                                <span>Não foi possível enviar esta mensagem. Tente novamente.</span>
                              </p>
                            ) : null}
                          </div>
                        </BubbleContent>
                      </Bubble>
                      <MessageFooter className="w-full max-w-full min-w-0 justify-center text-center text-[11px] sm:text-xs">
                        <span
                          className="block w-full min-w-0 max-w-full whitespace-normal break-words text-center [overflow-wrap:anywhere]"
                          data-occurred-at={message.occurredAt}
                        >
                          {messageMetadata}
                        </span>
                      </MessageFooter>
                    </MessageContent>
                  </Message>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center">
              <MessageCircleMore aria-hidden="true" className="size-9 text-muted-foreground" />
              <strong>Nenhuma mensagem registrada</strong>
              <p className="max-w-sm text-sm text-muted-foreground">
                As próximas mensagens e anexos desta conversa aparecerão aqui.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Responder pelo painel</p>
              <p className="text-xs text-muted-foreground">
                {canSendMessage
                  ? 'Envio autorizado para o atendente responsável.'
                  : 'Assuma esta conversa para responder ao cliente.'}
              </p>
            </div>
            <span
              className={
                canSendMessage
                  ? 'shrink-0 whitespace-nowrap rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success-emphasis'
                  : 'shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground'
              }
            >
              {canSendMessage ? 'Atendente ativo' : 'Envio bloqueado'}
            </span>
          </div>
          <Textarea
            id="human-message"
            value={messageDraft}
            onChange={(event) => onMessageDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                canSendMessage &&
                (messageDraft.trim().length > 0 || selectedAttachment !== null)
              ) {
                event.preventDefault();
                onSendMessage();
              }
            }}
            maxLength={HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH}
            rows={4}
            disabled={!canSendMessage || isSendingMessage}
            placeholder={
              canSendMessage
                ? `Responder para ${conversation.contact.name}`
                : 'Assuma esta conversa para responder ao cliente.'
            }
            aria-label={`Mensagem para ${conversation.contact.name}`}
          />
          <input
            ref={attachmentInputRef}
            type="file"
            className="sr-only"
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.vcf,text/vcard,text/x-vcard"
            disabled={!canSendMessage || isSendingMessage}
            onChange={(event) => {
              onSelectedAttachmentChange(event.target.files?.item(0) ?? null);
              event.currentTarget.value = '';
            }}
          />
          {selectedAttachment ? (
            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/30 p-2">
              <Paperclip aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{selectedAttachment.name}</strong>
                <small className="text-muted-foreground">
                  {formatFileSize(selectedAttachment.size)}
                </small>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover anexo"
                disabled={isSendingMessage}
                onClick={() => onSelectedAttachmentChange(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="whitespace-nowrap text-xs text-muted-foreground">
              {messageDraft.length.toLocaleString('pt-BR')} /{' '}
              {HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH.toLocaleString('pt-BR')} caracteres
            </p>
            <div
              className={
                !canSendMessage && canTakeOver
                  ? 'grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 overflow-x-hidden'
                  : 'grid w-full min-w-0 max-w-full grid-cols-1 overflow-x-hidden'
              }
            >
              {canSendMessage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-w-0 max-w-full gap-1 overflow-hidden px-1 text-xs sm:px-2.5 sm:text-sm"
                  disabled={isSendingMessage}
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <Paperclip aria-hidden="true" className="size-3.5" />
                  Anexar arquivo
                </Button>
              ) : null}
              {!canSendMessage && canTakeOver ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-w-0 max-w-full gap-1 overflow-hidden px-1 text-xs sm:px-2.5 sm:text-sm"
                  onClick={onTakeOver}
                  disabled={isTakingOver}
                >
                  {isTakingOver ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : null}
                  {isTakingOver ? 'Assumindo...' : 'Assumir atendimento'}
                </Button>
              ) : null}
              <Button
                type="button"
                className="w-full min-w-0 max-w-full gap-1 overflow-hidden px-1 text-xs sm:px-2.5 sm:text-sm"
                onClick={onSendMessage}
                disabled={
                  !canSendMessage ||
                  isSendingMessage ||
                  (messageDraft.trim().length === 0 && selectedAttachment === null)
                }
              >
                {isSendingMessage ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="size-3.5" />
                )}
                {isSendingMessage
                  ? 'Enviando...'
                  : selectedAttachment
                    ? 'Enviar anexo'
                    : 'Enviar mensagem'}
              </Button>
            </div>
          </div>
          {feedbackMessage ? (
            <p
              aria-live="polite"
              className={
                feedbackTone === 'error'
                  ? 'text-sm text-destructive-emphasis'
                  : feedbackTone === 'success'
                    ? 'text-sm text-success-emphasis'
                    : 'text-sm text-muted-foreground'
              }
            >
              {feedbackMessage}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
