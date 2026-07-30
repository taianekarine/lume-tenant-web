import { render, screen } from '@testing-library/react';

import { createPendingQuoteProposalFixture } from '../testing/quote-proposal-fixture';
import { QuoteProposalArchive } from './quote-proposal-archive';

jest.mock('../actions', () => ({
  createQuoteProposalAction: jest.fn(),
  decideQuoteProposalAction: jest.fn(),
  getQuoteProposalDocumentHistoryAction: jest.fn(),
  sendQuoteProposalAction: jest.fn(),
}));

describe('QuoteProposalArchive', () => {
  it('renders aligned filters with friendly labels instead of contract codes', () => {
    render(
      <QuoteProposalArchive
        category="approved"
        initialProposals={[
          createPendingQuoteProposalFixture({
            stage: 'approved',
            requestStatus: 'approved',
            decision: {
              status: 'approved',
              reason: null,
              decidedAt: '2026-07-29T12:00:00.000Z',
              decidedBy: null,
            },
          }),
        ]}
      />,
    );

    expect(screen.getByPlaceholderText('Cliente, telefone, rota, arquivo ou motivo')).toHaveClass(
      'h-9',
    );
    expect(screen.getByRole('combobox', { name: 'Filtrar por rota' })).toHaveTextContent(
      'Todas as rotas',
    );
    expect(screen.getByRole('combobox', { name: 'Filtrar por período' })).toHaveTextContent(
      'Todo o período',
    );
    expect(screen.getByRole('button', { name: 'Limpar' })).toHaveClass('h-9');
    expect(screen.queryByText(/^all$/i)).not.toBeInTheDocument();
  });
});
