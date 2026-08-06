import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { refreshQuoteProposalQueueAction, sendQuoteProposalAction } from '../actions';
import { validateQuoteProposalPdf } from '../domain';
import { createPendingQuoteProposalFixture } from '../testing/quote-proposal-fixture';
import { QuoteProposalWorkspace } from './quote-proposal-workspace';

const toastAdd = jest.fn();

jest.mock('@/shared/ui/toast', () => ({
  toast: { add: (...args: unknown[]) => toastAdd(...args) },
}));

jest.mock('../actions', () => ({
  refreshQuoteProposalQueueAction: jest.fn(),
  sendQuoteProposalAction: jest.fn(),
}));
jest.mock('../domain', () => ({
  ...jest.requireActual('../domain'),
  validateQuoteProposalPdf: jest.fn(),
}));

const mockedSendProposal = jest.mocked(sendQuoteProposalAction);
const mockedRefreshQueue = jest.mocked(refreshQuoteProposalQueueAction);
const mockedValidatePdf = jest.mocked(validateQuoteProposalPdf);

function validPdf() {
  return new File(['%PDF-1.7\nconteudo\n%%EOF'], 'proposta-final.pdf', {
    type: 'application/pdf',
  });
}

describe('QuoteProposalWorkspace', () => {
  beforeEach(() => {
    mockedRefreshQueue.mockResolvedValue({
      success: false,
      message: 'Atualização indisponível no teste.',
    });
    mockedValidatePdf.mockImplementation(async (file) => {
      if (file.name === 'arquivo.pdf') {
        return {
          valid: false,
          message: 'O conteúdo do arquivo não corresponde a um PDF válido.',
        };
      }

      return {
        valid: true,
        metadata: {
          fileName: file.name,
          mimeType: 'application/pdf',
          sizeBytes: file.size,
        },
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the pending count and confirmed quote summary without technical structured data', () => {
    const proposal = createPendingQuoteProposalFixture();
    render(<QuoteProposalWorkspace initialProposals={[proposal]} />);

    expect(screen.getByText('1 cliente na fila')).toBeInTheDocument();
    expect(screen.getAllByText('Ana Paula').length).toBeGreaterThan(1);
    expect(screen.getByText('Uberlândia')).toBeInTheDocument();
    expect(screen.getByText('Goiânia')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Resumo confirmado')).toBeInTheDocument();
    expect(screen.queryByText('tripType')).not.toBeInTheDocument();
    expect(screen.queryByText('one-way')).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Filtrar orçamentos pendentes por rota' }),
    ).toHaveTextContent('Todas as rotas');
    expect(document.querySelector('[data-slot="scroll-area"]')).toHaveClass(
      'h-80',
      'lg:h-[calc(100dvh-18rem)]',
    );
    expect(screen.queryByText(/^all$/i)).not.toBeInTheDocument();
  });

  it('validates PDF metadata and requires confirmation before calling the server action', async () => {
    const proposal = createPendingQuoteProposalFixture();
    mockedSendProposal.mockResolvedValue({
      success: true,
      proposal: {
        proposalDocument: {
          id: '00000000-0000-4000-8000-000000000501',
          status: 'queued',
          fileName: 'proposta-final.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 24,
          sha256: 'a'.repeat(64),
        },
        conversationId: proposal.conversationId,
        conversationVersion: 9,
        conversationState: 'sent-to-human',
        messageId: '00000000-0000-4000-8000-000000000601',
        deliveryStatus: 'pending',
        idempotent: false,
      },
    });
    const user = userEvent.setup();
    render(<QuoteProposalWorkspace initialProposals={[proposal]} />);

    await user.upload(screen.getByLabelText(/Clique para selecionar o PDF/i), validPdf());

    expect(await screen.findByText(/PDF validado/)).toBeInTheDocument();
    expect(mockedSendProposal).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Confirmar envio da proposta?');
    expect(screen.getByRole('dialog')).toHaveTextContent('proposta-final.pdf');
    expect(mockedSendProposal).not.toHaveBeenCalled();

    await user.click(await screen.findByRole('button', { name: 'Confirmar envio' }));

    await waitFor(() => expect(mockedSendProposal).toHaveBeenCalledTimes(1));
    const submittedForm = mockedSendProposal.mock.calls[0][0];
    expect(submittedForm.get('quoteRequestId')).toBe(proposal.quoteRequestId);
    expect(submittedForm.get('batchId')).toEqual(expect.any(String));
    expect(submittedForm.get('expectedVersion')).toBe('8');
    expect(submittedForm.get('confirmed')).toBe('true');
    expect(submittedForm.getAll('files')).toHaveLength(1);
    expect(submittedForm.getAll('files')[0]).toBeInstanceOf(File);
    expect(JSON.parse(String(submittedForm.get('batchCommands')))).toEqual([
      {
        uploadCommandId: expect.any(String),
        sendCommandId: expect.any(String),
      },
    ]);
    expect(await screen.findByText(/Proposta registrada para envio/)).toBeInTheDocument();
    expect(screen.getByText('Envio em processamento pelo WhatsApp.')).toBeInTheDocument();
  });

  it('rejects a forged file and keeps the send action disabled', async () => {
    const file = new File(['not-a-pdf'], 'arquivo.pdf', { type: 'application/pdf' });
    const user = userEvent.setup();
    render(<QuoteProposalWorkspace initialProposals={[createPendingQuoteProposalFixture()]} />);

    await user.upload(screen.getByLabelText(/Clique para selecionar o PDF/i), file);

    expect(
      await screen.findByText('O conteúdo do arquivo não corresponde a um PDF válido.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeDisabled();
    expect(mockedSendProposal).not.toHaveBeenCalled();
  });

  it('validates and submits multiple PDFs in the same proposal', async () => {
    const proposal = createPendingQuoteProposalFixture();
    mockedSendProposal.mockResolvedValue({
      success: true,
      proposal: {
        proposalDocument: {
          id: '00000000-0000-4000-8000-000000000502',
          status: 'queued',
          fileName: 'alternativa.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 24,
          sha256: 'b'.repeat(64),
        },
        conversationId: proposal.conversationId,
        conversationVersion: 10,
        conversationState: 'human-active',
        messageId: '00000000-0000-4000-8000-000000000602',
        deliveryStatus: 'pending',
        idempotent: false,
      },
    });
    const user = userEvent.setup();
    render(<QuoteProposalWorkspace initialProposals={[proposal]} />);

    await user.upload(screen.getByLabelText(/Clique para selecionar o PDF/i), [
      validPdf(),
      new File(['%PDF-1.7\nalternativa\n%%EOF'], 'alternativa.pdf', {
        type: 'application/pdf',
      }),
    ]);

    expect(await screen.findByText('alternativa.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Arquivos');
    await user.click(await screen.findByRole('button', { name: 'Confirmar envio' }));

    await waitFor(() => expect(mockedSendProposal).toHaveBeenCalledTimes(1));
    const submittedForm = mockedSendProposal.mock.calls[0][0];
    expect(submittedForm.getAll('files')).toHaveLength(2);
    expect(JSON.parse(String(submittedForm.get('batchCommands')))).toHaveLength(2);
  });

  it('preserves every batch command identifier when a multiple-PDF send is retried', async () => {
    const proposal = createPendingQuoteProposalFixture();
    mockedSendProposal
      .mockResolvedValueOnce({
        success: false,
        code: 'service-unavailable',
        message: 'Falha temporária no envio.',
      })
      .mockResolvedValueOnce({
        success: true,
        proposal: {
          proposalDocument: {
            id: '00000000-0000-4000-8000-000000000503',
            status: 'queued',
            fileName: 'alternativa.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 24,
            sha256: 'c'.repeat(64),
          },
          conversationId: proposal.conversationId,
          conversationVersion: 10,
          conversationState: 'human-active',
          messageId: '00000000-0000-4000-8000-000000000603',
          deliveryStatus: 'pending',
          idempotent: false,
        },
      });
    const user = userEvent.setup();
    render(<QuoteProposalWorkspace initialProposals={[proposal]} />);

    await user.upload(screen.getByLabelText(/Clique para selecionar o PDF/i), [
      validPdf(),
      new File(['%PDF-1.7\nalternativa\n%%EOF'], 'alternativa.pdf', {
        type: 'application/pdf',
      }),
    ]);
    await screen.findByText('alternativa.pdf');

    await user.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar envio' }));
    await waitFor(() =>
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Falha temporária no envio.',
        }),
      ),
    );

    const retryButton = screen.getByRole('button', { name: 'Enviar proposta' });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await user.click(retryButton);
    await user.click(await screen.findByRole('button', { name: 'Confirmar envio' }));
    await waitFor(() => expect(mockedSendProposal).toHaveBeenCalledTimes(2));

    const firstBatchCommands = String(mockedSendProposal.mock.calls[0][0].get('batchCommands'));
    const secondBatchCommands = String(mockedSendProposal.mock.calls[1][0].get('batchCommands'));
    expect(secondBatchCommands).toBe(firstBatchCommands);
    expect(mockedSendProposal.mock.calls[1][0].get('batchId')).toBe(
      mockedSendProposal.mock.calls[0][0].get('batchId'),
    );
  });

  it('reuses an uploaded PDF after a reload and blocks a document already queued', async () => {
    const uploaded = createPendingQuoteProposalFixture({
      proposalDocument: {
        id: '00000000-0000-4000-8000-000000000501',
        status: 'uploaded',
        fileName: 'orcamento-persistido.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        sha256: 'a'.repeat(64),
      },
    });
    const { unmount } = render(<QuoteProposalWorkspace initialProposals={[uploaded]} />);

    expect(screen.getByText('PDF já registrado e pronto para confirmação.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeEnabled();

    unmount();
    render(
      <QuoteProposalWorkspace
        initialProposals={[
          createPendingQuoteProposalFixture({
            proposalDocument: { ...uploaded.proposalDocument!, status: 'queued' },
          }),
        ]}
      />,
    );

    expect(screen.getByText('Envio em processamento pelo WhatsApp.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar proposta' })).toBeDisabled();
  });

  it('renders an empty state and reports loading failures without technical details', () => {
    render(
      <QuoteProposalWorkspace initialProposals={[]} initialError="Tenant API indisponível." />,
    );

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        description: 'Não foi possível atualizar os orçamentos.',
      }),
    );
    expect(screen.queryByText('Tenant API indisponível.')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma proposta aguardando envio')).toBeInTheDocument();
  });

  it('separates provider-confirmed documents from the pending queue', () => {
    const sentProposal = createPendingQuoteProposalFixture({
      stage: 'sent',
      proposalDocument: {
        id: '00000000-0000-4000-8000-000000000501',
        status: 'sent',
        fileName: 'FERNANDA.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 455_100,
        sha256: 'b'.repeat(64),
        providerMessageId: 'provider-message-001',
        queuedAt: '2026-07-27T17:45:00.000Z',
        sentAt: '2026-07-27T17:46:00.000Z',
        createdAt: '2026-07-27T17:44:00.000Z',
        updatedAt: '2026-07-27T17:46:00.000Z',
      },
    });

    render(
      <QuoteProposalWorkspace initialPendingProposals={[]} initialSentProposals={[sentProposal]} />,
    );

    expect(screen.getByRole('heading', { name: 'Propostas enviadas' })).toBeInTheDocument();
    expect(screen.getByText('FERNANDA.pdf')).toBeInTheDocument();
    expect(screen.getByText('Aguardando decisão')).toBeInTheDocument();
  });
});
