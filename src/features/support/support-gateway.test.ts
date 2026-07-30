/** @jest-environment node */

import { SupportGatewayError, TenantApiSupportGateway } from './support-gateway';

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('TenantApiSupportGateway', () => {
  it('sends only the support content and authenticates against the Tenant API', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      response(
        {
          id: 'request-001',
          status: 'sent',
          recipient: 'suporte@example.test',
          providerMessageId: 'provider-001',
        },
        201,
      ),
    );
    const gateway = new TenantApiSupportGateway(
      'http://localhost:3333/api/v1/',
      'access-token',
      fetcher,
    );

    await expect(
      gateway.submit({
        subject: 'Falha no painel',
        message: 'Não consigo concluir uma operação.',
      }),
    ).resolves.toEqual({ id: 'request-001' });
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/support/requests',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        body: JSON.stringify({
          subject: 'Falha no painel',
          message: 'Não consigo concluir uma operação.',
        }),
      }),
    );
  });

  it('propagates mail fallback authorization returned by the API for provider failures', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      response(
        {
          code: 'SUPPORT_EMAIL_DELIVERY_FAILED',
          message: 'Falha no provedor.',
          details: { requestId: 'request-001', fallbackAllowed: true },
        },
        503,
      ),
    );
    const gateway = new TenantApiSupportGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
    );

    await expect(
      gateway.submit({
        subject: 'Falha no painel',
        message: 'Não consigo concluir uma operação.',
      }),
    ).rejects.toMatchObject<Partial<SupportGatewayError>>({
      code: 'service-unavailable',
      fallbackAllowed: true,
      message: 'Falha no provedor.',
    });
  });

  it('allows mail fallback when the Tenant API cannot be reached', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new TypeError('fetch failed'));
    const gateway = new TenantApiSupportGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
    );

    await expect(
      gateway.submit({
        subject: 'Falha no painel',
        message: 'Não consigo concluir uma operação.',
      }),
    ).rejects.toMatchObject<Partial<SupportGatewayError>>({
      code: 'service-unavailable',
      fallbackAllowed: true,
    });
  });

  it('never enables mail fallback for authentication or validation errors', async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        response(
          {
            message: 'Sessão inválida.',
            details: { fallbackAllowed: true },
          },
          401,
        ),
      )
      .mockResolvedValueOnce(
        response(
          {
            message: 'Conteúdo inválido.',
            details: { fallbackAllowed: true },
          },
          422,
        ),
      );
    const gateway = new TenantApiSupportGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
    );
    const input = {
      subject: 'Falha no painel',
      message: 'Não consigo concluir uma operação.',
    };

    await expect(gateway.submit(input)).rejects.toMatchObject<Partial<SupportGatewayError>>({
      code: 'unauthorized',
      fallbackAllowed: false,
    });
    await expect(gateway.submit(input)).rejects.toMatchObject<Partial<SupportGatewayError>>({
      code: 'validation',
      fallbackAllowed: false,
    });
  });
});
