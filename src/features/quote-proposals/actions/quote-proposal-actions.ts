'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { isValidCivilDate } from '@/shared/lib/civil-date-time';

import { QuoteProposalRepositoryError } from '../application';
import {
  QUOTE_PROPOSAL_PDF_MIME_TYPE,
  type PendingQuoteProposal,
  type QuoteProposalDocument,
  type QuoteProposalPdfMetadata,
  type SubmittedQuoteProposal,
  validateQuoteProposalPdf,
} from '../domain';
import {
  createQuoteProposalForDashboard,
  decideQuoteProposalForDashboard,
  getPendingQuoteProposalCountForDashboard,
  getPendingQuoteProposalsForDashboard,
  getQuoteProposalDocumentHistoryForDashboard,
  getQuoteProposalsForConversationForDashboard,
  getSentQuoteProposalsForDashboard,
  sendQuoteProposalDocumentForDashboard,
  updateQuoteProposalStatusForDashboard,
  uploadQuoteProposalDocumentForDashboard,
} from '../server';
import { canManageQuoteProposals, canReadQuoteProposals } from '../server/quote-proposal-access';

const identifierSchema = z.string().uuid();
const versionSchema = z.coerce.number().int().positive();
const nullableText = (maximum: number) =>
  z
    .string()
    .max(maximum)
    .transform((value) => value.trim() || null)
    .nullable()
    .optional();
const createProposalSchema = z.object({
  commandId: identifierSchema,
  expectedVersion: versionSchema,
  conversationId: identifierSchema,
  contactName: z.string().trim().min(2).max(160),
  document: nullableText(20),
  email: z
    .union([z.literal(''), z.string().trim().email().max(254), z.null()])
    .transform((value) => value || null)
    .optional(),
  serviceType: z.string().trim().min(2).max(120),
  origin: z.string().trim().min(2).max(300),
  destination: z.string().trim().min(2).max(300),
  departureDate: z.string().refine(isValidCivilDate, 'Informe uma data de saída válida.'),
  departureAt: z.iso.datetime().nullable().optional(),
  returnDate: z
    .union([
      z.literal(''),
      z.string().refine(isValidCivilDate, 'Informe uma data de retorno válida.'),
      z.null(),
    ])
    .transform((value) => value || null)
    .optional(),
  returnAt: z
    .union([z.literal(''), z.iso.datetime(), z.null()])
    .transform((value) => value || null)
    .optional(),
  passengerCount: z.coerce.number().int().min(1).max(1000),
  vehicleType: nullableText(120),
  vehicleAtDisposal: z.boolean(),
  localTransfers: z.boolean(),
  notes: nullableText(2000),
});
const proposalDecisionSchema = z
  .object({
    quoteRequestId: identifierSchema,
    commandId: identifierSchema,
    expectedVersion: versionSchema,
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === 'rejected' && (value.reason?.length ?? 0) < 3) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Informe um breve motivo para a recusa.',
      });
    }
  });
const proposalStatusSchema = z
  .object({
    quoteRequestId: identifierSchema,
    commandId: identifierSchema,
    expectedVersion: versionSchema,
    status: z.enum(['waiting-for-customer', 'under-review', 'approved', 'rejected', 'cancelled']),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.status === 'rejected' || value.status === 'cancelled') &&
      (value.reason?.length ?? 0) < 3
    ) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Informe um breve motivo para o status selecionado.',
      });
    }
  });

export type CreateQuoteProposalActionInput = z.input<typeof createProposalSchema>;
export type DecideQuoteProposalActionInput = z.input<typeof proposalDecisionSchema>;
export type UpdateQuoteProposalStatusActionInput = z.input<typeof proposalStatusSchema>;

export type MutateQuoteProposalActionResult =
  | {
      readonly success: true;
      readonly proposal: PendingQuoteProposal;
    }
  | {
      readonly success: false;
      readonly code:
        | 'unauthorized'
        | 'forbidden'
        | 'validation'
        | 'conflict'
        | 'not-found'
        | 'service-unavailable';
      readonly message: string;
      readonly currentVersion?: number;
    };

export type RefreshQuoteProposalQueueActionResult =
  | {
      readonly success: true;
      readonly pendingProposals: readonly PendingQuoteProposal[];
      readonly pendingTotal: number;
      readonly sentProposals: readonly PendingQuoteProposal[];
      readonly sentTotal: number;
    }
  | {
      readonly success: false;
      readonly message: string;
    };

export type PendingQuoteProposalCountActionResult =
  | {
      readonly success: true;
      readonly pendingTotal: number;
    }
  | {
      readonly success: false;
      readonly message: string;
    };

export type QuoteProposalDocumentHistoryActionResult =
  | {
      readonly success: true;
      readonly documents: readonly QuoteProposalDocument[];
    }
  | {
      readonly success: false;
      readonly message: string;
    };

export type ConversationQuoteProposalsActionResult =
  | {
      readonly success: true;
      readonly proposals: readonly PendingQuoteProposal[];
    }
  | {
      readonly success: false;
      readonly message: string;
    };

export type SendQuoteProposalActionResult =
  | {
      readonly success: true;
      readonly proposal: SubmittedQuoteProposal;
    }
  | {
      readonly success: false;
      readonly code:
        | 'unauthorized'
        | 'forbidden'
        | 'validation'
        | 'conflict'
        | 'not-found'
        | 'service-unavailable';
      readonly message: string;
      readonly uploadedDocument?: QuoteProposalDocument;
      readonly currentVersion?: number;
    };

function errorResult(
  error: unknown,
  uploadedDocument?: QuoteProposalDocument,
): SendQuoteProposalActionResult {
  if (error instanceof QuoteProposalRepositoryError) {
    if (['unauthorized', 'forbidden', 'validation', 'conflict', 'not-found'].includes(error.code)) {
      return {
        success: false,
        code: error.code as 'unauthorized' | 'forbidden' | 'validation' | 'conflict' | 'not-found',
        message: error.message,
        ...(uploadedDocument ? { uploadedDocument } : {}),
        ...(error.currentVersion ? { currentVersion: error.currentVersion } : {}),
      };
    }
  }

  return {
    success: false,
    code: 'service-unavailable',
    message:
      'Não foi possível confirmar o envio. O PDF selecionado foi preservado para nova tentativa.',
    ...(uploadedDocument ? { uploadedDocument } : {}),
  };
}

function mutationErrorResult(error: unknown): MutateQuoteProposalActionResult {
  if (error instanceof QuoteProposalRepositoryError) {
    const code = ['unauthorized', 'forbidden', 'validation', 'conflict', 'not-found'].includes(
      error.code,
    )
      ? (error.code as Exclude<MutateQuoteProposalActionResult, { success: true }>['code'])
      : 'service-unavailable';
    return {
      success: false,
      code,
      message: error.message,
      ...(error.currentVersion ? { currentVersion: error.currentVersion } : {}),
    };
  }
  return {
    success: false,
    code: 'service-unavailable',
    message: 'Não foi possível concluir a alteração.',
  };
}

export async function createQuoteProposalAction(
  input: CreateQuoteProposalActionInput,
): Promise<MutateQuoteProposalActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) {
    return {
      success: false,
      code: 'unauthorized',
      message: 'Sua sessão expirou. Entre novamente.',
    };
  }
  if (!canManageQuoteProposals(session.user)) {
    return {
      success: false,
      code: 'forbidden',
      message: 'Você não tem permissão para cadastrar propostas.',
    };
  }
  const parsed = createProposalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'validation',
      message: parsed.error.issues[0]?.message ?? 'Revise os dados da proposta.',
    };
  }
  try {
    const proposal = await createQuoteProposalForDashboard({
      ...parsed.data,
      departureAt: parsed.data.departureAt ?? null,
    });
    revalidatePath('/quote-proposals');
    revalidatePath('/whatsapp-conversations');
    return { success: true, proposal };
  } catch (error) {
    return mutationErrorResult(error);
  }
}

export async function decideQuoteProposalAction(
  input: DecideQuoteProposalActionInput,
): Promise<MutateQuoteProposalActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) {
    return {
      success: false,
      code: 'unauthorized',
      message: 'Sua sessão expirou. Entre novamente.',
    };
  }
  if (!canManageQuoteProposals(session.user)) {
    return {
      success: false,
      code: 'forbidden',
      message: 'Você não tem permissão para avaliar propostas.',
    };
  }
  const parsed = proposalDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'validation',
      message: parsed.error.issues[0]?.message ?? 'Revise a decisão informada para a proposta.',
    };
  }
  try {
    const proposal = await decideQuoteProposalForDashboard(parsed.data.quoteRequestId, {
      commandId: parsed.data.commandId,
      expectedVersion: parsed.data.expectedVersion,
      decision: parsed.data.decision,
      reason: parsed.data.reason || null,
    });
    revalidatePath('/quote-proposals');
    revalidatePath('/whatsapp-conversations');
    return { success: true, proposal };
  } catch (error) {
    return mutationErrorResult(error);
  }
}

export async function updateQuoteProposalStatusAction(
  input: UpdateQuoteProposalStatusActionInput,
): Promise<MutateQuoteProposalActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null) {
    return {
      success: false,
      code: 'unauthorized',
      message: 'Sua sessão expirou. Entre novamente.',
    };
  }
  if (!canManageQuoteProposals(session.user)) {
    return {
      success: false,
      code: 'forbidden',
      message: 'Você não tem permissão para alterar o status comercial.',
    };
  }
  const parsed = proposalStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: 'validation',
      message: parsed.error.issues[0]?.message ?? 'Revise o status comercial informado.',
    };
  }
  try {
    const proposal = await updateQuoteProposalStatusForDashboard(parsed.data.quoteRequestId, {
      commandId: parsed.data.commandId,
      expectedVersion: parsed.data.expectedVersion,
      status: parsed.data.status,
      reason: parsed.data.reason || null,
    });
    revalidatePath('/quote-proposals');
    revalidatePath('/whatsapp-conversations');
    return { success: true, proposal };
  } catch (error) {
    return mutationErrorResult(error);
  }
}

export async function getPendingQuoteProposalCountAction(): Promise<PendingQuoteProposalCountActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null || !canManageQuoteProposals(session.user)) {
    return {
      success: false,
      message: 'Não foi possível consultar a quantidade de propostas nesta sessão.',
    };
  }

  try {
    return {
      success: true,
      pendingTotal: await getPendingQuoteProposalCountForDashboard(),
    };
  } catch {
    return {
      success: false,
      message: 'Não foi possível consultar a quantidade de propostas.',
    };
  }
}

export async function getQuoteProposalDocumentHistoryAction(
  quoteRequestId: unknown,
): Promise<QuoteProposalDocumentHistoryActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null || !canReadQuoteProposals(session.user)) {
    return {
      success: false,
      message: 'Não foi possível consultar os PDFs nesta sessão.',
    };
  }

  const parsedId = identifierSchema.safeParse(quoteRequestId);
  if (!parsedId.success) {
    return {
      success: false,
      message: 'A solicitação informada é inválida.',
    };
  }

  try {
    const result = await getQuoteProposalDocumentHistoryForDashboard(parsedId.data);
    return {
      success: true,
      documents: result.documents,
    };
  } catch (error) {
    if (error instanceof QuoteProposalRepositoryError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: 'Não foi possível consultar o histórico de PDFs.',
    };
  }
}

export async function getConversationQuoteProposalsAction(
  conversationId: unknown,
): Promise<ConversationQuoteProposalsActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null || !canReadQuoteProposals(session.user)) {
    return {
      success: false,
      message: 'Não foi possível consultar os orçamentos nesta sessão.',
    };
  }

  const parsedId = identifierSchema.safeParse(conversationId);
  if (!parsedId.success) {
    return {
      success: false,
      message: 'A conversa informada é inválida.',
    };
  }

  try {
    return {
      success: true,
      proposals: await getQuoteProposalsForConversationForDashboard(parsedId.data),
    };
  } catch (error) {
    if (error instanceof QuoteProposalRepositoryError) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: 'Não foi possível consultar os orçamentos.',
    };
  }
}

export async function refreshQuoteProposalQueueAction(): Promise<RefreshQuoteProposalQueueActionResult> {
  const session = await getCurrentAuthenticatedSession();
  if (session === null || !canManageQuoteProposals(session.user)) {
    return {
      success: false,
      message: 'Não foi possível atualizar a fila de propostas nesta sessão.',
    };
  }

  try {
    const [pendingQueue, sentQueue] = await Promise.all([
      getPendingQuoteProposalsForDashboard(1, 100),
      getSentQuoteProposalsForDashboard(1, 100),
    ]);
    return {
      success: true,
      pendingProposals: pendingQueue.items,
      pendingTotal: pendingQueue.total,
      sentProposals: sentQueue.items,
      sentTotal: sentQueue.total,
    };
  } catch {
    return {
      success: false,
      message: 'Não foi possível atualizar a fila de propostas.',
    };
  }
}

export async function sendQuoteProposalAction(
  formData: FormData,
): Promise<SendQuoteProposalActionResult> {
  const session = await getCurrentAuthenticatedSession();

  if (session === null) {
    return {
      success: false,
      code: 'unauthorized',
      message: 'Sua sessão expirou. Entre novamente.',
    };
  }

  if (!canManageQuoteProposals(session.user)) {
    return {
      success: false,
      code: 'forbidden',
      message: 'Você não tem permissão para enviar propostas.',
    };
  }

  if (formData.get('confirmed') !== 'true') {
    return {
      success: false,
      code: 'validation',
      message: 'Confirme o envio do orçamento antes de prosseguir.',
    };
  }

  const parsed = z
    .object({
      quoteRequestId: identifierSchema,
      batchId: identifierSchema,
      uploadCommandId: identifierSchema,
      sendCommandId: identifierSchema,
      expectedVersion: versionSchema,
      proposalDocumentId: z.union([identifierSchema, z.literal('')]).optional(),
    })
    .safeParse({
      quoteRequestId: formData.get('quoteRequestId'),
      batchId: formData.get('batchId'),
      uploadCommandId: formData.get('uploadCommandId'),
      sendCommandId: formData.get('sendCommandId'),
      expectedVersion: formData.get('expectedVersion'),
      proposalDocumentId: formData.get('proposalDocumentId') ?? '',
    });

  if (!parsed.success) {
    return {
      success: false,
      code: 'validation',
      message:
        'Os identificadores da proposta estão inválidos. Atualize a página e tente novamente.',
    };
  }

  const batchFiles = formData
    .getAll('files')
    .filter((candidate): candidate is File => candidate instanceof File);
  if (batchFiles.length > 0) {
    const batchCommandsValue = formData.get('batchCommands');
    let decodedCommands: unknown;
    try {
      decodedCommands =
        typeof batchCommandsValue === 'string' ? JSON.parse(batchCommandsValue) : null;
    } catch {
      decodedCommands = null;
    }
    const batchCommands = z
      .array(
        z.object({
          uploadCommandId: identifierSchema,
          sendCommandId: identifierSchema,
        }),
      )
      .min(1)
      .max(5)
      .safeParse(decodedCommands);

    if (!batchCommands.success || batchCommands.data.length !== batchFiles.length) {
      return {
        success: false,
        code: 'validation',
        message: 'Selecione entre 1 e 5 PDFs válidos para o mesmo orçamento.',
      };
    }

    let currentVersion = parsed.data.expectedVersion;
    let lastProposal: SubmittedQuoteProposal | null = null;
    const validatedFiles: Array<{
      readonly file: File;
      readonly metadata: QuoteProposalPdfMetadata;
    }> = [];

    for (const file of batchFiles) {
      const validation = await validateQuoteProposalPdf(file);
      if (!validation.valid) {
        return {
          success: false,
          code: 'validation',
          message: `${file.name}: ${validation.message}`,
        };
      }
      validatedFiles.push({ file, metadata: validation.metadata });
    }

    const uploadedDocuments: QuoteProposalDocument[] = [];
    for (const [index, validated] of validatedFiles.entries()) {
      const commands = batchCommands.data[index]!;
      try {
        const uploadedDocument = await uploadQuoteProposalDocumentForDashboard(
          parsed.data.quoteRequestId,
          {
            commandId: commands.uploadCommandId,
            expectedVersion: parsed.data.expectedVersion,
            file: {
              fileName: validated.metadata.fileName,
              mimeType: validated.metadata.mimeType,
              bytes: new Uint8Array(await validated.file.arrayBuffer()),
            },
          },
        );
        uploadedDocuments.push(uploadedDocument);
      } catch (error) {
        return errorResult(error, uploadedDocuments.at(-1));
      }
    }

    const batchDocumentIds = uploadedDocuments.map((document) => document.id);
    for (const [index, uploadedDocument] of uploadedDocuments.entries()) {
      const commands = batchCommands.data[index]!;
      try {
        lastProposal = await sendQuoteProposalDocumentForDashboard(parsed.data.quoteRequestId, {
          commandId: commands.sendCommandId,
          proposalDocumentId: uploadedDocument.id,
          batchId: parsed.data.batchId,
          batchDocumentIds,
          expectedVersion: currentVersion,
        });
        currentVersion = lastProposal.conversationVersion;
      } catch (error) {
        return errorResult(error, uploadedDocument);
      }
    }

    if (lastProposal === null) {
      return {
        success: false,
        code: 'validation',
        message: 'Selecione ao menos um PDF para enviar.',
      };
    }

    revalidatePath('/quote-proposals');
    revalidatePath('/whatsapp-conversations');
    return { success: true, proposal: lastProposal };
  }

  let uploadedDocument: QuoteProposalDocument | undefined;

  if (parsed.data.proposalDocumentId) {
    uploadedDocument = {
      id: parsed.data.proposalDocumentId,
      fileName: String(formData.get('uploadedFileName') ?? 'proposta.pdf'),
      mimeType: QUOTE_PROPOSAL_PDF_MIME_TYPE,
      sizeBytes: Number(formData.get('uploadedSizeBytes') ?? 0),
      status: 'uploaded',
      sha256: String(formData.get('uploadedSha256') ?? ''),
      providerMessageId: null,
      queuedAt: null,
      sentAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return {
        success: false,
        code: 'validation',
        message: 'Selecione o arquivo PDF do orçamento.',
      };
    }

    const validation = await validateQuoteProposalPdf(file);
    if (!validation.valid) {
      return {
        success: false,
        code: 'validation',
        message: validation.message,
      };
    }

    try {
      uploadedDocument = await uploadQuoteProposalDocumentForDashboard(parsed.data.quoteRequestId, {
        commandId: parsed.data.uploadCommandId,
        expectedVersion: parsed.data.expectedVersion,
        file: {
          fileName: validation.metadata.fileName,
          mimeType: validation.metadata.mimeType,
          bytes: new Uint8Array(await file.arrayBuffer()),
        },
      });
    } catch (error) {
      return errorResult(error);
    }
  }

  try {
    const proposal = await sendQuoteProposalDocumentForDashboard(parsed.data.quoteRequestId, {
      commandId: parsed.data.sendCommandId,
      proposalDocumentId: uploadedDocument.id,
      batchId: parsed.data.batchId,
      batchDocumentIds: [uploadedDocument.id],
      expectedVersion: parsed.data.expectedVersion,
    });

    revalidatePath('/quote-proposals');
    revalidatePath('/whatsapp-conversations');
    return { success: true, proposal };
  } catch (error) {
    return errorResult(error, uploadedDocument);
  }
}
