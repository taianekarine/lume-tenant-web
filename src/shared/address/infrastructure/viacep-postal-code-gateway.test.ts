/** @jest-environment node */

import { PostalCodeLookupError } from '../domain/postal-code-address';
import { findAddressByPostalCode } from './viacep-postal-code-gateway';

const successfulResponse = {
  cep: '01001-000',
  logradouro: 'Praça da Sé',
  complemento: 'lado ímpar',
  bairro: 'Sé',
  localidade: 'São Paulo',
  uf: 'SP',
  ibge: '3550308',
};

describe('ViaCEP postal code gateway', () => {
  it('queries the normalized CEP and maps the shared address contract', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockResolvedValue(
      new Response(JSON.stringify(successfulResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(findAddressByPostalCode('01001-000', fetcher)).resolves.toEqual({
      postalCode: '01001-000',
      street: 'Praça da Sé',
      complement: 'lado ímpar',
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      ibgeCode: '3550308',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01001000/json/',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('distinguishes an unknown CEP from an unavailable service', async () => {
    const notFoundFetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(JSON.stringify({ erro: true }), { status: 200 }));

    await expect(findAddressByPostalCode('99999-999', notFoundFetcher)).rejects.toMatchObject({
      reason: 'not-found',
    } satisfies Partial<PostalCodeLookupError>);
  });

  it('rejects an invalid CEP without calling ViaCEP', async () => {
    const fetcher = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

    await expect(findAddressByPostalCode('01001', fetcher)).rejects.toMatchObject({
      reason: 'invalid',
    } satisfies Partial<PostalCodeLookupError>);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
