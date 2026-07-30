/** @jest-environment node */

import { revalidatePath } from 'next/cache';

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
  type Permission,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';

import { QuoteProposalRepositoryError } from '../application';
import {
  createQuoteProposalForDashboard,
  decideQuoteProposalForDashboard,
  getPendingQuoteProposalCountForDashboard,
  getQuoteProposalDocumentHistoryForDashboard,
  sendQuoteProposalDocumentForDashboard,
  updateQuoteProposalStatusForDashboard,
  uploadQuoteProposalDocumentForDashboard,
} from '../server';
import { createPendingQuoteProposalFixture } from '../testing/quote-proposal-fixture';
import {
  createQuoteProposalAction,
  decideQuoteProposalAction,
  getPendingQuoteProposalCountAction,
  getQuoteProposalDocumentHistoryAction,
  sendQuoteProposalAction,
  updateQuoteProposalStatusAction,
} from './quote-proposal-actions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));
jest.mock('../server', () => ({
  createQuoteProposalForDashboard: jest.fn(),
  decideQuoteProposalForDashboard: jest.fn(),
  getPendingQuoteProposalCountForDashboard: jest.fn(),
  getQuoteProposalDocumentHistoryForDashboard: jest.fn(),
  sendQuoteProposalDocumentForDashboard: jest.fn(),
  updateQuoteProposalStatusForDashboard: jest.fn(),
  uploadQuoteProposalDocumentForDashboard: jest.fn(),
}));

const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedCreate = jest.mocked(createQuoteProposalForDashboard);
const mockedDecide = jest.mocked(decideQuoteProposalForDashboard);
const mockedPendingCount = jest.mocked(getPendingQuoteProposalCountForDashboard);
const mockedDocumentHistory = jest.mocked(getQuoteProposalDocumentHistoryForDashboard);
const mockedUpload = jest.mocked(uploadQuoteProposalDocumentForDashboard);
const mockedSend = jest.mocked(sendQuoteProposalDocumentForDashboard);
const mockedUpdateStatus = jest.mocked(updateQuoteProposalStatusForDashboard);

const quoteRequestId = '00000000-0000-4000-8000-000000000401';
const documentId = '00000000-0000-4000-8000-000000000501';
const batchId = '00000000-0000-4000-8000-000000000700';
const uploadCommandId = '00000000-0000-4000-8000-000000000701';
const sendCommandId = '00000000-0000-4000-8000-000000000702';

function createSession(permissions: readonly Permission[]): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-001',
    user: {
      id: 'employee-001',
      name: 'Usuário Comercial',
      type: 'employee',
      departments: ['commercial'],
      permissions,
      clientCategory: null,
      isActive: true,
    },
    issuedAt: '2026-07-21T12:00:00.000Z',
    expiresAt: '2026-07-21T20:00:00.000Z',
    rememberDevice: false,
  };
}

function pdfFile(name = 'orcamento.pdf') {
  return new File(['%PDF-1.7\nconteudo\n%%EOF'], name, {
    type: 'application/pdf',
  });
}

function formData(file: File | null = pdfFile()) {
  const data = new FormData();
  data.set('quoteRequestId', quoteRequestId);
  data.set('batchId', batchId);
  data.set('uploadCommandId', uploadCommandId);
  data.set('sendCommandId', sendCommandId);
  data.set('expectedVersion', '8');
  data.set('confirmed', 'true');
  if (file) data.set('file', file);
  return data;
}

const uploadedDocument = {
  id: documentId,
  status: 'uploaded' as const,
  fileName: 'orcamento.pdf',
  mimeType: 'application/pdf' as const,
  sizeBytes: 24,
  sha256: 'a'.repeat(64),
};

describe('quote proposal server action', () => {
  beforeEach(() => {
    mockedSession.mockResolvedValue(createSession(['whatsapp-conversations:manage']));
    mockedUpload.mockResolvedValue(uploadedDocument);
    mockedSend.mockResolvedValue({
      proposalDocument: { ...uploadedDocument, status: 'queued' },
      conversationId: '00000000-0000-4000-8000-000000000101',
      conversationVersion: 9,
      conversationState: 'sent-to-human',
      messageId: '00000000-0000-4000-8000-000000000601',
      deliveryStatus: 'pending',
      idempotent: false,
    });
    mockedCreate.mockResolvedValue(createPendingQuoteProposalFixture());
    mockedUpdateStatus.mockResolvedValue(
      createPendingQuoteProposalFixture({
        requestStatus: 'cancelled',
        decision: {
          status: 'cancelled',
          reason: 'Cliente desistiu do atendimento.',
          decidedAt: '2026-07-29T14:00:00.000Z',
          decidedBy: {
            id: 'employee-001',
            name: 'Usuário Comercial',
          },
        },
      }),
    );
    mockedPendingCount.mockResolvedValue(37);
    mockedDocumentHistory.mockResolvedValue({
      quoteRequestId,
      documents: [uploadedDocument],
    });
    mockedDecide.mockResolvedValue(
      createPendingQuoteProposalFixture({
        stage: 'sent',
        decision: {
          status: 'rejected',
          reason: 'Cliente alterou o roteiro.',
          decidedAt: '2026-07-28T12:00:00.000Z',
          decidedBy: {
            id: '00000000-0000-4000-8000-000000000801',
            name: 'Atendente Comercial',
          },
        },
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requires an authenticated manager and explicit confirmation', async () => {
    mockedSession.mockResolvedValue(createSession(['dashboard:view']));

    await expect(sendQuoteProposalAction(formData())).resolves.toMatchObject({
      success: false,
      code: 'forbidden',
    });
    expect(mockedUpload).not.toHaveBeenCalled();

    mockedSession.mockResolvedValue(createSession(['whatsapp-conversations:manage']));
    const unconfirmed = formData();
    unconfirmed.delete('confirmed');
    await expect(sendQuoteProposalAction(unconfirmed)).resolves.toMatchObject({
      success: false,
      code: 'validation',
    });
  });

  it('returns only the pending count for lightweight polling', async () => {
    await expect(getPendingQuoteProposalCountAction()).resolves.toEqual({
      success: true,
      pendingTotal: 37,
    });
    expect(mockedPendingCount).toHaveBeenCalledTimes(1);

    mockedSession.mockResolvedValue(createSession(['dashboard:view']));
    await expect(getPendingQuoteProposalCountAction()).resolves.toMatchObject({
      success: false,
    });
    expect(mockedPendingCount).toHaveBeenCalledTimes(1);
  });

  it('allows a Commercial manager to consult every PDF in the request', async () => {
    mockedSession.mockResolvedValue(createSession(['whatsapp-conversations:manage']));

    await expect(getQuoteProposalDocumentHistoryAction(quoteRequestId)).resolves.toEqual({
      success: true,
      documents: [uploadedDocument],
    });
    expect(mockedDocumentHistory).toHaveBeenCalledWith(quoteRequestId);
  });

  it('validates, uploads and queues a PDF using optimistic concurrency', async () => {
    await expect(sendQuoteProposalAction(formData())).resolves.toMatchObject({
      success: true,
      proposal: {
        proposalDocument: { id: documentId, status: 'queued' },
        deliveryStatus: 'pending',
      },
    });

    expect(mockedUpload).toHaveBeenCalledWith(quoteRequestId, {
      commandId: uploadCommandId,
      expectedVersion: 8,
      file: {
        fileName: 'orcamento.pdf',
        mimeType: 'application/pdf',
        bytes: expect.any(Uint8Array),
      },
    });
    expect(mockedSend).toHaveBeenCalledWith(quoteRequestId, {
      commandId: sendCommandId,
      proposalDocumentId: documentId,
      batchId,
      batchDocumentIds: [documentId],
      expectedVersion: 8,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/quote-proposals');
    expect(revalidatePath).toHaveBeenCalledWith('/whatsapp-conversations');
  });

  it('uploads the complete batch before the first send and then advances each send version', async () => {
    const secondDocument = {
      ...uploadedDocument,
      id: '00000000-0000-4000-8000-000000000502',
      fileName: 'alternativa.pdf',
      sha256: 'b'.repeat(64),
    };
    mockedUpload.mockResolvedValueOnce(uploadedDocument).mockResolvedValueOnce(secondDocument);
    mockedSend
      .mockResolvedValueOnce({
        proposalDocument: { ...uploadedDocument, status: 'queued' },
        conversationId: '00000000-0000-4000-8000-000000000101',
        conversationVersion: 9,
        conversationState: 'human-active',
        messageId: '00000000-0000-4000-8000-000000000601',
        deliveryStatus: 'pending',
        idempotent: false,
      })
      .mockResolvedValueOnce({
        proposalDocument: { ...secondDocument, status: 'queued' },
        conversationId: '00000000-0000-4000-8000-000000000101',
        conversationVersion: 10,
        conversationState: 'human-active',
        messageId: '00000000-0000-4000-8000-000000000602',
        deliveryStatus: 'pending',
        idempotent: false,
      });
    const data = formData(null);
    data.set(
      'batchCommands',
      JSON.stringify([
        {
          uploadCommandId: '00000000-0000-4000-8000-000000000711',
          sendCommandId: '00000000-0000-4000-8000-000000000712',
        },
        {
          uploadCommandId: '00000000-0000-4000-8000-000000000713',
          sendCommandId: '00000000-0000-4000-8000-000000000714',
        },
      ]),
    );
    data.append('files', pdfFile());
    data.append('files', pdfFile('alternativa.pdf'));

    await expect(sendQuoteProposalAction(data)).resolves.toMatchObject({
      success: true,
      proposal: {
        proposalDocument: { id: secondDocument.id },
        conversationVersion: 10,
      },
    });
    expect(mockedUpload).toHaveBeenNthCalledWith(
      1,
      quoteRequestId,
      expect.objectContaining({ expectedVersion: 8 }),
    );
    expect(mockedUpload).toHaveBeenNthCalledWith(
      2,
      quoteRequestId,
      expect.objectContaining({ expectedVersion: 8 }),
    );
    expect(mockedSend).toHaveBeenNthCalledWith(
      1,
      quoteRequestId,
      expect.objectContaining({
        batchId,
        batchDocumentIds: [documentId, secondDocument.id],
        expectedVersion: 8,
      }),
    );
    expect(mockedSend).toHaveBeenNthCalledWith(
      2,
      quoteRequestId,
      expect.objectContaining({
        batchId,
        batchDocumentIds: [documentId, secondDocument.id],
        expectedVersion: 9,
      }),
    );
    expect(mockedUpload.mock.invocationCallOrder[1]).toBeLessThan(
      mockedSend.mock.invocationCallOrder[0]!,
    );
  });

  it('preserves an uploaded document and current version when send conflicts', async () => {
    mockedSend.mockRejectedValue(
      new QuoteProposalRepositoryError('conflict', 'A conversa foi alterada por outro comando.', 9),
    );

    await expect(sendQuoteProposalAction(formData())).resolves.toEqual({
      success: false,
      code: 'conflict',
      message: 'A conversa foi alterada por outro comando.',
      uploadedDocument,
      currentVersion: 9,
    });
  });

  it('reuses a previously uploaded document without uploading the file again', async () => {
    const data = formData(null);
    data.set('proposalDocumentId', documentId);
    data.set('uploadedFileName', uploadedDocument.fileName);
    data.set('uploadedSizeBytes', String(uploadedDocument.sizeBytes));
    data.set('uploadedSha256', uploadedDocument.sha256);

    await expect(sendQuoteProposalAction(data)).resolves.toMatchObject({ success: true });

    expect(mockedUpload).not.toHaveBeenCalled();
    expect(mockedSend).toHaveBeenCalledWith(
      quoteRequestId,
      expect.objectContaining({ proposalDocumentId: documentId }),
    );
  });

  it('creates a new request with the AI-equivalent fields', async () => {
    const input = {
      commandId: '00000000-0000-4000-8000-000000000703',
      expectedVersion: 9,
      conversationId: '00000000-0000-4000-8000-000000000101',
      contactName: 'Ana Paula',
      document: '12345678900',
      email: 'ana@example.test',
      serviceType: 'Fretamento eventual',
      origin: 'Uberlândia',
      destination: 'Goiânia',
      departureDate: '2026-08-01',
      departureAt: '2026-08-01T10:00:00.000Z',
      returnAt: null,
      passengerCount: 30,
      vehicleType: 'Ônibus',
      vehicleAtDisposal: true,
      localTransfers: false,
      notes: 'Bagagem adicional.',
    };

    await expect(createQuoteProposalAction(input)).resolves.toMatchObject({
      success: true,
      proposal: { quoteRequestId },
    });
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: input.conversationId,
        expectedVersion: 9,
        contactName: 'Ana Paula',
      }),
    );
  });

  it('requires a reason to reject and persists a valid decision', async () => {
    await expect(
      decideQuoteProposalAction({
        quoteRequestId,
        commandId: '00000000-0000-4000-8000-000000000704',
        expectedVersion: 10,
        decision: 'rejected',
        reason: '',
      }),
    ).resolves.toMatchObject({ success: false, code: 'validation' });
    expect(mockedDecide).not.toHaveBeenCalled();

    await expect(
      decideQuoteProposalAction({
        quoteRequestId,
        commandId: '00000000-0000-4000-8000-000000000704',
        expectedVersion: 10,
        decision: 'rejected',
        reason: 'Cliente alterou o roteiro.',
      }),
    ).resolves.toMatchObject({
      success: true,
      proposal: { decision: { status: 'rejected' } },
    });
    expect(mockedDecide).toHaveBeenCalledWith(quoteRequestId, {
      commandId: '00000000-0000-4000-8000-000000000704',
      expectedVersion: 10,
      decision: 'rejected',
      reason: 'Cliente alterou o roteiro.',
    });
  });

  it('validates and persists a manual commercial status with optimistic concurrency', async () => {
    await expect(
      updateQuoteProposalStatusAction({
        quoteRequestId,
        commandId: '00000000-0000-4000-8000-000000000705',
        expectedVersion: 11,
        status: 'cancelled',
        reason: '',
      }),
    ).resolves.toMatchObject({ success: false, code: 'validation' });
    expect(mockedUpdateStatus).not.toHaveBeenCalled();

    await expect(
      updateQuoteProposalStatusAction({
        quoteRequestId,
        commandId: '00000000-0000-4000-8000-000000000705',
        expectedVersion: 11,
        status: 'cancelled',
        reason: 'Cliente desistiu do atendimento.',
      }),
    ).resolves.toMatchObject({
      success: true,
      proposal: { requestStatus: 'cancelled' },
    });
    expect(mockedUpdateStatus).toHaveBeenCalledWith(quoteRequestId, {
      commandId: '00000000-0000-4000-8000-000000000705',
      expectedVersion: 11,
      status: 'cancelled',
      reason: 'Cliente desistiu do atendimento.',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/quote-proposals');
    expect(revalidatePath).toHaveBeenCalledWith('/whatsapp-conversations');
  });
});
