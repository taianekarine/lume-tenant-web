import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  createQuoteProposalAction,
  decideQuoteProposalAction,
  getQuoteProposalDocumentHistoryAction,
  sendQuoteProposalAction,
} from '../actions';
import { validateQuoteProposalPdf } from '../domain';
import { createPendingQuoteProposalFixture } from '../testing/quote-proposal-fixture';
import { ProposalHistory } from './proposal-history';

jest.mock('../actions', () => ({
  createQuoteProposalAction: jest.fn(),
  decideQuoteProposalAction: jest.fn(),
  getQuoteProposalDocumentHistoryAction: jest.fn(),
  sendQuoteProposalAction: jest.fn(),
}));
jest.mock('../domain', () => ({
  ...jest.requireActual('../domain'),
  validateQuoteProposalPdf: jest.fn(),
}));

const mockedCreate = jest.mocked(createQuoteProposalAction);
const mockedDecide = jest.mocked(decideQuoteProposalAction);
const mockedSend = jest.mocked(sendQuoteProposalAction);
const mockedDocumentHistory = jest.mocked(getQuoteProposalDocumentHistoryAction);
const mockedValidatePdf = jest.mocked(validateQuoteProposalPdf);

function sentProposal(sequence: number) {
  return createPendingQuoteProposalFixture({
    stage: 'sent',
    quoteRequestId: `00000000-0000-4000-8000-${String(400 + sequence).padStart(12, '0')}`,
    summary: {
      ...createPendingQuoteProposalFixture().summary,
      sequence,
    },
    requestedAt: `2026-07-${20 + sequence}T15:47:00.000Z`,
    requestedBy: {
      id: '00000000-0000-4000-8000-000000000801',
      name: 'Atendente Comercial',
      type: 'attendant',
    },
    proposalDocument: {
      id: `00000000-0000-4000-8000-${String(500 + sequence).padStart(12, '0')}`,
      status: 'sent',
      fileName: `proposta-${sequence}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      sha256: 'a'.repeat(64),
      sentAt: `2026-07-${21 + sequence}T15:47:00.000Z`,
      sentBy: {
        id: '00000000-0000-4000-8000-000000000801',
        name: 'Atendente Comercial',
      },
    },
  });
}

describe('ProposalHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDocumentHistory.mockResolvedValue({ success: true, documents: [] });
    mockedValidatePdf.mockImplementation(async (file) => ({
      valid: true,
      metadata: {
        fileName: file.name,
        mimeType: 'application/pdf',
        sizeBytes: file.size,
      },
    }));
  });

  it('keeps distinct conversation cycles separated even when the phone is the same', () => {
    const otherConversation = sentProposal(3);
    render(
      <ProposalHistory
        proposals={[
          sentProposal(2),
          {
            ...otherConversation,
            conversationId: '00000000-0000-4000-8000-000000000109',
            contact: {
              ...otherConversation.contact,
              id: '00000000-0000-4000-8000-000000000309',
              phone: '(34) 99999-1001',
            },
          },
        ]}
        total={2}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(screen.getByText('2 enviadas')).toBeInTheDocument();
    expect(screen.getAllByText('Ana Paula')).toHaveLength(2);
    expect(screen.getByText('proposta-2.pdf')).toBeInTheDocument();
    expect(screen.getByText('proposta-3.pdf')).toBeInTheDocument();
    expect(screen.getAllByText(/Atendente Comercial/).length).toBeGreaterThan(1);
    expect(screen.getAllByRole('button', { name: 'Visualizar PDF' })).toHaveLength(2);
  });

  it('prefills the AI-equivalent form and creates a new pending request', async () => {
    const source = sentProposal(2);
    const created = createPendingQuoteProposalFixture({
      summary: { ...source.summary, sequence: 3 },
      conversationVersion: 10,
    });
    mockedCreate.mockResolvedValue({ success: true, proposal: created });
    const onCreated = jest.fn();
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={onCreated}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Nova proposta' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova proposta' });
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Ana Paula');
    expect(within(dialog).getByLabelText('Origem')).toHaveValue('Uberlândia');
    expect(within(dialog).getByRole('button', { name: 'Cadastrar e enviar' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: source.conversationId,
        expectedVersion: source.conversationVersion,
        contactName: 'Ana Paula',
        origin: 'Uberlândia',
        destination: 'Goiânia',
      }),
    );
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it('creates, uploads and sends a new proposal from the same modal', async () => {
    const source = sentProposal(2);
    const created = createPendingQuoteProposalFixture({
      summary: { ...source.summary, sequence: 3 },
      conversationVersion: 10,
    });
    const queuedDocument = {
      id: '00000000-0000-4000-8000-000000000599',
      status: 'queued' as const,
      fileName: 'nova-proposta.pdf',
      mimeType: 'application/pdf' as const,
      sizeBytes: 24,
      sha256: 'b'.repeat(64),
    };
    mockedCreate.mockResolvedValue({ success: true, proposal: created });
    mockedSend.mockResolvedValue({
      success: true,
      proposal: {
        proposalDocument: queuedDocument,
        conversationId: created.conversationId,
        conversationVersion: 11,
        conversationState: 'sent-to-human',
        messageId: '00000000-0000-4000-8000-000000000699',
        deliveryStatus: 'pending',
        idempotent: false,
      },
    });
    const onCreated = jest.fn();
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={onCreated}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Nova proposta' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova proposta' });
    await user.upload(
      within(dialog).getByLabelText('PDF da proposta'),
      new File(['%PDF-1.7\nconteudo\n%%EOF'], 'nova-proposta.pdf', {
        type: 'application/pdf',
      }),
    );
    expect(await within(dialog).findByText(/PDF validado/)).toBeInTheDocument();
    const submit = within(dialog).getByRole('button', { name: 'Cadastrar e enviar' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    await waitFor(() => expect(mockedSend).toHaveBeenCalledTimes(1));
    const formData = mockedSend.mock.calls[0]?.[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData?.get('quoteRequestId')).toBe(created.quoteRequestId);
    expect(formData?.get('batchId')).toEqual(expect.any(String));
    expect(formData?.get('expectedVersion')).toBe('10');
    expect(formData?.get('file')).toBeInstanceOf(File);
    expect(formData?.get('uploadCommandId')).toEqual(expect.any(String));
    expect(formData?.get('sendCommandId')).toEqual(expect.any(String));
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteRequestId: created.quoteRequestId,
        conversationVersion: 11,
        proposalDocument: queuedDocument,
      }),
    );
  });

  it('keeps a closed-attendance error inside the new proposal modal', async () => {
    const source = sentProposal(2);
    mockedCreate.mockResolvedValue({
      success: false,
      code: 'validation',
      message: 'Não é possível cadastrar proposta em um atendimento encerrado.',
    });
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Nova proposta' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova proposta' });
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não é possível cadastrar proposta em um atendimento encerrado.',
    );
  });

  it('does not offer a new proposal for a conversation whose attendance is closed', () => {
    const openConversation = {
      ...sentProposal(2),
      conversationId: '00000000-0000-4000-8000-000000000109',
    };

    render(
      <ProposalHistory
        proposals={[openConversation, { ...sentProposal(3), conversationState: 'closed' }]}
        total={2}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Nova proposta' })).toHaveLength(1);
  });

  it('requires a rejection reason and returns the persisted decision', async () => {
    const source = sentProposal(2);
    const decided = {
      ...source,
      conversationVersion: 10,
      decision: {
        status: 'rejected' as const,
        reason: 'Cliente alterou a data.',
        decidedAt: '2026-07-28T12:00:00.000Z',
        decidedBy: {
          id: '00000000-0000-4000-8000-000000000801',
          name: 'Atendente Comercial',
        },
      },
    };
    mockedDecide.mockResolvedValue({ success: true, proposal: decided });
    const onDecided = jest.fn();
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={jest.fn()}
        onDecided={onDecided}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Recusar' }));
    const dialog = screen.getByRole('dialog', { name: 'Recusar proposta' });
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar recusa' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Explique brevemente o motivo da recusa.',
    );
    expect(mockedDecide).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Motivo da recusa'), 'Cliente alterou a data.');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar recusa' }));

    await waitFor(() => expect(mockedDecide).toHaveBeenCalledTimes(1));
    expect(mockedDecide).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteRequestId: source.quoteRequestId,
        expectedVersion: source.conversationVersion,
        decision: 'rejected',
        reason: 'Cliente alterou a data.',
      }),
    );
    expect(onDecided).toHaveBeenCalledWith(decided);
  });

  it('keeps approve and reject actions disabled after a final decision', () => {
    const decided = {
      ...sentProposal(2),
      decision: {
        status: 'approved' as const,
        reason: null,
        decidedAt: '2026-07-28T12:00:00.000Z',
        decidedBy: {
          id: '00000000-0000-4000-8000-000000000801',
          name: 'Atendente Comercial',
        },
      },
    };
    render(
      <ProposalHistory
        proposals={[decided]}
        total={1}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeDisabled();
    expect(mockedDecide).not.toHaveBeenCalled();
  });

  it('opens a modal with every PDF linked to the selected request', async () => {
    const source = sentProposal(2);
    mockedDocumentHistory.mockResolvedValue({
      success: true,
      documents: [
        source.proposalDocument!,
        {
          ...source.proposalDocument!,
          id: '00000000-0000-4000-8000-000000000599',
          fileName: 'proposta-alternativa.pdf',
          sha256: 'b'.repeat(64),
        },
      ],
    });
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Visualizar PDF' }));
    const dialog = await screen.findByRole('dialog', { name: 'PDFs da solicitação' });
    expect(within(dialog).getByText('proposta-2.pdf')).toBeInTheDocument();
    expect(within(dialog).getByText('proposta-alternativa.pdf')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('button', { name: 'Visualizar' })).toHaveLength(2);
  });

  it('não expõe integrações ao falhar a consulta dos PDFs', async () => {
    const source = sentProposal(2);
    mockedDocumentHistory.mockResolvedValue({
      success: false,
      message: 'A Tenant API recebeu HTTP 503 do n8n.',
    });
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Visualizar PDF' }));
    const dialog = await screen.findByRole('dialog', { name: 'PDFs da solicitação' });

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Não foi possível consultar os PDFs desta solicitação.',
    );
    expect(within(dialog).queryByText(/Tenant API|HTTP 503|n8n/i)).not.toBeInTheDocument();
  });

  it('não expõe integrações ao falhar o cadastro de um orçamento', async () => {
    const source = sentProposal(2);
    mockedCreate.mockResolvedValue({
      success: false,
      code: 'service-unavailable',
      message: 'O n8n retornou HTTP 502.',
    });
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Nova proposta' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova proposta' });
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível cadastrar o orçamento.',
    );
    expect(within(dialog).queryByText(/n8n|HTTP 502/i)).not.toBeInTheDocument();
  });

  it('não expõe integrações ao falhar o envio de uma proposta', async () => {
    const source = sentProposal(2);
    const created = createPendingQuoteProposalFixture({
      summary: { ...source.summary, sequence: 3 },
      conversationVersion: 10,
    });
    mockedCreate.mockResolvedValue({ success: true, proposal: created });
    mockedSend.mockResolvedValue({
      success: false,
      code: 'service-unavailable',
      message: 'O provedor Evolution retornou HTTP 503.',
    });
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Nova proposta' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova proposta' });
    await user.upload(
      within(dialog).getByLabelText('PDF da proposta'),
      new File(['%PDF-1.7\nconteudo\n%%EOF'], 'nova-proposta.pdf', {
        type: 'application/pdf',
      }),
    );
    expect(await within(dialog).findByText(/PDF validado/)).toBeInTheDocument();
    const submit = within(dialog).getByRole('button', { name: 'Cadastrar e enviar' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar a proposta.',
    );
    expect(within(dialog).queryByText(/Evolution|HTTP 503/i)).not.toBeInTheDocument();
  });

  it('não repassa integrações internas ao falhar uma decisão', async () => {
    const source = sentProposal(2);
    mockedDecide.mockResolvedValue({
      success: false,
      code: 'service-unavailable',
      message: 'A Tenant API não conseguiu chamar o n8n.',
    });
    const onError = jest.fn();
    const user = userEvent.setup();
    render(
      <ProposalHistory
        proposals={[source]}
        total={1}
        onCreated={jest.fn()}
        onDecided={jest.fn()}
        onError={onError}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Aprovar' }));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith('Não foi possível registrar a decisão.'),
    );
    expect(onError).not.toHaveBeenCalledWith(expect.stringMatching(/Tenant API|n8n/i));
  });
});
