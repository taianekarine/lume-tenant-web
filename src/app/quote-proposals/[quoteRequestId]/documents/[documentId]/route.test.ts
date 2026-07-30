/** @jest-environment node */

import { AUTHENTICATED_SESSION_VERSION, type AuthenticatedSession } from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { downloadQuoteProposalDocumentForDashboard } from '@/features/quote-proposals/server';

import { GET } from './route';

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));
jest.mock('@/features/quote-proposals/server', () => ({
  downloadQuoteProposalDocumentForDashboard: jest.fn(),
}));

const quoteRequestId = '00000000-0000-4000-8000-000000000401';
const documentId = '00000000-0000-4000-8000-000000000501';
const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedDownload = jest.mocked(downloadQuoteProposalDocumentForDashboard);

function session(departments: readonly string[] = ['commercial']): AuthenticatedSession {
  return {
    version: AUTHENTICATED_SESSION_VERSION,
    id: 'session-001',
    user: {
      id: 'employee-001',
      name: 'Usuário Comercial',
      type: 'employee',
      departments,
      permissions: ['whatsapp-conversations:manage'],
      clientCategory: null,
      isActive: true,
    },
    issuedAt: '2026-07-29T12:00:00.000Z',
    expiresAt: '2026-07-29T20:00:00.000Z',
    rememberDevice: false,
  };
}

describe('quote proposal PDF route', () => {
  afterEach(() => jest.clearAllMocks());

  it('allows a Commercial manager to open a PDF inline', async () => {
    mockedSession.mockResolvedValue(session());
    mockedDownload.mockResolvedValue({
      fileName: 'orçamento final.pdf',
      mimeType: 'application/pdf',
      bytes: Uint8Array.from([37, 80, 68, 70, 45]),
    });

    const response = await GET(new Request('http://localhost/document'), {
      params: Promise.resolve({ quoteRequestId, documentId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('inline');
    expect(mockedDownload).toHaveBeenCalledWith(quoteRequestId, documentId);
  });

  it('does not expose a Commercial PDF to another department', async () => {
    mockedSession.mockResolvedValue(session(['operations']));

    const response = await GET(new Request('http://localhost/document'), {
      params: Promise.resolve({ quoteRequestId, documentId }),
    });

    expect(response.status).toBe(403);
    expect(mockedDownload).not.toHaveBeenCalled();
  });
});
