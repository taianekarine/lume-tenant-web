import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getConversationQuoteProposalsAction } from '@/features/quote-proposals/actions';

import { createWhatsAppConversationFixture } from '../testing/whatsapp-conversation-fixture';
import { ConversationQuoteActions } from './conversation-quote-actions';

jest.mock('@/features/quote-proposals/actions', () => ({
  getConversationQuoteProposalsAction: jest.fn(),
}));
jest.mock('@/features/quote-proposals/components', () => ({
  ProposalHistory: () => <div>Histórico de orçamentos</div>,
}));

const mockedGetProposals = jest.mocked(getConversationQuoteProposalsAction);

describe('ConversationQuoteActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('não expõe nomes de integrações quando a lista falha', async () => {
    mockedGetProposals.mockResolvedValue({
      success: false,
      message: 'O n8n retornou HTTP 502 pela Evolution.',
    });
    const user = userEvent.setup();

    render(
      <ConversationQuoteActions
        conversation={createWhatsAppConversationFixture()}
        currentUserId={null}
        onChanged={jest.fn()}
        onError={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Lista de orçamentos' }));

    expect(
      await screen.findByText('Não foi possível consultar os orçamentos desta conversa.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/n8n|Evolution|HTTP 502/i)).not.toBeInTheDocument();
  });
});
