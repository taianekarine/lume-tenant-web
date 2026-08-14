import { executeAuthenticatedWhatsAppMutation } from '@/features/whatsapp-conversations/server';
import { proxyWhatsAppMediaMessage } from '@/features/whatsapp-conversations/infrastructure';

import { POST } from './route';

jest.mock('@/features/whatsapp-conversations/server', () => ({
  executeAuthenticatedWhatsAppMutation: jest.fn(),
}));
jest.mock('@/features/whatsapp-conversations/infrastructure', () => ({
  proxyWhatsAppMediaMessage: jest.fn(),
}));

const mockedExecute = jest.mocked(executeAuthenticatedWhatsAppMutation);
const mockedProxy = jest.mocked(proxyWhatsAppMediaMessage);

describe('WhatsApp media message proxy route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedExecute.mockImplementation(async (operation) => operation({} as never, 'access-token'));
  });

  it('streams an authenticated multipart request to the Tenant API', async () => {
    mockedProxy.mockResolvedValue(
      Response.json({ message: { id: 'message-id' } }, { status: 201 }),
    );
    const formData = new FormData();
    formData.set('file', new File(['imagem'], 'foto.jpg', { type: 'image/jpeg' }));
    const request = new Request(
      'http://localhost/api/whatsapp-conversations/00000000-0000-4000-8000-000000000003/media',
      { method: 'POST', body: formData },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        conversationId: '00000000-0000-4000-8000-000000000003',
      }),
    });

    expect(response.status).toBe(201);
    expect(mockedProxy).toHaveBeenCalledWith(
      'access-token',
      '00000000-0000-4000-8000-000000000003',
      request,
    );
  });

  it('returns a safe error when the upstream request cannot be completed', async () => {
    mockedExecute.mockRejectedValue(new Error('connection refused'));
    const response = await POST(
      new Request('http://localhost/api/message', { method: 'POST', body: 'x' }),
      {
        params: Promise.resolve({
          conversationId: '00000000-0000-4000-8000-000000000003',
        }),
      },
    );

    await expect(response.json()).resolves.toEqual({
      message: 'Não foi possível enviar o anexo. Tente novamente.',
    });
    expect(response.status).toBe(503);
  });
});
