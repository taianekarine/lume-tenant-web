import type { PendingQuoteProposal } from '../domain';

export function createPendingQuoteProposalFixture(
  overrides: Partial<PendingQuoteProposal> = {},
): PendingQuoteProposal {
  return {
    stage: 'pending',
    conversationState: 'sent-to-human',
    requestStatus: 'under-review',
    quoteRequestId: '00000000-0000-4000-8000-000000000401',
    quoteRequestVersion: 3,
    conversationId: '00000000-0000-4000-8000-000000000101',
    conversationVersion: 8,
    contact: {
      id: '00000000-0000-4000-8000-000000000301',
      name: 'Ana Paula',
      phone: '5534999991001',
    },
    summary: {
      sequence: 2,
      contactName: 'Ana Paula',
      document: '04252011000110',
      email: 'ana@example.test',
      serviceType: 'Fretamento eventual',
      origin: 'Uberlândia',
      destination: 'Goiânia',
      departureDate: '2026-08-01',
      departureAt: '2026-08-01T10:00:00.000Z',
      returnDate: null,
      returnAt: null,
      passengerCount: 30,
      vehicleType: 'Ônibus',
      vehicleAtDisposal: true,
      localTransfers: false,
      notes: 'Resumo confirmado pelo cliente.',
      structuredData: { tripType: 'one-way' },
    },
    proposalDocument: null,
    requestedAt: '2026-07-27T15:47:00.000Z',
    requestedBy: {
      id: null,
      name: 'Ana Paula',
      type: 'customer',
    },
    decision: {
      status: 'pending',
      reason: null,
      decidedAt: null,
      decidedBy: null,
    },
    updatedAt: '2026-07-27T15:47:00.000Z',
    ...overrides,
  };
}
