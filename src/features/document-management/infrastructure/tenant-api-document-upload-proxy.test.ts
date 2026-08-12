import { proxyDocumentUploadRequest } from './tenant-api-document-management-gateway';

describe('proxyDocumentUploadRequest', () => {
  const originalBaseUrl = process.env.LUME_TENANT_API_URL;

  beforeEach(() => {
    process.env.LUME_TENANT_API_URL = 'https://tenant-api.example.com/api/v1';
  });

  afterAll(() => {
    if (originalBaseUrl === undefined) delete process.env.LUME_TENANT_API_URL;
    else process.env.LUME_TENANT_API_URL = originalBaseUrl;
  });

  it('encaminha o corpo multipart como stream sem materializar os arquivos', async () => {
    const formData = new FormData();
    formData.set('commandId', '00000000-0000-4000-8000-000000000001');
    formData.append('files', new File(['imagem'], 'foto.jpg', { type: 'image/jpeg' }));
    formData.set('sides', 'single');
    formData.set('pageNumbers', '1');
    const request = new Request('https://web.example.com/upload', {
      method: 'POST',
      body: formData,
    });
    const fetcher = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ request: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      proxyDocumentUploadRequest(
        'access-token',
        '00000000-0000-4000-8000-000000000002',
        request,
        fetcher,
      ),
    ).resolves.toHaveProperty('status', 200);

    expect(fetcher).toHaveBeenCalledWith(
      'https://tenant-api.example.com/api/v1/document-management/items/00000000-0000-4000-8000-000000000002/submissions/complete',
      expect.objectContaining({
        method: 'POST',
        body: request.body,
        duplex: 'half',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': expect.stringMatching(/^multipart\/form-data;/),
        }),
      }),
    );
  });
});
