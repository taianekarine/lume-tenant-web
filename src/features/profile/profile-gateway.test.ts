import { TenantApiAdministrationGateway } from '@/features/tenant-administration/infrastructure';

describe('profile picture Tenant API boundary', () => {
  it('translates request entity too large into an actionable picture error', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: false,
      status: 413,
    } as Response);
    const gateway = new TenantApiAdministrationGateway(
      'http://localhost:3333/api/v1',
      'access-token',
      fetcher,
    );

    await expect(gateway.updateProfilePicture('data:image/png;base64,AQID')).rejects.toMatchObject({
      code: 'validation',
      message:
        'A imagem excedeu o limite aceito pelo servidor. Selecione um arquivo de até 512 KB.',
      publicCode: 'HTTP_413',
    });
  });
});
