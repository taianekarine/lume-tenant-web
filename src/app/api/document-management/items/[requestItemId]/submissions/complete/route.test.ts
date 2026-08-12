import { proxyDocumentUploadRequest } from '@/features/document-management/infrastructure';
import { executeAuthenticatedDocumentMutation } from '@/features/document-management/server';
import { POST } from './route';

jest.mock('@/features/document-management/infrastructure', () => ({
  proxyDocumentUploadRequest: jest.fn(),
}));

jest.mock('@/features/document-management/server', () => ({
  executeAuthenticatedDocumentMutation: jest.fn(),
}));

const mockedProxy = jest.mocked(proxyDocumentUploadRequest);
const mockedExecute = jest.mocked(executeAuthenticatedDocumentMutation);
const requestItemId = '00000000-0000-4000-8000-000000000001';

describe('POST document upload proxy', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedExecute.mockImplementation(async (operation) => operation({} as never, 'access-token'));
  });

  it('protege e encaminha o upload pela rota autenticada', async () => {
    const formData = new FormData();
    formData.append('files', new File(['imagem'], 'foto.jpg', { type: 'image/jpeg' }));
    const request = new Request('https://web.example.com/api/upload', {
      method: 'POST',
      body: formData,
    });
    mockedProxy.mockResolvedValue(
      new Response(JSON.stringify({ request: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await POST(request, { params: Promise.resolve({ requestItemId }) });

    expect(response.status).toBe(200);
    expect(mockedProxy).toHaveBeenCalledWith('access-token', requestItemId, request);
  });

  it('rejeita identificadores inválidos antes de encaminhar arquivos', async () => {
    const request = new Request('https://web.example.com/api/upload', {
      method: 'POST',
      body: new FormData(),
    });

    const response = await POST(request, {
      params: Promise.resolve({ requestItemId: 'invalido' }),
    });

    expect(response.status).toBe(400);
    expect(mockedProxy).not.toHaveBeenCalled();
  });
});
