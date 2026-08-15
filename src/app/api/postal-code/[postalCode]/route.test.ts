/** @jest-environment node */

import { PostalCodeLookupError } from '@/shared/address/domain/postal-code-address';
import { findAddressByPostalCode } from '@/shared/address/infrastructure/viacep-postal-code-gateway';

import { GET } from './route';

jest.mock('@/shared/address/infrastructure/viacep-postal-code-gateway', () => ({
  findAddressByPostalCode: jest.fn(),
}));

const mockedFindAddress = jest.mocked(findAddressByPostalCode);

describe('GET /api/postal-code/:postalCode', () => {
  beforeEach(() => mockedFindAddress.mockReset());

  it('returns the shared address with cache headers', async () => {
    mockedFindAddress.mockResolvedValue({
      postalCode: '01001-000',
      street: 'Praça da Sé',
      complement: 'lado ímpar',
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      ibgeCode: '3550308',
    });

    const response = await GET(new Request('http://localhost/api/postal-code/01001000'), {
      params: Promise.resolve({ postalCode: '01001000' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=86400');
    await expect(response.json()).resolves.toMatchObject({ street: 'Praça da Sé', state: 'SP' });
  });

  it.each([
    ['invalid', 400],
    ['not-found', 404],
    ['unavailable', 502],
  ] as const)('maps the %s lookup failure to HTTP %s', async (reason, status) => {
    mockedFindAddress.mockRejectedValue(new PostalCodeLookupError(reason, 'Falha controlada.'));

    const response = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ postalCode: '01001000' }),
    });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ reason, message: 'Falha controlada.' });
  });
});
