import {
  getQuoteProposalCategory,
  getQuoteProposalDashboardMetrics,
  formatQuoteProposalPdfSize,
  formatQuoteProposalServiceType,
  QUOTE_PROPOSAL_PDF_MAX_SIZE_BYTES,
  validateQuoteProposalPdf,
} from './quote-proposal';
import { createPendingQuoteProposalFixture } from '../testing/quote-proposal-fixture';

function candidate(
  content: string,
  overrides: Partial<{ name: string; type: string; size: number }> = {},
) {
  const bytes = Uint8Array.from(content, (character) => character.charCodeAt(0));

  return {
    name: overrides.name ?? 'orcamento.pdf',
    type: overrides.type ?? 'application/pdf',
    size: overrides.size ?? bytes.byteLength,
    slice: (start = 0, end = bytes.byteLength) =>
      ({
        arrayBuffer: async () => {
          const sliced = bytes.slice(start, end);
          return sliced.buffer.slice(
            sliced.byteOffset,
            sliced.byteOffset + sliced.byteLength,
          ) as ArrayBuffer;
        },
      }) as Blob,
  };
}

describe('quote proposal PDF validation', () => {
  it('accepts a PDF signature and returns safe metadata', async () => {
    await expect(validateQuoteProposalPdf(candidate('%PDF-1.7\n%%EOF'))).resolves.toEqual({
      valid: true,
      metadata: {
        fileName: 'orcamento.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 14,
      },
    });
  });

  it('rejects invalid extension, MIME, empty, oversized and forged files', async () => {
    await expect(
      validateQuoteProposalPdf(candidate('%PDF-1.7', { name: 'orcamento.txt' })),
    ).resolves.toMatchObject({ valid: false });
    await expect(
      validateQuoteProposalPdf(candidate('%PDF-1.7', { type: 'text/plain' })),
    ).resolves.toMatchObject({ valid: false });
    await expect(validateQuoteProposalPdf(candidate('', { size: 0 }))).resolves.toMatchObject({
      valid: false,
    });
    await expect(
      validateQuoteProposalPdf(
        candidate('%PDF-1.7', { size: QUOTE_PROPOSAL_PDF_MAX_SIZE_BYTES + 1 }),
      ),
    ).resolves.toMatchObject({ valid: false });
    await expect(validateQuoteProposalPdf(candidate('not-a-pdf'))).resolves.toEqual({
      valid: false,
      message: 'O conteúdo do arquivo não corresponde a um PDF válido.',
    });
  });

  it('formats file size for the operator preview', () => {
    expect(formatQuoteProposalPdfSize(512)).toBe('512 B');
    expect(formatQuoteProposalPdfSize(1536)).toBe('1,5 KB');
    expect(formatQuoteProposalPdfSize(2 * 1024 * 1024)).toBe('2 MB');
  });
});

describe('quote proposal categorization', () => {
  it('translates service contract codes without exposing them in the interface', () => {
    expect(formatQuoteProposalServiceType('eventual')).toBe('Fretamento eventual');
    expect(formatQuoteProposalServiceType('continuous-charter')).toBe('Viagem contínua');
    expect(formatQuoteProposalServiceType('local_transfer')).toBe('Traslado');
    expect(formatQuoteProposalServiceType('special-service')).toBe('Special service');
    expect(formatQuoteProposalServiceType(null)).toBeNull();
  });

  it('uses the authoritative stage and preserves compatibility with sent decisions', () => {
    expect(getQuoteProposalCategory(createPendingQuoteProposalFixture())).toBe('pending');
    expect(
      getQuoteProposalCategory(
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
      ),
    ).toBe('approved');
    expect(
      getQuoteProposalCategory(
        createPendingQuoteProposalFixture({
          stage: 'sent',
          requestStatus: 'rejected',
          decision: {
            status: 'rejected',
            reason: 'Cliente cancelou a viagem.',
            decidedAt: '2026-07-29T12:00:00.000Z',
            decidedBy: null,
          },
        }),
      ),
    ).toBe('cancelled');
  });

  it('counts each folder and groups cancellation reasons', () => {
    const pending = createPendingQuoteProposalFixture();
    const sent = createPendingQuoteProposalFixture({
      stage: 'sent',
      requestStatus: 'waiting-for-customer',
    });
    const approved = createPendingQuoteProposalFixture({
      stage: 'approved',
      requestStatus: 'approved',
    });
    const cancelled = createPendingQuoteProposalFixture({
      stage: 'cancelled',
      requestStatus: 'rejected',
      decision: {
        status: 'rejected',
        reason: 'Data indisponível',
        decidedAt: '2026-07-29T12:00:00.000Z',
        decidedBy: null,
      },
    });

    expect(getQuoteProposalDashboardMetrics([pending], [sent], [approved], [cancelled])).toEqual({
      pending: 1,
      sent: 1,
      approved: 1,
      cancelled: 1,
      delivered: 3,
      cancellationReasons: [{ reason: 'Data indisponível', count: 1 }],
    });
  });
});
