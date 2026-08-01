/** @jest-environment node */

import { LumeApiWhatsAppMediaContentGateway } from './tenant-api-whatsapp-media-content';

const conversationId = '00000000-0000-4000-8000-000000000101';
const messageId = '00000000-0000-4000-8000-000000000501';

describe('LumeApiWhatsAppMediaContentGateway', () => {
  it('downloads authenticated binary content and preserves its safe filename', async () => {
    const bytes = Uint8Array.from([37, 80, 68, 70, 45]);
    const fetcher = jest.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: {
          'Content-Length': String(bytes.byteLength),
          'Content-Type': 'application/pdf',
          'X-WhatsApp-Media-Filename': encodeURIComponent('orçamento final.pdf'),
        },
      }),
    );
    const gateway = new LumeApiWhatsAppMediaContentGateway(
      'https://tenant.example/api/v1/',
      'access-token',
      fetcher,
      30_000,
    );

    await expect(gateway.download(conversationId, messageId)).resolves.toEqual({
      bytes,
      fileName: 'orçamento final.pdf',
      mimeType: 'application/pdf',
    });
    expect(fetcher).toHaveBeenCalledWith(
      `https://tenant.example/api/v1/whatsapp/conversations/${conversationId}/messages/${messageId}/content`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('maps Tenant API media errors to the WhatsApp repository contract', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Conteúdo da mídia não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const gateway = new LumeApiWhatsAppMediaContentGateway(
      'https://tenant.example/api/v1',
      'access-token',
      fetcher,
    );

    await expect(gateway.download(conversationId, messageId)).rejects.toMatchObject({
      code: 'not-found',
      message: 'Conteúdo da mídia não encontrado.',
    });
  });

  it('rejects an incomplete binary response', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(Uint8Array.from([1, 2]), {
        status: 200,
        headers: {
          'Content-Length': '5',
          'Content-Type': 'image/jpeg',
        },
      }),
    );
    const gateway = new LumeApiWhatsAppMediaContentGateway(
      'https://tenant.example/api/v1',
      'access-token',
      fetcher,
    );

    await expect(gateway.download(conversationId, messageId)).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });
});
