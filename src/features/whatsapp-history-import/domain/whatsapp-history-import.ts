import { z } from 'zod';

export const WHATSAPP_HISTORY_STATES = [
  'human-queue',
  'human-active',
  'closed',
  'bot-menu',
] as const;

export const WHATSAPP_HISTORY_DEPARTMENTS = [
  'commercial',
  'purchasing',
  'controlling',
  'personnel-department',
  'financial',
  'management',
  'maintenance',
  'monitoring',
  'operations',
] as const;

export const WHATSAPP_HISTORY_STATE_LABELS: Record<
  (typeof WHATSAPP_HISTORY_STATES)[number],
  string
> = {
  'human-queue': 'Aguardando atendimento humano',
  'human-active': 'Atendimento humano ativo',
  closed: 'Atendimento encerrado',
  'bot-menu': 'Bot no menu inicial',
};

export const WHATSAPP_HISTORY_DEPARTMENT_LABELS: Record<
  (typeof WHATSAPP_HISTORY_DEPARTMENTS)[number],
  string
> = {
  commercial: 'Comercial',
  purchasing: 'Compras',
  controlling: 'Controladoria',
  'personnel-department': 'Departamento Pessoal',
  financial: 'Financeiro',
  management: 'Gerência',
  maintenance: 'Manutenção',
  monitoring: 'Monitoramento',
  operations: 'Operacional',
};

export const WHATSAPP_HISTORY_REVIEW_FILTER_LABELS = {
  'needs-review': 'Pendentes de revisão',
  ready: 'Revisados',
  all: 'Todos',
} as const;

export type WhatsAppHistoryReviewFilter = keyof typeof WHATSAPP_HISTORY_REVIEW_FILTER_LABELS;

const senderSchema = z.object({
  name: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
});

export const whatsAppHistoryArchiveSchema = z.object({
  archiveId: z.string().min(1),
  archiveName: z.string().min(1),
  contactName: z.string().nullable(),
  phoneE164: z.string().nullable(),
  companySenderName: z.string().nullable(),
  state: z.enum(WHATSAPP_HISTORY_STATES).nullable(),
  departmentCode: z.enum(WHATSAPP_HISTORY_DEPARTMENTS),
  ownerUsername: z.string().nullable(),
  senders: z.array(senderSchema),
  messageCount: z.number().int().nonnegative(),
  attachmentCount: z.number().int().nonnegative(),
  missingAttachmentCount: z.number().int().nonnegative(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  status: z.enum(['ready', 'needs-review']),
  issues: z.array(z.string()),
});

export const whatsAppHistoryImportBatchSchema = z.object({
  schemaVersion: z.string(),
  mode: z.enum(['zip-exports', 'android-backup']),
  id: z.string().uuid(),
  channel: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    phoneE164: z.string().min(1),
  }),
  status: z.enum(['draft', 'applying', 'applied', 'failed']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  appliedAt: z.string().datetime().nullable(),
  totals: z.object({
    archives: z.number().int().nonnegative(),
    ready: z.number().int().nonnegative(),
    needsReview: z.number().int().nonnegative(),
    messages: z.number().int().nonnegative(),
    attachments: z.number().int().nonnegative(),
    missingAttachments: z.number().int().nonnegative(),
  }),
  archives: z.array(whatsAppHistoryArchiveSchema),
  androidBackup: z
    .object({
      databaseFileName: z.string().min(1),
      encryptedBytes: z.number().int().positive(),
      decryptedBytes: z.number().int().positive(),
      summary: z.object({
        schemaVersion: z.string(),
        directConversations: z.number().int().nonnegative(),
        directMessages: z.number().int().nonnegative(),
        mediaReferences: z.number().int().nonnegative(),
        groupConversationsExcluded: z.number().int().nonnegative(),
        groupMessagesExcluded: z.number().int().nonnegative(),
        otherConversationsExcluded: z.number().int().nonnegative(),
        otherMessagesExcluded: z.number().int().nonnegative(),
        unmappedDirectConversations: z.number().int().nonnegative(),
        startedAt: z.string().datetime().nullable(),
        endedAt: z.string().datetime().nullable(),
      }),
      state: z.enum(WHATSAPP_HISTORY_STATES),
      departmentCode: z.enum(WHATSAPP_HISTORY_DEPARTMENTS),
      ownerUsername: z.string().nullable(),
      chunksCompleted: z.number().int().nonnegative(),
      conversationsProcessed: z.number().int().nonnegative(),
      messagesProcessed: z.number().int().nonnegative(),
      errorMessage: z.string().nullable(),
    })
    .nullable(),
});

export const whatsAppHistoryChannelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  phoneNumber: z.string().min(1),
});

export type WhatsAppHistoryImportBatch = z.infer<typeof whatsAppHistoryImportBatchSchema>;
export type WhatsAppHistoryArchive = z.infer<typeof whatsAppHistoryArchiveSchema>;
export type WhatsAppHistoryChannel = z.infer<typeof whatsAppHistoryChannelSchema>;
export type WhatsAppHistoryState = (typeof WHATSAPP_HISTORY_STATES)[number];
export type WhatsAppHistoryDepartment = (typeof WHATSAPP_HISTORY_DEPARTMENTS)[number];
