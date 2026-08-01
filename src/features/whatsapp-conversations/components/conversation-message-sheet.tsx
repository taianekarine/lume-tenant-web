'use client';

import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  MessageCircleMore,
  Paperclip,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useState } from 'react';

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

import { HUMAN_WHATSAPP_MESSAGE_MAX_LENGTH } from '../application';
import type {
  WhatsAppConversation,
  WhatsAppMessageAttachment,
  WhatsAppMessageKind,
} from '../domain';
import { DELIVERY_STATUS_LABELS, MESSAGE_KIND_LABELS } from './conversation-labels';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const DOWNLOADABLE_MEDIA_KINDS = new Set<WhatsAppMessageKind>([
  'image',
  'document',
  'audio',
  'video',
  'sticker',
]);

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

function mediaContentUrl(conversationId: string, messageId: string): string {
  return `/api/whatsapp-conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/content`;
}

function normalizeAttachmentLabel(
  kind: WhatsAppMessageKind,
  attachment: WhatsAppMessageAttachment,
): string {
  const raw = attachment.fileName?.split(/[\\/]/).pop()?.trim() ?? '';
  const withoutEncryptedSuffix = raw.replace(/\.enc$/i, '');
  const mimeType = attachment.mimeType?.toLowerCase().split(';')[0] ?? '';
  const expectedExtension = MIME_EXTENSIONS[mimeType] ?? '';
  let label = withoutEncryptedSuffix || `whatsapp-${kind}`;
  const currentExtension = /\.[a-z0-9]{1,10}$/i.exec(label)?.[0]?.toLowerCase();

  if (expectedExtension && !currentExtension) {
    label += expectedExtension;
  } else if (
    expectedExtension &&
    kind !== 'document' &&
    currentExtension !== expectedExtension
  ) {
    label = `${label.slice(0, -(currentExtension?.length ?? 0))}${expectedExtension}`;
  }

  return label;
}

function AttachmentActions({
  openUrl,
  downloadUrl,
  showOpen = true,
}: {
  readonly openUrl: string;
  readonly downloadUrl: string;
  readonly showOpen?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {showOpen ? (
        <a
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
          Abrir
        </a>
      ) : null}
      <a
        href={`${downloadUrl}?download=1`}
        download
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Download aria-hidden="true" className="size-3.5" />
        Baixar
      </a>
    </span>
  );
}

function UnavailableAttachment({
  label,
  details,
  contentUrl,
}: {
  readonly label: string;
  readonly details: string;
  readonly contentUrl?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/70 p-2 text-foreground">
      <Paperclip aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-xs">{label}</strong>
        <small className="block text-muted-foreground">
          {details} · conteúdo indisponível
        </small>
      </span>
      {contentUrl ? (
        <a
          href={contentUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted"
        >
          Tentar abrir
        </a>
      ) : null}
    </div>
  );
}

function MessageAttachmentPreview({
  conversationId,
  messageId,
  kind,
  attachment,
}: {
  readonly conversationId: string;
  readonly messageId: string;
  readonly kind: WhatsAppMessageKind;
  readonly attachment: WhatsAppMessageAttachment;
}) {
  const label = normalizeAttachmentLabel(kind, attachment);
  const details = `${attachment.mimeType ?? MESSAGE_KIND_LABELS[kind]} · ${formatFileSize(attachment.size)}`;
  const downloadable = DOWNLOADABLE_MEDIA_KINDS.has(kind);
  const proxyUrl = downloadable
    ? mediaContentUrl(conversationId, messageId)
    : undefined;
  const directUrl = attachment.url ?? undefined;
  const encryptedReference =
    /\.enc$/i.test(attachment.fileName ?? '') ||
    (directUrl ? /\.enc(?:$|[?#])/i.test(directUrl) : false);
  const initialSourceUrl =
    proxyUrl && (!directUrl || encryptedReference) ? proxyUrl : directUrl;
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [contentUnavailable, setContentUnavailable] = useState(false);

  function handleContentError() {
    if (proxyUrl && sourceUrl !== proxyUrl) {
      setSourceUrl(proxyUrl);
      return;
    }
    setContentUnavailable(true);
  }

  if (!proxyUrl || !sourceUrl || contentUnavailable) {
    return (
      <UnavailableAttachment
        label={label}
        details={details}
        contentUrl={proxyUrl}
      />
    );
  }

  if (kind === 'image' || kind === 'sticker') {
    return (
      <div className="overflow-hidden rounded-xl border bg-background/70">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Abrir ${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sourceUrl}
            alt={kind === 'sticker' ? 'Figurinha recebida' : label}
            loading="lazy"
            onError={handleContentError}
            className={
              kind === 'sticker'
                ? 'mx-auto max-h-48 w-auto max-w-full object-contain p-2'
                : 'max-h-[28rem] w-full max-w-full object-contain'
            }
          />
        </a>
        <div className="flex min-w-0 items-center justify-between gap-2 border-t px-2 py-1 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{details}</span>
          <AttachmentActions
            openUrl={sourceUrl}
            downloadUrl={proxyUrl}
            showOpen={false}
          />
        </div>
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="overflow-hidden rounded-xl border bg-background/70">
        <video
          src={sourceUrl}
          controls
          preload="metadata"
          onError={handleContentError}
          className="max-h-[28rem] w-full max-w-full bg-black"
          aria-label={label}
        />
        <div className="flex min-w-0 items-center justify-between gap-2 px-2 py-1 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{details}</span>
          <AttachmentActions
            openUrl={sourceUrl}
            downloadUrl={proxyUrl}
            showOpen={false}
          />
        </div>
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="min-w-0 rounded-xl border bg-background/70 p-2">
        <audio
          src={sourceUrl}
          controls
          preload="metadata"
          onError={handleContentError}
          className="h-10 w-full min-w-0"
          aria-label={label}
        />
        <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{details}</span>
          <AttachmentActions
            openUrl={sourceUrl}
            downloadUrl={proxyUrl}
            showOpen={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/70 p-2 text-foreground">
      <FileText aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-xs">{label}</strong>
        <small className="block truncate text-muted-foreground">{details}</small>
      </span>
      <AttachmentActions openUrl={sourceUrl} downloadUrl={proxyUrl} />
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
  readonly onRefresh: () => void;
  readonly messageDraft: string;
  readonly onMessageDraftChange: (value: string) => void;
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
  onRefresh,
  messageDraft,
  onMessageDraftChange,
  canSendMessage,
  canTakeOver,
  isTakingOver,
  onTakeOver,
  isSendingMessage,
  onSendMessage,
  feedbackMessage,
  feedbackTone,
}: ConversationMessageSheetProps) {
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
          {conversation.messages.length}
        </span>
      </SheetTrigger>

      <SheetContent className="w-full gap-0 overflow-x-hidden data-[side=right]:w-full sm:max-w-none sm:data-[side=right]:w-[min(84rem,calc(100vw-2rem))]">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Conversa com {conversation.contact.name}</SheetTitle>
          <SheetDescription>
            {conversation.contact.phone} · mensagens e anexos persistidos pela Tenant API
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6">
          {isLoading && !isLoaded ? (
            <div className="space-y-4" role="status">
              <span className="sr-only">Carregando histórico completo...</span>
              <Skeleton className="h-20 w-3/4 rounded-2xl" />
              <Skeleton className="ml-auto h-24 w-2/3 rounded-2xl" />
              <Skeleton className="h-16 w-1/2 rounded-2xl" />
            </div>
          ) : detailError ? (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              <span className="flex items-center gap-2">
                <AlertCircle aria-hidden="true" />
                {detailError}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Tentar novamente
              </Button>
            </div>
          ) : conversation.messages.length > 0 ? (
            <div className="space-y-5">
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
                      <Bubble variant={isOutbound ? 'tinted' : 'secondary'}>
                        <BubbleContent>
                          <div className="space-y-2">
                            {message.text ? (
                              <p className="whitespace-pre-wrap">{message.text}</p>
                            ) : null}
                            {message.attachment ? (
                              <MessageAttachmentPreview
                                conversationId={conversation.id}
                                messageId={message.id}
                                kind={message.kind}
                                attachment={message.attachment}
                              />
                            ) : null}
                            {failedAttempt ? (
                              <p className="flex items-start gap-1 text-xs text-destructive">
                                <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5" />
                                <span>
                                  {failedAttempt.errorMessage ??
                                    'Não foi possível enviar esta mensagem. Tente novamente.'}
                                </span>
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
                  ? 'shrink-0 whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300'
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
                messageDraft.trim().length > 0
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
                disabled={!canSendMessage || isSendingMessage || messageDraft.trim().length === 0}
              >
                {isSendingMessage ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <Send aria-hidden="true" className="size-3.5" />
                )}
                {isSendingMessage ? 'Enviando...' : 'Enviar mensagem'}
              </Button>
            </div>
          </div>
          {feedbackMessage ? (
            <p
              aria-live="polite"
              className={
                feedbackTone === 'error'
                  ? 'text-sm text-destructive'
                  : feedbackTone === 'success'
                    ? 'text-sm text-emerald-700 dark:text-emerald-300'
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
