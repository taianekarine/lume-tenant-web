import { TenantApiRoutingGateway } from './tenant-api-routing-gateway';

const company = {
  id: '11111111-1111-4111-8111-111111111111',
  taxId: '12345678000195',
  legalName: 'Cliente Exemplo S.A.',
  tradeName: 'Cliente Exemplo',
  costCenter: null,
  status: 'suspended',
  version: 2,
};

describe('TenantApiRoutingGateway', () => {
  it('reads served companies with the authenticated tenant token', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [company], total: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const gateway = new TenantApiRoutingGateway('http://tenant-api.local', 'access-token', fetcher);

    await expect(gateway.listCompanies({ status: 'suspended' })).resolves.toEqual({
      items: [company],
      total: 1,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://tenant-api.local/routing/companies?status=suspended',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });

  it('downloads the My Maps CSV without changing its approved content', async () => {
    const fetcher = jest.fn().mockResolvedValue(
      new Response('Nome da rota,Empresa\r\nRota 01,Cliente Exemplo', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="google-my-maps.csv"',
        },
      }),
    );
    const gateway = new TenantApiRoutingGateway('http://tenant-api.local', 'access-token', fetcher);

    const file = await gateway.downloadRoute('22222222-2222-4222-8222-222222222222', 'my-maps.csv');

    expect(file.fileName).toBe('google-my-maps.csv');
    expect(new TextDecoder().decode(file.content)).not.toContain('Centro de custo');
    expect(fetcher).toHaveBeenCalledWith(
      'http://tenant-api.local/routing/routes/22222222-2222-4222-8222-222222222222/my-maps.csv',
      expect.any(Object),
    );
  });
});
