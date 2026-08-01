/** @jest-environment node */

import {
  AUTHENTICATED_SESSION_VERSION,
  type AuthenticatedSession,
} from '@/features/auth/domain';
import { getCurrentAuthenticatedSession } from '@/features/auth/server';
import { downloadWhatsAppMessageMediaForDashboard } from '@/features/whatsapp-conversations/server';

import { GET } from './route';

jest.mock('@/features/auth/server', () => ({
  getCurrentAuthenticatedSession: jest.fn(),
}));
jest.mock('@/features/whatsapp-conversations/server', () => ({
  downloadWhatsAppMessageMediaForDashboard: jest.fn(),
}));

const conversationId = '00000000-0000-4000-8000-000000000101';
const messageId = '00000000-0000-4000-8000-000000000501';
const mockedSession = jest.mocked(getCurrentAuthenticatedSession);
const mockedDownload = jest.mocked(downloadWhatsAppMessageMediaForDashboard);

function session(
  permissions: readonly string[] = ['whatsapp-conversations:manage'],
): AuthenticatedSession {
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
    issuedAt: '2026-07-31T12:00:00.000Z',
    expiresAt: '2026-08-01T20:00:00.000Z',
    rememberDevice: false,
  };
}

function context() {
  return {
    params: Promise.resolve({ conversationId, messageId }),
  };
}

describe('WhatsApp media content route', () => {
  afterEach(() => jest.clearAllMocks());

  it('serves media inline through the authenticated same-origin route', async () => {
    mockedSession.mockResolvedValue(session());
    mockedDownload.mockResolvedValue({
      fileName: 'audio.m4a',
      mimeType: 'audio/mp4',
      bytes: Uint8Array.from([1, 2, 3, 4]),
    });

    const response = await GET(
      new Request('http://localhost/api/whatsapp-media'),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mp4');
    expect(response.headers.get('content-disposition')).toContain('inline');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mockedDownload).toHaveBeenCalledWith(conversationId, messageId);
  });

  it('uses attachment disposition when the user requests a download', async () => {
    mockedSession.mockResolvedValue(session(['whatsapp-conversations:view']));
    mockedDownload.mockResolvedValue({
      fileName: 'documento.pdf',
      mimeType: 'application/pdf',
      bytes: Uint8Array.from([37, 80, 68, 70]),
    });

    const response = await GET(
      new Request('http://localhost/api/whatsapp-media?download=1'),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('attachment');
  });

  it('blocks users without WhatsApp conversation permission', async () => {
    mockedSession.mockResolvedValue(session([]));

    const response = await GET(
      new Request('http://localhost/api/whatsapp-media'),
      context(),
    );

    expect(response.status).toBe(403);
    expect(mockedDownload).not.toHaveBeenCalled();
  });
});
